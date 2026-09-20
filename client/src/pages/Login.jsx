import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Network, Mail, Lock, ArrowRight, UserCheck, AlertCircle, GraduationCap, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Login = () => {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedRole, setSelectedRole] = useState('student'); // 'student' | 'instructor'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState(location.state?.message || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email / student ID and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await login(email, password, selectedRole);
      const userRole = res?.user?.role || selectedRole;
      if (userRole === 'instructor') {
        navigate('/instructor/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials or role mismatch. Please verify.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    setError('');
    try {
      await loginAsGuest();
      navigate('/student/dashboard');
    } catch (err) {
      setError('Guest login failed. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  const autofillDemo = (role) => {
    setSelectedRole(role);
    setError('');
    if (role === 'student') {
      setEmail('student@college.edu');
      setPassword('student123');
    } else {
      setEmail('instructor@college.edu');
      setPassword('faculty123');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '440px',
            padding: '2.25rem',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: selectedRole === 'instructor' ? 'var(--primary)' : '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
                boxShadow: '0 0 15px var(--primary-glow)',
                transition: 'background-color 0.2s ease'
              }}
            >
              {selectedRole === 'instructor' ? <GraduationCap size={24} /> : <Network size={24} />}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Welcome to NetCollaborate</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Real-World Multi-User Networking & FSK Simulation Laboratory
            </p>
          </div>

          {/* Section 1: Explicit Role Selection Segment */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              Select your role:
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '4px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
              }}
            >
              <button
                type="button"
                onClick={() => { setSelectedRole('student'); setError(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: selectedRole === 'student' ? '1px solid #0284c7' : 'none',
                  backgroundColor: selectedRole === 'student' ? '#0284c7' : 'transparent',
                  color: selectedRole === 'student' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: selectedRole === 'student' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <User size={15} />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedRole('instructor'); setError(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: selectedRole === 'instructor' ? '1px solid #8b5cf6' : 'none',
                  backgroundColor: selectedRole === 'instructor' ? '#8b5cf6' : 'transparent',
                  color: selectedRole === 'instructor' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: selectedRole === 'instructor' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <GraduationCap size={16} />
                <span>Instructor</span>
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Email / Student ID</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder={selectedRole === 'instructor' ? 'faculty@college.edu' : 'student@college.edu or Roll No'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '32px' }}
                  required
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '32px' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.7rem',
                marginTop: '0.5rem',
                background: selectedRole === 'instructor'
                  ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)'
                  : 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)'
              }}
              disabled={loading}
            >
              <span>{loading ? 'Authenticating...' : `Login as ${selectedRole === 'instructor' ? 'Instructor' : 'Student'}`}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Autofill Helpers */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '1rem',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px dashed var(--border-color)',
              fontSize: '0.74rem'
            }}
          >
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>Test:</span>
            <button
              type="button"
              onClick={() => autofillDemo('student')}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline'
              }}
            >
              Student (Siya)
            </button>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <button
              type="button"
              onClick={() => autofillDemo('instructor')}
              style={{
                background: 'none',
                border: 'none',
                color: '#a78bfa',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline'
              }}
            >
              Instructor (Prof. Sharma)
            </button>
          </div>

          <div style={{ position: 'relative', margin: '1.25rem 0', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: '50% 0 auto 0', borderTop: '1px solid var(--border-color)' }} />
            <span style={{ position: 'relative', backgroundColor: 'var(--bg-secondary)', padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              OR
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.65rem' }}
            onClick={handleGuest}
            disabled={guestLoading}
          >
            <UserCheck size={16} color="var(--primary)" />
            <span>{guestLoading ? 'Starting Student Guest Session...' : 'Continue as Student Guest'}</span>
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Need an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Register Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
