import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Network, User, Mail, Lock, ArrowRight, AlertCircle, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Register = () => {
  const { register, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, username, email, password, confirmPassword } = formData;

    if (!name || !username || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register({ name, username, email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      await loginAsGuest();
      navigate('/dashboard');
    } catch (err) {
      setError('Guest login failed.');
    } finally {
      setGuestLoading(false);
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
            maxWidth: '460px',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                boxShadow: '0 0 15px var(--primary-glow)'
              }}
            >
              <Network size={24} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Create Your Account</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Join the real-time virtual network simulator
            </p>
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
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  name="name"
                  className="input-field"
                  placeholder="Siya Sharma"
                  value={formData.name}
                  onChange={handleChange}
                  style={{ paddingLeft: '32px' }}
                  required
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  name="username"
                  className="input-field"
                  placeholder="siyasharma"
                  value={formData.username}
                  onChange={handleChange}
                  style={{ paddingLeft: '32px' }}
                  required
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  name="email"
                  className="input-field"
                  placeholder="siya@college.edu"
                  value={formData.email}
                  onChange={handleChange}
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
                  name="password"
                  className="input-field"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  style={{ paddingLeft: '32px' }}
                  required
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  name="confirmPassword"
                  className="input-field"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  style={{ paddingLeft: '32px' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.65rem', marginTop: '0.5rem' }}
              disabled={loading}
            >
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

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
            <span>Continue as Guest</span>
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
