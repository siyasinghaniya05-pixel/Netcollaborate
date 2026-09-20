import React, { useState } from 'react';
import {
  QrCode,
  KeyRound,
  User,
  Hash,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { labAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

export default function JoinLabModal({ onClose, onJoined }) {
  const { user } = useAuth();

  const [sessionCode, setSessionCode] = useState('NC-FSK-7A42');
  const [studentName, setStudentName] = useState(user?.name || user?.username || '');
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || 'CS2026-');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [showQrScan, setShowQrScan] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!sessionCode.trim() || !studentName.trim()) {
      setError('Please provide a session code and your name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await labAPI.joinLab({
        code: sessionCode.trim(),
        studentName: studentName.trim(),
        rollNumber: rollNumber.trim()
      });

      if (res.data?.success) {
        const { session, student } = res.data.data;
        setSuccessData(res.data.data);

        // Notify Socket.IO room
        const socket = getSocket();
        socket.emit('join-lab', {
          sessionCode: session.sessionCode,
          student
        });

        if (onJoined) {
          onJoined(session, student);
        }

        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(res.data?.message || 'Failed to join session');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to join lab session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <GraduationCap size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                Join Lab Session
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Connect directly to your college laboratory session
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleJoin} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#ef4444',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successData && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#10b981',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={18} />
              <span>Connected to <strong>{successData.session.title}</strong>! Redirecting...</span>
            </div>
          )}

          {/* Session Code Input */}
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Session Code or Join Code
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="e.g. NC-FSK-7A42"
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  textTransform: 'uppercase'
                }}
              />
            </div>
          </div>

          {/* Student Name */}
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Siya Singhaniya"
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem'
                }}
              />
            </div>
          </div>

          {/* Roll Number */}
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              College Roll / Register Number
            </label>
            <div style={{ position: 'relative' }}>
              <Hash size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. CS2026-081"
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontSize: '0.88rem'
                }}
              />
            </div>
          </div>

          {/* QR Code Quick Scan Simulator Toggle */}
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '8px',
            padding: '10px 14px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <QrCode size={18} color="#38bdf8" />
              <span>Or scan faculty QR code</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowQrScan(!showQrScan);
                setSessionCode('NC-FSK-7A42');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              {showQrScan ? 'Hide QR' : 'Simulate Scan'}
            </button>
          </div>

          {showQrScan && (
            <div style={{
              backgroundColor: '#ffffff',
              padding: '16px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px'
            }}>
              {/* SVG QR Code Pattern */}
              <svg viewBox="0 0 120 120" style={{ width: '110px', height: '110px' }}>
                <rect x="0" y="0" width="120" height="120" fill="#ffffff" />
                {/* Corner Top-Left */}
                <rect x="10" y="10" width="30" height="30" fill="#0f172a" />
                <rect x="16" y="16" width="18" height="18" fill="#ffffff" />
                <rect x="20" y="20" width="10" height="10" fill="#0f172a" />
                {/* Corner Top-Right */}
                <rect x="80" y="10" width="30" height="30" fill="#0f172a" />
                <rect x="86" y="16" width="18" height="18" fill="#ffffff" />
                <rect x="90" y="20" width="10" height="10" fill="#0f172a" />
                {/* Corner Bottom-Left */}
                <rect x="10" y="80" width="30" height="30" fill="#0f172a" />
                <rect x="16" y="86" width="18" height="18" fill="#ffffff" />
                <rect x="20" y="90" width="10" height="10" fill="#0f172a" />
                {/* Random Data Pattern */}
                <rect x="50" y="15" width="8" height="8" fill="#0f172a" />
                <rect x="62" y="22" width="8" height="8" fill="#0f172a" />
                <rect x="50" y="50" width="20" height="20" fill="#0284c7" />
                <rect x="20" y="55" width="12" height="12" fill="#0f172a" />
                <rect x="80" y="55" width="15" height="8" fill="#0f172a" />
                <rect x="55" y="85" width="10" height="15" fill="#0f172a" />
                <rect x="85" y="85" width="15" height="15" fill="#0f172a" />
              </svg>
              <span style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600 }}>
                NC-FSK-7A42 • Scan to Join
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 16px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '6px'
            }}
          >
            {loading ? 'Joining Lab...' : 'Enter Lab Session'}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
