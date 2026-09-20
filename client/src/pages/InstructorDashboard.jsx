import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  FileText,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sliders,
  Send,
  Sparkles,
  ArrowLeft,
  X,
  Radio,
  QrCode,
  KeyRound,
  Eye,
  Play,
  Pause,
  StopCircle,
  Plus,
  LayoutDashboard,
  BookOpen,
  Activity,
  BarChart2,
  User,
  LogOut,
  ShieldCheck,
  RefreshCw,
  Edit3
} from 'lucide-react';
import Navbar from '../components/Navbar';
import LabReportModal from '../components/LabReportModal';
import ExperimentLibraryModal from '../components/ExperimentLibraryModal';
import NetAssist from '../components/NetAssist';
import { networkAPI, labAPI, experimentAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

export default function InstructorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Sidebar navigation state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'create-session' | 'students' | 'monitoring' | 'evaluation' | 'reports' | 'analytics'

  // Modals state
  const [showQrCode, setShowQrCode] = useState(false);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [showAssistantModal, setShowAssistantModal] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [inspectStudent, setInspectStudent] = useState(null);
  const [assistanceMode, setAssistanceMode] = useState(false);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Submissions and reports data
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Lab Session Management State
  const [activeSession, setActiveSession] = useState({
    sessionCode: '',
    joinCode: '',
    title: 'Digital Communication Lab',
    subject: 'Computer Networks',
    room: 'Networking Lab 2',
    instructorName: user?.name || 'Instructor',
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    experimentName: 'FSK Modulation and Demodulation',
    experimentType: 'FSK',
    selectedExperiments: ['FSK'],
    status: 'active',
    durationMinutes: 120,
    maxStudents: 50,
    description: 'Perform FSK modulation, transmission, demodulation and BER analysis.',
    instructions: '1. Build the network.\n2. Enter binary data.\n3. Configure FSK frequencies.\n4. Add channel noise.\n5. Perform demodulation.\n6. Calculate BER.\n7. Submit the experiment.',
    startTimeDate: new Date(),
    students: []
  });

  // Create Lab Session Form State
  const [sessionForm, setSessionForm] = useState({
    title: 'Digital Communication Lab',
    subject: 'Computer Networks',
    room: 'Networking Lab 2',
    instructorName: 'Dr. Santosh Patil',
    date: '20 September 2026',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    maxStudents: 50,
    selectedExperiments: ['FSK'],
    description: 'Perform FSK modulation, transmission, demodulation and BER analysis.',
    instructions: '1. Build the network.\n2. Enter binary data.\n3. Configure FSK frequencies.\n4. Add channel noise.\n5. Perform demodulation.\n6. Calculate BER.\n7. Submit the experiment.',
    status: 'active'
  });

  // Grading form state
  const [gradeScore, setGradeScore] = useState(90);
  const [gradeStatus, setGradeStatus] = useState('Completed');
  const [gradeFeedback, setGradeFeedback] = useState('Good performance. Correlation filters accurately extracted bits.');
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // Load Instructor Data
  const loadInstructorData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active session
      try {
        const labRes = await labAPI.getActiveLab();
        if (labRes.data?.success && labRes.data.data) {
          setActiveSession(labRes.data.data);
        }
      } catch (e) {}

      // 2. Fetch submissions
      try {
        const subRes = await experimentAPI.getResults();
        if (subRes.data?.success && Array.isArray(subRes.data.data)) {
          setSubmissions(subRes.data.data);
        } else {
          setSubmissions([]);
        }
      } catch (e) {
        setSubmissions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstructorData();

    // Listen for real-time student updates via Socket.IO
    const socket = getSocket();

    // Join instructor monitoring room for active session
    socket.emit('join-lab', {
      sessionCode: activeSession.sessionCode,
      role: 'instructor'
    });

    socket.on('student-joined', ({ student }) => {
      if (student) {
        setActiveSession(prev => ({
          ...prev,
          students: [student, ...prev.students.filter(s => (s.rollNumber !== student.rollNumber && s.studentId !== student.studentId))]
        }));
      }
    });

    socket.on('student-left', ({ student }) => {
      if (student) {
        setActiveSession(prev => ({
          ...prev,
          students: prev.students.map(s =>
            (s.rollNumber === student.rollNumber || s.studentId === student.studentId)
              ? { ...s, status: 'Disconnected' }
              : s
          )
        }));
      }
    });

    socket.on('student-count-updated', ({ count }) => {
      // Synchronize student count
    });

    socket.on('student-progress-broadcast', (progressData) => {
      if (progressData) {
        setActiveSession(prev => {
          const updated = prev.students.map(s =>
            s.rollNumber === progressData.rollNumber || s.name === progressData.name
              ? { ...s, ...progressData }
              : s
          );
          return { ...prev, students: updated };
        });
      }
    });

    socket.on('submission-alert', ({ submission }) => {
      if (submission) {
        setSubmissions(prev => [submission, ...prev.filter(s => s.id !== submission.id)]);
      }
    });

    return () => {
      socket.off('student-joined');
      socket.off('student-left');
      socket.off('student-count-updated');
      socket.off('student-progress-broadcast');
      socket.off('submission-alert');
    };
  }, [activeSession.sessionCode]);

  // Handle Create Session
  const handleCreateSessionSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: sessionForm.title || 'Digital Communication Lab',
        subject: sessionForm.subject || 'Computer Networks',
        room: sessionForm.room || 'Networking Lab 2',
        instructorName: sessionForm.instructorName || user?.name || 'Dr. Santosh Patil',
        date: sessionForm.date || '20 September 2026',
        startTime: sessionForm.startTime || '10:00 AM',
        endTime: sessionForm.endTime || '12:00 PM',
        selectedExperiments: sessionForm.selectedExperiments.length > 0 ? sessionForm.selectedExperiments : ['FSK'],
        maxStudents: parseInt(sessionForm.maxStudents) || 50,
        description: sessionForm.description,
        instructions: sessionForm.instructions,
        status: sessionForm.status || 'active'
      };

      const res = await labAPI.createLab(payload);
      if (res.data?.success) {
        setActiveSession(res.data.data);
        setShowCreateSessionModal(false);
        setActiveTab('dashboard');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create lab session');
    }
  };

  // Handle Grade Evaluation Save
  const handleSaveGrade = async () => {
    if (!activeSubmission) return;
    setIsSavingGrade(true);
    try {
      await experimentAPI.evaluateSubmission(activeSubmission.id, {
        score: gradeScore,
        status: gradeStatus,
        feedback: gradeFeedback
      });

      setSubmissions(prev =>
        prev.map(s => (s.id === activeSubmission.id ? { ...s, score: gradeScore, status: gradeStatus, feedback: gradeFeedback } : s))
      );
      setShowGradingModal(false);
    } catch (err) {
      alert('Failed to save grade');
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Filter students
  const filteredStudents = (activeSession.students || []).filter(s => {
    const matchesSearch =
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status?.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalStudents = activeSession.students?.length || 0;
  const onlineStudents = activeSession.students?.filter(s => s.status === 'Online' || s.status === 'Running').length || 0;
  const completedStudents = activeSession.students?.filter(s => s.status === 'Completed').length || 0;
  const inProgressStudents = activeSession.students?.filter(s => s.status === 'Running').length || 0;
  const pendingEvaluations = submissions.filter(s => s.status === 'Submitted').length;
  const avgClassScore = submissions.length > 0
    ? Math.round(submissions.reduce((a, b) => a + (b.score || 0), 0) / submissions.length)
    : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Section 8: Instructor Sidebar */}
        <aside
          style={{
            width: '240px',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.25rem 0.75rem',
            flexShrink: 0
          }}
        >
          <div style={{ padding: '0 0.5rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#8b5cf6',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}
              >
                <GraduationCap size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Faculty Portal
                </div>
                <div style={{ fontSize: '0.72rem', color: '#8b5cf6', fontWeight: 600 }}>
                  {user?.name || 'Faculty Instructor'}
                </div>
              </div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeTab === 'dashboard' ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === 'dashboard' ? '#8b5cf6' : 'var(--text-secondary)',
                fontWeight: activeTab === 'dashboard' ? 700 : 500,
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setShowCreateSessionModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Plus size={16} color="#10b981" />
              <span>Create Lab Session</span>
            </button>

            <button
              onClick={() => setActiveTab('students')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeTab === 'students' ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === 'students' ? '#8b5cf6' : 'var(--text-secondary)',
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Users size={16} color="#3b82f6" />
              <span>Active Students ({totalStudents})</span>
            </button>

            <button
              onClick={() => {
                if (activeSession.students?.length > 0) {
                  setInspectStudent(activeSession.students[0]);
                } else {
                  alert('No active student to monitor yet.');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Eye size={16} color="#06b6d4" />
              <span>Live Monitoring</span>
            </button>

            <button
              onClick={() => setActiveTab('evaluation')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeTab === 'evaluation' ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === 'evaluation' ? '#8b5cf6' : 'var(--text-secondary)',
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Award size={16} color="#f59e0b" />
              <span>Evaluation ({pendingEvaluations})</span>
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <FileText size={16} />
              <span>Lab Reports</span>
            </button>

            <button
              onClick={() => setShowExpModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <BookOpen size={16} color="#38bdf8" />
              <span>Experiment Library</span>
            </button>

            <button
              onClick={() => setShowAssistantModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Sparkles size={16} color="#ec4899" />
              <span>AI Lab Assistant</span>
            </button>

            <button
              onClick={() => navigate('/profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <User size={16} />
              <span>Profile</span>
            </button>
          </nav>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--danger)',
                fontSize: '0.84rem',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left'
              }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.75rem' }}>
          {/* Welcome Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Welcome, {user?.name || 'Prof. Sharma'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
                Department of Electronics & Computer Communication Engineering
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowCreateSessionModal(true)}
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' }}
              >
                <Plus size={15} />
                <span>Create Lab Session</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowQrCode(true)}
              >
                <QrCode size={15} />
                <span>Session QR Code</span>
              </button>
            </div>
          </div>

          {/* Section 8 Summary Stats Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '1rem',
              marginBottom: '1.75rem'
            }}
          >
            <div className="card" style={{ padding: '1.1rem' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                ACTIVE SESSIONS
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '6px', color: '#8b5cf6' }}>
                1
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {activeSession.sessionCode}
              </div>
            </div>

            <div className="card" style={{ padding: '1.1rem' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                TOTAL STUDENTS
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '6px', color: 'var(--text-primary)' }}>
                {totalStudents} / {activeSession.maxStudents || 50}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Capacity limit enforced
              </div>
            </div>

            <div className="card" style={{ padding: '1.1rem' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                ONLINE STUDENTS
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '6px', color: 'var(--success)' }}>
                {onlineStudents}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Active socket links
              </div>
            </div>

            <div className="card" style={{ padding: '1.1rem' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                COMPLETED
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '6px', color: '#06b6d4' }}>
                {completedStudents}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Experiments finalized
              </div>
            </div>

            <div className="card" style={{ padding: '1.1rem' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                PENDING EVALUATIONS
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '6px', color: '#f59e0b' }}>
                {pendingEvaluations}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Requires marks review
              </div>
            </div>

            <div className="card" style={{ padding: '1.1rem' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                AVG CLASS SCORE
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '6px', color: 'var(--primary)' }}>
                {avgClassScore}%
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Across all submissions
              </div>
            </div>
          </div>

          {/* Section 11: Active Lab Sessions */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              marginBottom: '1.75rem',
              borderLeft: '4px solid #8b5cf6',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(2, 132, 199, 0.04) 100%)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: '300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="badge" style={{ backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 800 }}>ACTIVE LAB SESSIONS</span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Status: <strong style={{ color: 'var(--success)' }}>● Active</strong></span>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
                  {activeSession.title || 'Digital Communication Lab'}
                </h3>
                <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Session Code: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#8b5cf6', fontSize: '1rem' }}>{activeSession.sessionCode || 'NC-FSK-7A42'}</span>
                </div>

                {/* Metadata details matching Section 11 specifications */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.84rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Instructor: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{activeSession.instructorName || 'Dr. Santosh Patil'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Subject: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{activeSession.subject || 'Computer Networks'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Date: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{activeSession.date || '20 September 2026'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Time: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{activeSession.startTime || '10:00 AM'} – {activeSession.endTime || '12:00 PM'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Room: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{activeSession.room || 'Networking Lab 2'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Experiments: </span>
                    <strong style={{ color: '#38bdf8' }}>
                      {(activeSession.selectedExperiments || ['FSK']).join(', ')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Real-time Session Student Counters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <div
                  style={{
                    display: 'flex',
                    gap: '1.25rem',
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.82rem'
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>STUDENTS</div>
                    <div style={{ fontWeight: 800, color: '#8b5cf6', fontSize: '1.2rem' }}>
                      {totalStudents} / {activeSession.maxStudents || 50}
                    </div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.25rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>ONLINE</div>
                    <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1.2rem' }}>
                      {onlineStudents}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowQrCode(true)}
                  >
                    <QrCode size={14} />
                    <span>View QR Code</span>
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setActiveTab('students')}
                    style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' }}
                  >
                    <Users size={14} />
                    <span>Monitor Students ({totalStudents})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 10: Student Monitoring Table */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="#3b82f6" />
                  <span>Real-Time Student Monitoring</span>
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Live synchronized student telemetry via Socket.IO room (Max {activeSession.maxStudents || 50} seats)
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search student or roll..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field"
                    style={{ width: '180px', padding: '5px 10px 5px 28px', fontSize: '0.78rem' }}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                  style={{ padding: '5px 8px', fontSize: '0.78rem', width: '120px' }}
                >
                  <option value="ALL">All Status</option>
                  <option value="ONLINE">Online</option>
                  <option value="RUNNING">Running</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DISCONNECTED">Disconnected</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px' }}>Student</th>
                    <th style={{ padding: '10px 12px' }}>Roll Number</th>
                    <th style={{ padding: '10px 12px' }}>Experiment</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>Live BER</th>
                    <th style={{ padding: '10px 12px' }}>Score</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No students currently match this filter. Share session code <b>{activeSession.sessionCode}</b> with your class.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => (
                      <tr key={s.studentId || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                backgroundColor: '#3b82f6',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              {(s.name || 'S').charAt(0)}
                            </div>
                            <span>{s.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          {s.rollNumber || 'N/A'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className="badge badge-primary">{s.currentExperiment || 'FSK'}</span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                s.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' :
                                s.status === 'Running' ? 'rgba(2, 132, 199, 0.15)' :
                                s.status === 'Submitted' ? 'rgba(245, 158, 11, 0.15)' :
                                s.status === 'Disconnected' ? 'rgba(239, 68, 68, 0.15)' :
                                'rgba(139, 92, 246, 0.15)',
                              color:
                                s.status === 'Completed' ? '#10b981' :
                                s.status === 'Running' ? '#0284c7' :
                                s.status === 'Submitted' ? '#f59e0b' :
                                s.status === 'Disconnected' ? '#ef4444' :
                                '#8b5cf6',
                              fontWeight: 600
                            }}
                          >
                            {s.status || 'Online'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                          {typeof s.ber === 'number' ? `${s.ber}%` : '0%'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                          {s.score > 0 ? `${s.score}/100` : '-'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setInspectStudent(s)}
                              title="Inspect student workspace in read-only mode"
                              style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                            >
                              <Eye size={13} />
                              <span>Inspect</span>
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setActiveSubmission({
                                  id: s.studentId || 'sub-' + idx,
                                  studentName: s.name,
                                  rollNumber: s.rollNumber,
                                  experimentTitle: s.currentExperiment || 'FSK Modulation',
                                  score: s.score || 85,
                                  status: s.status || 'Submitted',
                                  ber: s.ber || 0
                                });
                                setGradeScore(s.score || 85);
                                setGradeStatus(s.status === 'Completed' ? 'Completed' : 'Submitted');
                                setShowGradingModal(true);
                              }}
                              title="Evaluate and grade student experiment"
                              style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                            >
                              <Award size={13} />
                              <span>Evaluate</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Section 9: Create Lab Session Modal */}
      {showCreateSessionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color="#8b5cf6" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create New Lab Session</h3>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowCreateSessionModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSessionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Lab Name / Title</label>
                  <input
                    type="text"
                    className="input-field"
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Digital Communication Lab"
                    required
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Subject</label>
                  <input
                    type="text"
                    className="input-field"
                    value={sessionForm.subject}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g. Computer Networks"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Instructor Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={sessionForm.instructorName}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, instructorName: e.target.value }))}
                    required
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Laboratory Room</label>
                  <input
                    type="text"
                    className="input-field"
                    value={sessionForm.room}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, room: e.target.value }))}
                    placeholder="e.g. Networking Lab 2"
                    required
                  />
                </div>
              </div>

              {/* Experiment Selection Multi-Checklist */}
              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Available Experiments for this Session
                </label>
                <div
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    fontSize: '0.82rem'
                  }}
                >
                  {[
                    { key: 'FSK', label: 'FSK Modulation & Demodulation' },
                    { key: 'ASK', label: 'Amplitude Shift Keying (ASK)' },
                    { key: 'PSK', label: 'Phase Shift Keying (BPSK)' },
                    { key: 'Network', label: 'Star Topology Network' }
                  ].map((item) => {
                    const checked = sessionForm.selectedExperiments.includes(item.key);
                    return (
                      <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...sessionForm.selectedExperiments, item.key]
                              : sessionForm.selectedExperiments.filter(k => k !== item.key);
                            setSessionForm(prev => ({ ...prev, selectedExperiments: next.length > 0 ? next : ['FSK'] }));
                          }}
                        />
                        <span style={{ fontWeight: checked ? 700 : 500, color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '0.65rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Date</label>
                  <input
                    type="text"
                    className="input-field"
                    value={sessionForm.date}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, date: e.target.value }))}
                    placeholder="20 September 2026"
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Start Time</label>
                  <input
                    type="text"
                    className="input-field"
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, startTime: e.target.value }))}
                    placeholder="10:00 AM"
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">End Time</label>
                  <input
                    type="text"
                    className="input-field"
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, endTime: e.target.value }))}
                    placeholder="12:00 PM"
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Max Students</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="input-field"
                    value={sessionForm.maxStudents}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, maxStudents: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Lab Description</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={sessionForm.description}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Lab Instructions (Numbered Steps)</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={sessionForm.instructions}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, instructions: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateSessionModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' }}
                >
                  Generate Session Code & Start Lab
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Quick Join Modal */}
      {showQrCode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '380px',
              padding: '2rem',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Student Join QR Code</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowQrCode(false)}>
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                width: '200px',
                height: '200px',
                margin: '0 auto 1.25rem',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `${window.location.origin}/login?code=${activeSession.sessionCode}`
                )}`}
                alt="Session Join QR Code"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#8b5cf6' }}>
              {activeSession.sessionCode}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Students can scan this QR code with mobile or enter session code on desktop to join instantly.
            </p>
          </div>
        </div>
      )}

      {/* Section 11: Live Read-Only Workspace Inspector */}
      {inspectStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '720px',
              padding: '1.75rem',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#10b981" />
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {assistanceMode ? 'ASSISTANCE / DEBUG MODE ACTIVE' : 'READ-ONLY LIVE MONITORING'}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
                  Monitoring: {inspectStudent.name} ({inspectStudent.rollNumber})
                </h3>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setInspectStudent(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Assistance Mode Toggle */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                fontSize: '0.82rem'
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>Inspection Security Guard:</span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>
                  {assistanceMode
                    ? 'Faculty debug override permitted.'
                    : 'Changes blocked. Read-only observation protects student work.'}
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setAssistanceMode(!assistanceMode)}
                style={{ fontSize: '0.74rem' }}
              >
                {assistanceMode ? 'Disable Assist Mode' : 'Enable Assist Mode'}
              </button>
            </div>

            {/* Parameters & Live Telemetry Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>FSK TRANSMITTER PARAMETERS</div>
                <div style={{ marginTop: '6px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Space Frequency (f0): <b>1000 Hz</b></div>
                  <div>Mark Frequency (f1): <b>2000 Hz</b></div>
                  <div>Bit Duration (Tb): <b>1.0 ms</b></div>
                  <div>Carrier Sampling: <b>50 kHz</b></div>
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>CHANNEL & CORRELATOR TELEMETRY</div>
                <div style={{ marginTop: '6px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Channel Noise Level: <b>10% Gaussian AWGN</b></div>
                  <div>Signal-to-Noise Ratio: <b>18.2 dB</b></div>
                  <div>Current Bit Error Rate: <b style={{ color: '#38bdf8' }}>{inspectStudent.ber || 1.2}%</b></div>
                  <div>Packet Transmission: <b style={{ color: 'var(--success)' }}>Delivered</b></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setInspectStudent(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 12 & 13: Evaluation & Marks Review Modal */}
      {showGradingModal && activeSubmission && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '680px',
              padding: '1.75rem',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="#f59e0b" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  Submission Evaluation: {activeSubmission.studentName}
                </h3>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowGradingModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Section 13 Automatic Preliminary Score Breakdown */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Objective 100-Mark Academic Criteria Breakdown:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                  <span>Network Configuration</span>
                  <b>20 / 20</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                  <span>FSK Implementation</span>
                  <b>25 / 25</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                  <span>Demodulation</span>
                  <b>15 / 15</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                  <span>BER Analysis</span>
                  <b>15 / 15</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                  <span>Experiment Completion</span>
                  <b>15 / 15</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                  <span>Report</span>
                  <b>10 / 10</b>
                </div>
              </div>
            </div>

            {/* Final Marks & Feedback Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Assigned Marks (Max 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input-field"
                    value={gradeScore}
                    onChange={(e) => setGradeScore(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Submission Status</label>
                  <select
                    className="input-field"
                    value={gradeStatus}
                    onChange={(e) => setGradeStatus(e.target.value)}
                  >
                    <option value="Completed">Approve (Completed)</option>
                    <option value="Needs Revision">Request Resubmission</option>
                  </select>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Instructor Feedback & Observations</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowGradingModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveGrade}
                  disabled={isSavingGrade}
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' }}
                >
                  {isSavingGrade ? 'Saving Grade...' : 'Finalize Grade & Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lab Report Modal */}
      {showReportModal && (
        <LabReportModal
          onClose={() => setShowReportModal(false)}
          networkTopology={{ nodes: [], edges: [] }}
          fskData={{
            f0: 1000,
            f1: 2000,
            bitDuration: 0.001,
            noisePercent: 10,
            berPercent: 1.2,
            snrDb: 18.2,
            carsonBandwidthHz: 3000,
            shannonCapacityBps: 18120
          }}
        />
      )}

      {/* Experiment Library Modal */}
      {showExpModal && (
        <ExperimentLibraryModal onClose={() => setShowExpModal(false)} />
      )}

      {/* AI Assistant Drawer */}
      {showAssistantModal && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 100,
            boxShadow: 'var(--shadow-xl)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <NetAssist onClose={() => setShowAssistantModal(false)} />
        </div>
      )}
    </div>
  );
}
