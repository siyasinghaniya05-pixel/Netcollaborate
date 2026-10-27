import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseAnonKey.includes('placeholder') &&
    !supabaseAnonKey.includes('your-') &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseUrl.includes('your-project') &&
    !supabaseUrl.includes('netcollaborate.supabase.co') &&
    !supabaseUrl.includes('cmwgmfllosztvmgjvuyh.supabase.co') &&
    supabaseUrl.startsWith('https://')
  );
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

/**
 * Supabase Data & Realtime Services for NetCollaborate
 */

// --- PROFILES ---
export const profileService = {
  async getProfile(userId) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      console.warn('[Supabase Profile] Fetch error:', error.message);
      return null;
    }
    return data;
  },

  async updateProfile(userId, updates) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// --- LAB SESSIONS ---
export const labSessionService = {
  async getActiveSession() {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('lab_sessions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('[Supabase LabSession] getActive error:', error.message);
      return null;
    }
    return data;
  },

  async getSessionByCode(sessionCode) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('lab_sessions')
      .select('*, students:lab_students(*)')
      .eq('session_code', sessionCode.toUpperCase().trim())
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createSession(sessionData) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('lab_sessions')
      .insert([sessionData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async joinSession(sessionCode, student) {
    if (!isSupabaseConfigured()) return null;
    const cleanCode = sessionCode.toUpperCase().trim();

    // Check capacity first
    const { data: session, error: sessErr } = await supabase
      .from('lab_sessions')
      .select('id, max_students')
      .eq('session_code', cleanCode)
      .single();
    if (sessErr) throw new Error('Lab session not found');

    const { count } = await supabase
      .from('lab_students')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id);

    if (count >= (session.max_students || 50)) {
      throw new Error(`Session has reached its maximum capacity of ${session.max_students || 50} students.`);
    }

    const { data, error } = await supabase
      .from('lab_students')
      .upsert([
        {
          session_id: session.id,
          session_code: cleanCode,
          student_id: student.id,
          student_name: student.name,
          roll_number: student.rollNumber || '',
          status: 'Online',
          current_experiment: 'FSK',
          progress: 10,
          last_active: new Date().toISOString()
        }
      ], { onConflict: 'session_id,student_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSessionStudents(sessionCode) {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('lab_students')
      .select('*')
      .eq('session_code', sessionCode.toUpperCase().trim())
      .order('joined_at', { ascending: true });
    if (error) return [];
    return data || [];
  },

  // Realtime subscription for live bench monitoring
  subscribeToStudents(sessionCode, onUpdate) {
    if (!isSupabaseConfigured()) return () => {};

    const cleanCode = sessionCode.toUpperCase().trim();
    const channel = supabase
      .channel(`lab_bench_${cleanCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_students',
          filter: `session_code=eq.${cleanCode}`
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};

// --- NETWORKS ---
export const networkService = {
  async getNetworks(userId) {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('networks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  },

  async getNetworkById(id) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('networks')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return null;
    return data;
  },

  async saveNetwork(network) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('networks')
      .upsert([network])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteNetwork(id) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('networks').delete().eq('id', id);
    if (error) throw error;
  }
};

// --- EXPERIMENT SUBMISSIONS ---
export const submissionService = {
  async getStudentSubmissions(userId) {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('experiment_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });
    if (error) return [];
    return data || [];
  },

  async getAllSubmissions() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('experiment_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (error) return [];
    return data || [];
  },

  async createSubmission(subData) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('experiment_submissions')
      .insert([subData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async evaluateSubmission(id, gradeData) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('experiment_submissions')
      .update({
        score: gradeData.score,
        status: gradeData.status || 'Graded',
        instructor_feedback: gradeData.instructorFeedback || gradeData.feedback || '',
        evaluation_breakdown: gradeData.breakdown || [],
        evaluated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// --- STORAGE ---
export const storageService = {
  async uploadReport(filePath, fileBlob) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase.storage
      .from('reports')
      .upload(filePath, fileBlob, { upsert: true });
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage
      .from('reports')
      .getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  }
};

export default supabase;
