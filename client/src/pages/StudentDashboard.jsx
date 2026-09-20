import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Network,
  LayoutDashboard,
  Radio,
  BookOpen,
  KeyRound,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  LogOut,
  User,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  ChevronRight,
  Send,
  Download,
  Eye,
  Plus,
  Compass,
  Award
} from 'lucide-react';
import Navbar from '../components/Navbar';
import JoinLabModal from '../components/JoinLabModal';
import ExperimentLibraryModal from '../components/ExperimentLibraryModal';
import LabReportModal from '../components/LabReportModal';
import NetAssist from '../components/NetAssist';
import CreateNetworkModal from '../components/CreateNetworkModal';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { labAPI, experimentAPI, networkAPI } from '../services/api';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const { loadNetwork } = useNetwork();
  const navigate = useNavigate();
  const location = useLocation();

  // Sidebar navigation selection
  const [activeNav, setActiveNav] = useState('dashboard');

  // Modals state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCreateNetModal, setShowCreateNetModal] = useState(false);
  const [showAssistantModal, setShowAssistantModal] = useState(false);

  // Student data state
  const [activeSession, setActiveSession] = useState(null);
  const [sessionCodeInput, setSessionCodeInput] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [experiments, setExperiments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Embedded AI question state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswers, setAiAnswers] = useState([
    {
      q: 'What is FSK modulation?',
      a: 'Frequency Shift Keying (FSK) represents digital binary symbols 0 and 1 by switching between two distinct sinusoidal carrier frequencies f0 (space) and f1 (mark).'
    }
  ]);

  // Load student dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active session
      try {
        const labRes = await labAPI.getActiveLab();
        if (labRes.data?.success && labRes.data.data) {
          setActiveSession(labRes.data.data);
        }
      } catch (e) {}

      // 2. Fetch standard experiments
      try {
        const expRes = await experimentAPI.getExperiments();
        if (expRes.data?.success) {
          setExperiments(expRes.data.data);
        }
      } catch (e) {}

      // 3. Fetch student's submissions
      const studentId = user?.id || user?.userId;
      if (studentId) {
        try {
          const subRes = await experimentAPI.getStudentSubmissions(studentId);
          if (subRes.data?.success) {
            setSubmissions(subRes.data.data);
          }
        } catch (e) {}
      }

      // 4. Fetch networks
      try {
        const netRes = await networkAPI.getNetworks();
        if (netRes.data?.success) {
          setNetworks(netRes.data.data);
        }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Handle Quick Join Session from dashboard input
  const handleQuickJoin = async (e) => {
    e.preventDefault();
    if (!sessionCodeInput.trim()) return;

    try {
      setJoinMsg('Joining session...');
      const res = await labAPI.joinLab({
        code: sessionCodeInput.trim(),
        studentName: user?.name || 'Student Engineer',
        rollNumber: user?.rollNumber || ''
      });

      if (res.data?.success) {
        setJoinMsg('Joined successfully!');
        setActiveSession(res.data.data.session);
        setTimeout(() => setJoinMsg(''), 3000);
      }
    } catch (err) {
      setJoinMsg(err.response?.data?.message || 'Failed to join session');
    }
  };

  // Ask AI Assistant Question
  const handleAskAI = (presetQ) => {
    const questionToAsk = presetQ || aiQuestion;
    if (!questionToAsk.trim()) return;

    let reply = 'In digital communication networks, signal integrity and proper routing table convergence are essential.';
    const qLower = questionToAsk.toLowerCase();

    if (qLower.includes('ber') || qLower.includes('error')) {
      reply = 'A high Bit Error Rate (BER) occurs when channel noise power sigma^2 exceeds the correlation energy gap between frequencies f0 and f1. Try lowering channel noise or increasing signal amplitude!';
    } else if (qLower.includes('fail') || qLower.includes('packet')) {
      reply = 'Packets fail due to missing default gateways, misconfigured subnet masks, or missing router next-hop IP routes. Verify your ARP table and IP routing.';
    } else if (qLower.includes('fsk') || qLower.includes('modulation')) {
      reply = 'BFSK (Binary Frequency Shift Keying) modulates digital 0 to f0 (e.g. 1000 Hz) and 1 to f1 (e.g. 2000 Hz). Coherent matched-filter correlators detect which frequency contains higher energy.';
    } else if (qLower.includes('router') || qLower.includes('configure')) {
      reply = 'To configure a router, assign static IP addresses to its FastEthernet interfaces and specify default gateway routing so packets across different subnets can traverse.';
    } else if (qLower.includes('communicate') || qLower.includes('pc1')) {
      reply = 'Ensure PC1 and PC2 either share the same subnet and switch, or have an intermediate router configured with their respective subnets and correct default gateways.';
    }

    setAiAnswers(prev => [{ q: questionToAsk, a: reply }, ...prev]);
    setAiQuestion('');
  };

  // Metrics calculation
  const completedCount = submissions.filter(s => s.status === 'Completed' || s.score > 0).length;
  const avgScore = submissions.length > 0
    ? Math.round(submissions.reduce((a, b) => a + (b.score || 0), 0) / submissions.length)
    : 85;
  const latestBer = submissions.length > 0 && typeof submissions[0].ber === 'number'
    ? submissions[0].ber
    : 2.3;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {location.state?.accessDenied && (
        <div
          style={{
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '8px 16px',
            fontSize: '0.85rem',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            borderBottom: '1px solid var(--danger)'
          }}
        >
          <AlertCircle size={16} />
          <span>{location.state.message || 'Access Denied: Instructor portal is restricted to faculty members.'}</span>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Section 6: Student Sidebar */}
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
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}
              >
                <User size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Student Portal
                </div>
                <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>
                  {user?.rollNumber || 'Student Portal'}
                </div>
              </div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <button
              onClick={() => setActiveNav('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeNav === 'dashboard' ? 'var(--bg-tertiary)' : 'transparent',
                color: activeNav === 'dashboard' ? '#0284c7' : 'var(--text-secondary)',
                fontWeight: activeNav === 'dashboard' ? 700 : 500,
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setShowJoinModal(true)}
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
              <KeyRound size={16} color="#06b6d4" />
              <span>Join Lab</span>
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
              <BookOpen size={16} color="#10b981" />
              <span>My Experiments</span>
            </button>

            <button
              onClick={() => navigate('/workspace')}
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
              <Network size={16} color="#3b82f6" />
              <span>Network Simulator</span>
            </button>


            <button
              onClick={() => setActiveNav('history')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: activeNav === 'history' ? 'var(--bg-tertiary)' : 'transparent',
                color: activeNav === 'history' ? '#0284c7' : 'var(--text-secondary)',
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Clock size={16} />
              <span>Experiment History</span>
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
              <FileText size={16} color="#f59e0b" />
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
              <Compass size={16} color="#8b5cf6" />
              <span>Learning Mode</span>
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
              <span>AI Network Assistant</span>
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
                Welcome, {user?.name || 'Student Engineer'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
                Digital Communication & Computer Networking College Laboratory
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowJoinModal(true)}
                style={{ background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)' }}
              >
                <KeyRound size={15} />
                <span>Join Lab Session</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/workspace')}
              >
                <Network size={15} />
                <span>Open Simulator</span>
              </button>
            </div>
          </div>

          {/* Section 6 Key Metrics Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.75rem'
            }}
          >
            {/* Active Session Status */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600 }}>
                <span>ACTIVE SESSION</span>
                <span className="status-dot up" />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '8px', color: '#0284c7' }}>
                {activeSession ? (activeSession.sessionCode || activeSession.session_code) : 'None'}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {activeSession ? `${activeSession.instructorName || activeSession.instructor_name} (${activeSession.subject || 'Networking'})` : 'No active laboratory session'}
              </div>
            </div>

            {/* Completed Experiments */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600 }}>
                <span>COMPLETED LABS</span>
                <CheckCircle2 size={16} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '8px', color: 'var(--text-primary)' }}>
                {completedCount} / 9
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Curriculum progress: {Math.round((completedCount / 9) * 100)}%
              </div>
            </div>

            {/* Average Score */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600 }}>
                <span>AVERAGE SCORE</span>
                <Award size={16} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '8px', color: '#f59e0b' }}>
                {avgScore} / 100
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {avgScore > 0 ? `Academic evaluation: ${avgScore >= 90 ? 'Grade A' : avgScore >= 80 ? 'Grade B' : 'Grade C'}` : 'No graded submissions yet'}
              </div>
            </div>

            {/* Latest FSK BER */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600 }}>
                <span>LATEST FSK BER</span>
                <Radio size={16} color="#38bdf8" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '8px', color: '#38bdf8' }}>
                {latestBer}%
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Demodulator bit error rate
              </div>
            </div>
          </div>

          {/* Section 12: Student Active Lab Card */}
          {activeSession ? (
            <div
              className="card"
              style={{
                padding: '1.5rem',
                marginBottom: '1.75rem',
                borderLeft: '4px solid #0284c7',
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.06) 0%, rgba(6, 182, 212, 0.04) 100%)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: '#0284c7',
                        backgroundColor: 'rgba(2, 132, 199, 0.12)',
                        padding: '3px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      ACTIVE LAB
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Code: <strong style={{ color: 'var(--text-primary)' }}>{activeSession.sessionCode || 'NC-FSK-7A42'}</strong>
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                    {activeSession.title || 'Digital Communication Lab'}
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Instructor</div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {activeSession.instructorName || 'Dr. Santosh Patil'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Today</div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {activeSession.startTime || '10:00 AM'} – {activeSession.endTime || '12:00 PM'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Room</div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {activeSession.room || 'Networking Lab 2'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status</div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                        <span>Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <button
                    onClick={() => navigate(`/lab/${activeSession.sessionCode || 'NC-FSK-7A42'}`)}
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                      padding: '10px 22px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                    }}
                  >
                    <span>Open Lab</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}
                  >
                    Switch / Enter Another Code
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="card"
              style={{
                padding: '1.5rem',
                marginBottom: '1.75rem',
                borderLeft: '4px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  No active lab session.
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Enter your instructor-provided session code to view assigned digital communication and networking experiments.
                </p>
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowJoinModal(true)}
                style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <KeyRound size={15} />
                <span>Join Lab</span>
              </button>
            </div>
          )}

          {/* Dual Grid: Experiments & AI Assistant */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
            {/* Upcoming & Available Experiments */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={16} color="#06b6d4" />
                  <span>Standard Lab Curriculum (9 Experiments)</span>
                </h3>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowExpModal(true)}
                  style={{ fontSize: '0.75rem' }}
                >
                  View All (9)
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {experiments.slice(0, 4).map((exp, idx) => (
                  <div
                    key={exp.id || idx}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{exp.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {exp.category} • {exp.id}
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (exp.id.includes('FSK') || exp.id.includes('BER') || exp.id.includes('NOISE')) {
                          navigate('/fsk-lab');
                        } else {
                          navigate('/workspace');
                        }
                      }}
                      style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                    >
                      Start
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Network & Communication Assistant */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#ec4899" />
                  <span>AI Laboratory Assistant</span>
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="e.g. Why did my packet fail? Why is BER high?"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                  className="input-field"
                  style={{ flex: 1, padding: '6px 10px', fontSize: '0.78rem' }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleAskAI()}
                  style={{ padding: '6px 10px' }}
                >
                  <Send size={14} />
                </button>
              </div>

              {/* Preset quick question pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '0.75rem' }}>
                <button
                  onClick={() => handleAskAI('Why is my BER high?')}
                  style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  Why is BER high?
                </button>
                <button
                  onClick={() => handleAskAI('Why did my packet fail?')}
                  style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  Why packet failed?
                </button>
                <button
                  onClick={() => handleAskAI('How to configure router?')}
                  style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  Configure router
                </button>
              </div>

              {/* Answers list */}
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {aiAnswers.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderLeft: '3px solid #ec4899',
                      fontSize: '0.76rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#ec4899', marginBottom: '2px' }}>Q: {item.q}</div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: '1.3' }}>{item.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 6: Recent Submissions & Lab Reports */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#f59e0b" />
                <span>Recent Submissions & Lab Reports</span>
              </h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowReportModal(true)}
              >
                <Download size={14} />
                <span>Generate New Report</span>
              </button>
            </div>

            {submissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.85rem' }}>No submitted experiments yet.</p>
                <p style={{ fontSize: '0.76rem', marginTop: '4px' }}>
                  Run an FSK simulation or network transmission test and click "Submit Experiment" to receive an automatic 100-mark evaluation!
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/fsk-lab')}
                  style={{ marginTop: '1rem' }}
                >
                  Go to FSK Lab
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 12px' }}>Experiment</th>
                      <th style={{ padding: '8px 12px' }}>Session</th>
                      <th style={{ padding: '8px 12px' }}>BER</th>
                      <th style={{ padding: '8px 12px' }}>Score</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Submitted</th>
                      <th style={{ padding: '8px 12px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub, idx) => (
                      <tr key={sub.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{sub.experimentTitle || 'BFSK Modulation'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{sub.sessionCode || 'NC-7F42K'}</td>
                        <td style={{ padding: '10px 12px' }}>{typeof sub.ber === 'number' ? `${sub.ber}%` : '0%'}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: sub.score >= 80 ? 'var(--success)' : '#f59e0b' }}>
                          {sub.score || 88} / 100
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className="badge badge-success">{sub.status || 'Completed'}</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Today'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setShowReportModal(true)}
                            title="View Official Report"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Embedded Modals */}
      {showJoinModal && (
        <JoinLabModal
          onClose={() => setShowJoinModal(false)}
          onJoined={(session, student) => {
            setActiveSession(session);
            setShowJoinModal(false);
          }}
        />
      )}

      {showExpModal && (
        <ExperimentLibraryModal onClose={() => setShowExpModal(false)} />
      )}

      {showReportModal && (
        <LabReportModal
          onClose={() => setShowReportModal(false)}
          networkTopology={{ nodes: [], edges: [] }}
          fskData={{
            f0: 1000,
            f1: 2000,
            bitDuration: 0.001,
            noisePercent: 10,
            berPercent: latestBer,
            snrDb: 18.2,
            carsonBandwidthHz: 3000,
            shannonCapacityBps: 18120
          }}
        />
      )}

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
};

export default StudentDashboard;
