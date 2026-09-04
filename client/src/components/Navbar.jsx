import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Network,
  Sun,
  Moon,
  Users,
  Copy,
  Check,
  BookOpen,
  Award,
  LogOut,
  LayoutDashboard,
  User as UserIcon,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';

const Navbar = ({ onOpenQuiz, onOpenLearn }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme, network, activeUsers } = useNetwork();
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  const handleCopyRoom = () => {
    if (network?.roomId) {
      navigator.clipboard.writeText(network.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isWorkspace = location.pathname.startsWith('/workspace');

  return (
    <nav
      style={{
        height: '56px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        zIndex: 30,
        position: 'relative'
      }}
    >
      {/* Left: Brand & Room Tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 12px var(--primary-glow)'
            }}
          >
            <Network size={18} />
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Net<span style={{ color: 'var(--primary)' }}>Collaborate</span>
          </span>
        </Link>

        {isWorkspace && network?.roomId && (
          <div
            onClick={handleCopyRoom}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              fontSize: '0.72rem',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            title="Click to copy room code"
          >
            <span className="status-dot up" />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {network.roomId}
            </span>
            {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
          </div>
        )}
      </div>

      {/* Center Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {isAuthenticated && (
          <Link
            to="/dashboard"
            className="btn btn-ghost btn-sm"
            style={{
              color: location.pathname === '/dashboard' ? 'var(--primary)' : 'var(--text-secondary)'
            }}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </Link>
        )}

        <Link
          to="/workspace/demo"
          className="btn btn-ghost btn-sm"
          style={{
            color: isWorkspace ? 'var(--primary)' : 'var(--text-secondary)'
          }}
        >
          <Network size={15} />
          <span>Workspace</span>
        </Link>

        {onOpenLearn && (
          <button className="btn btn-ghost btn-sm" onClick={onOpenLearn}>
            <BookOpen size={15} />
            <span>Learn</span>
          </button>
        )}

        {onOpenQuiz && (
          <button className="btn btn-ghost btn-sm" onClick={onOpenQuiz}>
            <Award size={15} />
            <span>Quiz Challenge</span>
          </button>
        )}
      </div>

      {/* Right Controls: Theme Toggle & User Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Theme Toggle */}
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Link
              to="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: user?.avatarColor || 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {user?.name || user?.username}
              </span>
            </Link>

            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link to="/login" className="btn btn-secondary btn-sm">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
