-- ==============================================================================
-- NetCollaborate Supabase Database Schema & Realtime Setup
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. PROFILES TABLE (Linked directly to Supabase Auth auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('student', 'instructor')) DEFAULT 'student',
  roll_number TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  xp INTEGER DEFAULT 120,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ==============================================================================
-- 3. LAB SESSIONS TABLE (Instructor-managed Laboratory Sessions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lab_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code TEXT NOT NULL UNIQUE,
  join_code TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT DEFAULT 'Computer Networks',
  room TEXT DEFAULT 'Networking Lab 2',
  instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  instructor_name TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 120,
  description TEXT DEFAULT 'Perform FSK modulation, transmission, demodulation and BER analysis.',
  instructions TEXT DEFAULT '1. Build the network.\n2. Enter binary data.\n3. Configure FSK frequencies.\n4. Add channel noise.\n5. Perform demodulation.\n6. Calculate BER.\n7. Submit the experiment.',
  max_students INTEGER DEFAULT 50 CHECK (max_students > 0 AND max_students <= 100),
  status TEXT NOT NULL CHECK (status IN ('active', 'scheduled', 'completed', 'closed', 'cancelled')) DEFAULT 'active',
  selected_experiments TEXT[] DEFAULT ARRAY['FSK']::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_sessions_code ON public.lab_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_status ON public.lab_sessions(status);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_instructor ON public.lab_sessions(instructor_id);

-- ==============================================================================
-- 4. LAB STUDENTS TABLE (Real-Time Live 50-Seat Student Bench Tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lab_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.lab_sessions(id) ON DELETE CASCADE,
  session_code TEXT NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  roll_number TEXT DEFAULT '',
  status TEXT DEFAULT 'Online' CHECK (status IN ('Online', 'Idle', 'Running', 'Submitted', 'Completed', 'Disconnected', 'Joined', 'Error')),
  current_experiment TEXT DEFAULT 'FSK',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  ber NUMERIC DEFAULT 0,
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_session UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_students_session ON public.lab_students(session_id);
CREATE INDEX IF NOT EXISTS idx_lab_students_code ON public.lab_students(session_code);
CREATE INDEX IF NOT EXISTS idx_lab_students_student ON public.lab_students(student_id);

-- ==============================================================================
-- 5. NETWORKS TABLE (Saved Network Topologies)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.networks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  topology_type TEXT DEFAULT 'custom',
  nodes JSONB DEFAULT '[]'::JSONB,
  edges JSONB DEFAULT '[]'::JSONB,
  subnets JSONB DEFAULT '[]'::JSONB,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_networks_user ON public.networks(user_id);
CREATE INDEX IF NOT EXISTS idx_networks_public ON public.networks(is_public);

-- ==============================================================================
-- 6. EXPERIMENT SUBMISSIONS TABLE (100-Mark Evaluated Submissions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.experiment_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  experiment_title TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  roll_number TEXT DEFAULT '',
  session_id UUID REFERENCES public.lab_sessions(id) ON DELETE SET NULL,
  session_code TEXT DEFAULT '',
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  status TEXT DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Completed', 'In Progress', 'Graded')),
  ber NUMERIC DEFAULT 0,
  letter_grade TEXT DEFAULT '',
  evaluation_breakdown JSONB DEFAULT '[]'::JSONB,
  instructor_feedback TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON public.experiment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_session ON public.experiment_submissions(session_id);

-- ==============================================================================
-- 7. LAB REPORTS TABLE (Reports with storage path references)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lab_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.lab_sessions(id) ON DELETE SET NULL,
  network_id UUID REFERENCES public.networks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}'::JSONB,
  storage_path TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_reports_user ON public.lab_reports(user_id);

-- ==============================================================================
-- 8. AUTOMATIC PROFILE CREATION TRIGGER ON auth.users
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
BEGIN
  -- Default to 'student' unless specifically validated
  assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  IF assigned_role NOT IN ('student', 'instructor') THEN
    assigned_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, roll_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'roll_number', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated can read profiles; only owner can update
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Lab Sessions: Readable by all authenticated users; created and updated by instructors
CREATE POLICY "Lab sessions viewable by authenticated users"
  ON public.lab_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Instructors can create lab sessions"
  ON public.lab_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'instructor')
  );

CREATE POLICY "Instructors can update their lab sessions"
  ON public.lab_sessions FOR UPDATE
  TO authenticated
  USING (
    instructor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'instructor')
  );

-- Lab Students: Readable by all; students can join/update their own status; instructors can manage
CREATE POLICY "Lab students viewable by authenticated users"
  ON public.lab_students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can join sessions"
  ON public.lab_students FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their session progress"
  ON public.lab_students FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'instructor'));

-- Networks: User can CRUD their own networks; public networks viewable by all
CREATE POLICY "User can view own and public networks"
  ON public.networks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "User can insert own networks"
  ON public.networks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can update own networks"
  ON public.networks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "User can delete own networks"
  ON public.networks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Submissions: Student can view own; Instructor can view all and grade them
CREATE POLICY "Submissions viewable by owner or instructor"
  ON public.experiment_submissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'instructor')
  );

CREATE POLICY "Student can create submissions"
  ON public.experiment_submissions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Instructors can update/grade submissions"
  ON public.experiment_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'instructor')
  );

-- Reports: User can view and create own reports
CREATE POLICY "Reports viewable by owner or instructor"
  ON public.lab_reports FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'instructor')
  );

CREATE POLICY "User can create reports"
  ON public.lab_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- 10. REALTIME PUBLICATION SUBSCRIPTIONS
-- ==============================================================================
-- Enable Realtime events for live 50-seat bench sync & network collaboration
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_sessions;
  EXCEPTION WHEN duplicate_object THEN
    -- already added
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_students;
  EXCEPTION WHEN duplicate_object THEN
    -- already added
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.networks;
  EXCEPTION WHEN duplicate_object THEN
    -- already added
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.experiment_submissions;
  EXCEPTION WHEN duplicate_object THEN
    -- already added
  END;
END $$;

-- ==============================================================================
-- 11. SUPABASE STORAGE SETUP (Reports Bucket)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload reports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reports');

CREATE POLICY "Public can read reports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'reports');
