import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  Plus,
  Users,
  Clock,
  Activity,
  Trash2,
  ExternalLink,
  Search,
  Share2,
  Lock,
  Globe,
  Link2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Navbar from '../components/Navbar';
import CreateNetworkModal from '../components/CreateNetworkModal';
import { networkAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { loadNetwork } = useNetwork();
  const navigate = useNavigate();

  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'mine' | 'shared'
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const fetchNetworks = async () => {
    setLoading(true);
    try {
      const res = await networkAPI.getNetworks();
      if (res.data?.success) {
        setNetworks(res.data.data);
      }
    } catch (err) {
      console.warn('Could not fetch networks:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworks();
  }, []);

  const handleOpenNetwork = (net) => {
    loadNetwork(net);
    navigate(`/workspace/${net.id || net._id || net.roomId}`);
  };

  const handleDeleteNetwork = async (e, netId) => {
    e.stopPropagation();
    if (netId === 'demo-enterprise-network') {
      alert('The Demo Network is protected and cannot be deleted.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this virtual network project?')) {
      try {
        await networkAPI.deleteNetwork(netId);
        setNetworks(prev => prev.filter(n => (n.id !== netId && n._id !== netId)));
      } catch (err) {
        alert('Failed to delete network project.');
      }
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinRoomCode.trim()) return;

    try {
      const res = await networkAPI.getNetworkById(joinRoomCode.trim().toUpperCase());
      if (res.data?.success) {
        loadNetwork(res.data.data);
        navigate(`/workspace/${res.data.data.id || res.data.data.roomId}`);
      }
    } catch (err) {
      setJoinError('Network room not found. Check the code and try again.');
    }
  };

  const userId = user?.id || user?._id;
  const filteredNetworks = networks.filter((n) => {
    const matchesSearch =
      n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.description && n.description.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeTab === 'mine') return n.owner === userId;
    if (activeTab === 'shared') return n.owner !== userId;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '2rem 1.5rem' }}>
        {/* Welcome Header & Actions */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '2rem'
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Welcome back, {user?.name || user?.username || 'Engineer'}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Design topologies, simulate packet journeys, and collaborate with your team.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowJoinModal(true)}>
              <Users size={16} />
              <span>Join with Code</span>
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />
              <span>Create New Network</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: activeTab === 'all' ? 'var(--primary-light)' : 'transparent',
                color: activeTab === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              All Projects ({networks.length})
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: activeTab === 'mine' ? 'var(--primary-light)' : 'transparent',
                color: activeTab === 'mine' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              My Networks
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: activeTab === 'shared' ? 'var(--primary-light)' : 'transparent',
                color: activeTab === 'shared' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Shared & Public
            </button>
          </div>

          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '32px', height: '34px', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        {/* Project Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            Loading network projects...
          </div>
        ) : filteredNetworks.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 1rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-color)'
            }}
          >
            <Network size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              No Networks Found
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Get started by creating your first virtual network topology or open the preconfigured demo.
            </p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />
              <span>Create New Network</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {filteredNetworks.map((net) => {
              const devCount = net.nodes ? net.nodes.length : (net.stats?.devicesCount || 0);
              const connCount = net.edges ? net.edges.length : (net.stats?.connectionsCount || 0);
              const health = net.healthScore ?? 100;
              const isDemo = net.id === 'demo-enterprise-network' || net._id === 'demo-enterprise-network';

              return (
                <div
                  key={net.id || net._id}
                  onClick={() => handleOpenNetwork(net)}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                >
                  <div>
                    {/* Header: Title & Badges */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: isDemo ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Network size={18} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {net.name}
                          </h3>
                          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                            {net.roomId}
                          </span>
                        </div>
                      </div>

                      {isDemo ? (
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                          <Sparkles size={11} /> Demo
                        </span>
                      ) : (
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                          {net.visibility === 'shared' ? 'Shared' : 'Private'}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.4,
                        marginBottom: '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {net.description || 'No description provided.'}
                    </p>

                    {/* Topology Metrics */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        padding: '0.5rem 0',
                        borderTop: '1px solid var(--border-color)',
                        borderBottom: '1px solid var(--border-color)',
                        marginBottom: '0.75rem'
                      }}
                    >
                      <span><strong>{devCount}</strong> Devices</span>
                      <span><strong>{connCount}</strong> Connections</span>
                      <span style={{ color: health >= 80 ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                        Health: {health}%
                      </span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      By {net.ownerName || 'Engineer'}
                    </span>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {!isDemo && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={(e) => handleDeleteNetwork(e, net.id || net._id)}
                          title="Delete Network"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <button className="btn btn-primary btn-sm">
                        <span>Open Network</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Network Modal */}
      {showCreateModal && (
        <CreateNetworkModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newNet) => {
            setShowCreateModal(false);
            setNetworks(prev => [newNet, ...prev]);
            handleOpenNetwork(newNet);
          }}
        />
      )}

      {/* Join Network Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Join Collaborative Network Room
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Enter the 6-character room code shared by your teammate.
            </p>

            {joinError && (
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                {joinError}
              </div>
            )}

            <form onSubmit={handleJoinByCode}>
              <div className="input-group">
                <label className="input-label">Room Code</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. NET-DEMO01"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value)}
                  style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Join Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
