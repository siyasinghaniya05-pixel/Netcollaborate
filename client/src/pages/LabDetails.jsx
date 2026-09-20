import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Radio,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Info,
  Layers,
  Activity,
  User
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { labAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

// All experiment catalog definitions with icons & descriptions
const EXPERIMENT_CATALOG = {
  FSK: {
    id: 'EXP-05-BFSK',
    title: 'FSK Modulation & Demodulation',
    category: 'Digital Communications',
    tag: 'BFSK DSP',
    color: '#38bdf8',
    gradient: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2) 0%, rgba(56, 189, 248, 0.1) 100%)',
    description: 'Orthogonal carrier frequency keying, AWGN channel simulation, coherent quadrature correlator demodulation, and BER waterfall curve analysis.',
    route: '/fsk-lab'
  },
  ASK: {
    id: 'EXP-06-ASK',
    title: 'Amplitude Shift Keying (ASK)',
    category: 'Digital Communications',
    tag: 'OOK / ASK',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(52, 211, 153, 0.1) 100%)',
    description: 'On-Off Keying (OOK) digital amplitude modulation, envelope detector demodulation, and threshold detection.',
    route: '/fsk-lab'
  },
  PSK: {
    id: 'EXP-07-BPSK',
    title: 'Phase Shift Keying (BPSK)',
    category: 'Digital Communications',
    tag: 'BPSK DSP',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(167, 139, 250, 0.1) 100%)',
    description: 'Binary phase reversal (0 vs 180 degrees), constellation diagrams, Costas loop carrier synchronization, and BER.',
    route: '/fsk-lab'
  },
  Network: {
    id: 'EXP-01-NET',
    title: 'Star Topology Network Configuration',
    category: 'Computer Networks',
    tag: 'Topology',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(96, 165, 250, 0.1) 100%)',
    description: 'Build virtual star topologies, configure static IP addressing, inspect ARP tables, and verify end-to-end ICMP ping.',
    route: '/workspace'
  }
};

export default function LabDetails() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveStudentCount, setLiveStudentCount] = useState(null);

  useEffect(() => {
    const fetchSessionDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const codeToFetch = sessionCode;
        if (!codeToFetch) {
          setError('Session code is required.');
          return;
        }
        const res = await labAPI.getLabById(codeToFetch);
        if (res.data?.success && res.data.data) {
          setSession(res.data.data);
          setLiveStudentCount(res.data.data.students?.length || 0);
        } else {
          setError('Laboratory session not found or has concluded.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load laboratory session. Please verify the session code.');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();

    // Connect to Socket.IO room for real-time student count updates
    const socket = getSocket();
    const cleanCode = (sessionCode || 'NC-FSK-7A42').toUpperCase();
    socket.emit('join-lab', {
      sessionCode: cleanCode,
      student: {
        studentId: user?.id || user?.userId,
        name: user?.name || user?.username,
        rollNumber: user?.rollNumber
      },
      role: user?.role || 'student'
    });

    const handleCountUpdate = ({ count }) => {
      if (typeof count === 'number') {
        setLiveStudentCount(count);
      }
    };

    socket.on('student-count-updated', handleCountUpdate);

    return () => {
      socket.off('student-count-updated', handleCountUpdate);
      socket.emit('leave-lab', {
        sessionCode: cleanCode,
        student: {
          studentId: user?.id || user?.userId,
          name: user?.name || user?.username
        }
      });
    };
  }, [sessionCode, user]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading laboratory session details...</div>
        </div>
      </div>
    );
  }

  // Parse instructor instructions into numbered steps
  const instructionLines = session?.instructions
    ? session.instructions.split('\n').filter(line => line.trim().length > 0)
    : [];

  // Filter available experiments strictly according to what the instructor selected
  const availableExperimentKeys = session?.selectedExperiments && session.selectedExperiments.length > 0
    ? session.selectedExperiments
    : ['FSK'];

  const studentCountDisplay = liveStudentCount !== null
    ? liveStudentCount
    : (session?.students?.length || 43);

  const maxCapacity = session?.maxStudents || 50;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate(user?.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard')}
            className="btn btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Logged in as:</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.name || user?.username} ({user?.rollNumber || 'Seat Assigned'})
            </span>
          </div>
        </div>

        {/* Section 6: Display Instructor's Lab Information */}
        <div
          className="card"
          style={{
            padding: '2rem',
            marginBottom: '1.75rem',
            borderTop: '4px solid #0284c7',
            backgroundColor: 'var(--bg-secondary)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
          }}
        >
          {/* Header Title & Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(2, 132, 199, 0.15)',
                    color: '#38bdf8'
                  }}
                >
                  {session?.sessionCode || 'NC-FSK-7A42'}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  {session?.status === 'active' ? '● Active Session' : session?.status}
                </span>
              </div>

              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                {session?.title || 'DIGITAL COMMUNICATION LAB'}
              </h1>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Subject: <strong style={{ color: 'var(--text-primary)' }}>{session?.subject || 'Computer Networks'}</strong>
              </div>
            </div>

            {/* Live Student Counter */}
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '12px 18px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                textAlign: 'right'
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Connected Students
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                {studentCountDisplay} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>/ {maxCapacity}</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>
                ● Real-Time Sync Active
              </div>
            </div>
          </div>

          {/* Instructor & Schedule Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={20} color="#8b5cf6" />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Instructor</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {session?.instructorName || 'Dr. Santosh Patil'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(2, 132, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={20} color="#0284c7" />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Laboratory Room</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {session?.room || 'Networking Lab 2'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Scheduled Date</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {session?.date || '20 September 2026'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color="#f59e0b" />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Lab Timings</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {session?.startTime || '10:00 AM'} – {session?.endTime || '12:00 PM'}
                </div>
              </div>
            </div>
          </div>

          {/* Lab Description */}
          <div style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.76rem', color: '#0284c7', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
              Lab Description
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
              {session?.description || 'Perform FSK modulation, transmission, demodulation and BER analysis.'}
            </p>
          </div>

          {/* Section 6: Lab Instructions */}
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} />
              <span>Lab Instructions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {instructionLines.map((inst, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '0.86rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '1px'
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span>{inst.replace(/^\d+\.\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 7: Show ONLY Relevant Experiments (Instructor Selected) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Available Experiments
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Experiments specifically assigned by {session?.instructorName || 'your instructor'} for this laboratory session
              </p>
            </div>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-secondary)',
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}
            >
              {availableExperimentKeys.length} Assigned Experiment{availableExperimentKeys.length > 1 ? 's' : ''}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: availableExperimentKeys.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {availableExperimentKeys.map((key) => {
              const exp = EXPERIMENT_CATALOG[key] || {
                id: `EXP-${key}`,
                title: `${key} Experiment`,
                category: 'Digital Communications',
                tag: key,
                color: '#38bdf8',
                description: `Assigned laboratory experiment for ${key}.`,
                route: '/fsk-lab'
              };

              return (
                <div
                  key={key}
                  className="card"
                  style={{
                    padding: '1.75rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Decorative glow corner */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '120px',
                      height: '120px',
                      background: `radial-gradient(circle at top right, ${exp.color}25, transparent 70%)`,
                      pointerEvents: 'none'
                    }}
                  />

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-tertiary)',
                          color: exp.color,
                          border: `1px solid ${exp.color}40`
                        }}
                      >
                        {exp.tag}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {exp.id}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                      {exp.title}
                    </h3>

                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                      {exp.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      <Activity size={14} color={exp.color} />
                      <span>Ready for Simulation</span>
                    </div>

                    <button
                      onClick={() => {
                        navigate(`${exp.route}?session=${session?.sessionCode || 'NC-FSK-7A42'}`, {
                          state: {
                            sessionCode: session?.sessionCode || 'NC-FSK-7A42',
                            sessionTitle: session?.title,
                            instructorName: session?.instructorName,
                            instructions: session?.instructions
                          }
                        });
                      }}
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 18px',
                        fontSize: '0.88rem',
                        fontWeight: 700
                      }}
                    >
                      <span>Launch {key}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
