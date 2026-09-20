import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Award, Activity, Network, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [name, setName] = useState(user?.name || '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || '#3b82f6');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    userAPI.getProfile()
      .then(res => {
        if (res.data?.success) {
          setProfileData(res.data);
          setName(res.data.user.name);
          setAvatarColor(res.data.user.avatarColor || '#3b82f6');
        }
      })
      .catch(err => console.warn('Could not load profile:', err.message));
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userAPI.updateProfile({ name, avatarColor });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '800px', margin: '0 auto', width: '100%', padding: '2.5rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          User Profile & Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Manage your account preferences and collaboration identity.
        </p>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created Networks</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>
              {profileData?.stats?.networksCount || 1}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configured Devices</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>
              {profileData?.stats?.totalDevices || 7}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average Network Health</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
              {profileData?.stats?.averageHealth || 100}%
            </div>
          </div>
        </div>

        {/* Edit Profile Card */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Avatar Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: avatarColor,
                  color: '#ffffff',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                {(name || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Collaboration Avatar Color</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {COLORS.map(c => (
                    <div
                      key={c}
                      onClick={() => setAvatarColor(c)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: avatarColor === c ? '2px solid #ffffff' : 'none'
                      }}
                    >
                      {avatarColor === c && <Check size={14} color="#ffffff" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Full Name</label>
              <input
                type="text"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Username</label>
              <input
                type="text"
                className="input-field"
                value={user?.username || 'engineer'}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Email</label>
              <input
                type="email"
                className="input-field"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>
                {saved && '✓ Settings saved successfully'}
              </span>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Profile;
