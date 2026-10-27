import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, profileService } from '../services/supabase';
import { authAPI } from '../services/api';
import { disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth state
  useEffect(() => {
    let authSubscription = null;

    const initAuth = async () => {
      let resolved = false;

      // 1. Try Supabase session if configured
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await handleSupabaseSession(session);
            resolved = true;
          }

          // Listen for active Supabase auth changes
          const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              await handleSupabaseSession(session);
            } else if (event === 'SIGNED_OUT') {
              // Only clear if active session was Supabase
              const storedUser = localStorage.getItem('user');
              if (storedUser) {
                try {
                  const u = JSON.parse(storedUser);
                  if (u.isSupabase) {
                    clearSession();
                  }
                } catch {
                  clearSession();
                }
              }
            }
          });
          authSubscription = listener?.subscription;
        } catch (err) {
          console.warn('[Supabase Auth] Init failed:', err.message);
        }
      }

      // 2. Fallback to token verification via Express API
      if (!resolved) {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            setToken(storedToken);

            try {
              const res = await authAPI.getMe();
              if (res.data?.user) {
                setUser(res.data.user);
                localStorage.setItem('user', JSON.stringify(res.data.user));
              }
            } catch (err) {
              if (err.response?.status === 401) {
                console.warn('[Auth] Token expired:', err.message);
                clearSession();
              }
            }
          } catch (err) {
            console.warn('[Auth] Session parsing failed:', err.message);
            clearSession();
          }
        } else {
          clearSession();
        }
      }

      setLoading(false);
    };

    initAuth();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // Helper to resolve user profile and state from a Supabase session
  const handleSupabaseSession = async (session) => {
    try {
      const authUser = session.user;
      const accessToken = session.access_token;

      // 1. Authoritative lookup in profiles table
      const profile = await profileService.getProfile(authUser.id);

      const effectiveRole = profile?.role || authUser.user_metadata?.role || 'student';
      const effectiveName = profile?.full_name || authUser.user_metadata?.full_name || authUser.email.split('@')[0];
      const effectiveRoll = profile?.roll_number || authUser.user_metadata?.roll_number || '';

      const userObject = {
        id: authUser.id,
        userId: authUser.id,
        email: authUser.email,
        name: effectiveName,
        username: effectiveName.toLowerCase().replace(/\s+/g, '_'),
        role: effectiveRole,
        rollNumber: effectiveRoll,
        isGuest: false,
        isSupabase: true
      };

      setUser(userObject);
      setToken(accessToken);
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(userObject));
    } catch (err) {
      console.error('[Supabase Auth] Profile resolution error:', err);
    }
  };

  const clearSession = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
  };

  /**
   * Login using Supabase Auth (or API fallback)
   * Enforces role verification and seamlessly falls back to Express API / seeded accounts
   */
  const login = async (email, password, selectedRole = 'student') => {
    const cleanEmail = email.trim();

    // 1. If Supabase is configured, attempt Supabase auth first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (!error && data?.user && data?.session) {
          // Authoritative role retrieval from database
          const profile = await profileService.getProfile(data.user.id);
          const dbRole = profile?.role || data.user.user_metadata?.role || 'student';

          // Strict role verification: Reject if user selected Instructor but db role is student
          if (selectedRole === 'instructor' && dbRole !== 'instructor') {
            await supabase.auth.signOut();
            clearSession();
            throw new Error('Access Denied: Your account does not have Instructor authorization.');
          }

          const userPayload = {
            id: data.user.id,
            userId: data.user.id,
            email: data.user.email,
            name: profile?.full_name || data.user.user_metadata?.full_name || data.user.email.split('@')[0],
            username: (profile?.full_name || data.user.email.split('@')[0]).toLowerCase().replace(/\s+/g, '_'),
            role: dbRole,
            rollNumber: profile?.roll_number || data.user.user_metadata?.roll_number || '',
            isSupabase: true
          };

          setUser(userPayload);
          setToken(data.session.access_token);
          localStorage.setItem('token', data.session.access_token);
          localStorage.setItem('user', JSON.stringify(userPayload));

          return { success: true, user: userPayload, token: data.session.access_token };
        }
        if (error) {
          console.warn('[Supabase Auth] Sign-in not fulfilled, falling back to Express API:', error.message);
        }
      } catch (supErr) {
        if (supErr.message?.includes('Access Denied')) {
          throw supErr;
        }
        console.warn('[Supabase Auth] Sign-in not fulfilled, falling back to Express API:', supErr.message);
      }
    }

    // 2. Fallback: Express Backend API (handles seeded accounts & local database)
    try {
      const res = await authAPI.login({ email: cleanEmail, password, role: selectedRole });
      if (res.data?.success) {
        const userObj = res.data.user;

        if (selectedRole === 'instructor' && userObj.role !== 'instructor') {
          clearSession();
          throw new Error('Access Denied: Your account does not have Instructor authorization.');
        }

        setUser(userObj);
        setToken(res.data.token);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(userObj));
      }
      return res.data;
    } catch (apiErr) {
      if (apiErr.code === 'ERR_NETWORK' || !apiErr.response) {
        throw new Error('Cannot connect to backend server. Ensure backend is running on http://localhost:5000');
      }
      const errMsg = apiErr.response?.data?.message || apiErr.response?.data?.error || apiErr.message || 'Invalid credentials or role mismatch. Please verify.';
      throw new Error(errMsg);
    }
  };

  /**
   * Register using Supabase Auth (or API fallback)
   * Enforces instructor invite code verification before creating instructor accounts
   */
  const register = async (formData) => {
    const { name, email, password, role, rollNumber, inviteCode } = formData;
    const assignedRole = role === 'instructor' ? 'instructor' : 'student';

    // If attempting instructor registration, verify invite code securely on backend
    if (assignedRole === 'instructor') {
      try {
        const verifyRes = await authAPI.verifyInstructorCode({ inviteCode });
        if (!verifyRes.data?.success) {
          throw new Error(verifyRes.data?.message || 'Invalid instructor authorization code');
        }
      } catch (verifyErr) {
        throw new Error(
          verifyErr.response?.data?.message ||
          verifyErr.message ||
          'Invalid instructor authorization code. Contact your administrator.'
        );
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              role: assignedRole,
              roll_number: assignedRole === 'student' ? (rollNumber || '').trim() : ''
            }
          }
        });

        if (!error && data?.user) {
          // Upsert profile in public.profiles table
          try {
            await supabase.from('profiles').upsert([
              {
                id: data.user.id,
                full_name: name.trim(),
                email: email.trim(),
                role: assignedRole,
                roll_number: assignedRole === 'student' ? (rollNumber || '').trim() : ''
              }
            ]);
          } catch (profErr) {
            console.warn('[Supabase Profile] Creation note:', profErr.message);
          }

          if (data.session) {
            const userPayload = {
              id: data.user.id,
              userId: data.user.id,
              email: data.user.email,
              name: name.trim(),
              username: name.trim().toLowerCase().replace(/\s+/g, '_'),
              role: assignedRole,
              rollNumber: rollNumber || '',
              isSupabase: true
            };
            setUser(userPayload);
            setToken(data.session.access_token);
            localStorage.setItem('token', data.session.access_token);
            localStorage.setItem('user', JSON.stringify(userPayload));
            return { success: true, user: userPayload, token: data.session.access_token };
          }
        }
      } catch (supErr) {
        console.warn('[Supabase Register] Supabase signup bypassed, falling back to Express API:', supErr.message);
      }
    }

    // Fallback: Express API (creates user in backend database/memory and immediately logs them in)
    try {
      const res = await authAPI.register(formData);
      if (res.data?.success) {
        setUser(res.data.user);
        setToken(res.data.token);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
      return res.data;
    } catch (apiErr) {
      if (apiErr.code === 'ERR_NETWORK' || !apiErr.response) {
        throw new Error('Cannot connect to backend server. Ensure backend is running on http://localhost:5000');
      }
      const errMsg = apiErr.response?.data?.message || apiErr.message || 'Registration failed. Please try again.';
      throw new Error(errMsg);
    }
  };

  /**
   * Password Reset via Supabase Auth
   */
  const resetPassword = async (email) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      return data;
    }
    throw new Error('Password reset requires Supabase Auth connection.');
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('[Logout note]:', e.message);
    } finally {
      clearSession();
    }
  };

  const role = user?.role || 'student';
  const isStudent = role === 'student';
  const isInstructor = role === 'instructor';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isStudent,
        isInstructor,
        isAuthenticated: Boolean(user && token),
        loading,
        login,
        register,
        resetPassword,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
