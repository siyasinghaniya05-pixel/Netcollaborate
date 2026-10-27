import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  MessageSquare,
  Activity,
  Send,
  Share2,
  Crown,
  Edit3,
  Eye,
  Shield
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';

const CollaborationPanel = () => {
  const {
    network,
    activeUsers,
    activityLogs,
    chatMessages,
    sendChatMessage
  } = useNetwork();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('activity'); // 'activity' | 'chat' | 'users'
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(network.roomId || 'NET-DEMO01');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendChatMessage(chatInput);
      setChatInput('');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)'
      }}
    >
      {/* Top Header with Room Code & Share */}
      <div
        style={{
          padding: '0.65rem 1.25rem',
          backgroundColor: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Room ID:
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: 'var(--primary)'
            }}
          >
            {network.roomId || 'NET-DEMO01'}
          </span>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={handleCopyCode}
            title="Copy Room Code"
          >
            {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Sub-Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('activity')}
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: 'none',
              background: activeTab === 'activity' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'activity' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Activity Feed
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: 'none',
              background: activeTab === 'chat' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'chat' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Team Chat ({chatMessages.length})
          </button>

          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: 'none',
              background: activeTab === 'users' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Active Users ({activeUsers.length || 1})
          </button>
        </div>
      </div>

      {/* Tab 1: Live Activity Logs */}
      {activeTab === 'activity' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activityLogs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.8rem' }}>
              No recent team activity in this session.
            </div>
          ) : (
            activityLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  fontSize: '0.75rem',
                  padding: '0.4rem 0',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    marginTop: '6px',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{log.username} </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{log.details}</span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', flexShrink: 0 }}>
                  {log.timestamp}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Team Chat */}
      {activeTab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.8rem' }}>
                Start a conversation with your network team members!
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    padding: '0.4rem 0.6rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    maxWidth: '85%'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 700, color: msg.avatarColor || 'var(--primary)' }}>
                      {msg.sender}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                      {msg.timestamp}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-primary)' }}>{msg.text}</div>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleSendChat}
            style={{
              padding: '0.5rem 1rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '0.5rem'
            }}
          >
            <input
              type="text"
              className="input-field"
              placeholder="Send message to room..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={{ height: '32px', fontSize: '0.8rem' }}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Active Users List */}
      {activeTab === 'users' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeUsers.map((u, i) => {
              const currentUserId = user?.id || user?._id || user?.userId;
              const currentUserName = user?.name || user?.username;
              const meInRoom = activeUsers.find(usr => usr.userId === currentUserId || usr.username === currentUserName);
              const isMeOwner = meInRoom?.role === 'owner' || user?.role === 'instructor';
              const role = u.role || 'editor';

              return (
                <div
                  key={u.socketId || i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 0.75rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: u.avatarColor || '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      color: '#ffffff'
                    }}
                  >
                    {(u.name || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{u.name}</span>
                      {u.userId === currentUserId && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700 }}>(You)</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                  </div>

                  {/* Role Badge / Role Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {isMeOwner && u.socketId ? (
                      <select
                        value={role}
                        onChange={(e) => {
                          const socket = getSocket();
                          socket.emit('role-change', {
                            roomId: network.roomId,
                            targetSocketId: u.socketId,
                            newRole: e.target.value,
                            requesterUser: user
                          });
                        }}
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          color: role === 'owner' ? '#fbbf24' : role === 'viewer' ? '#94a3b8' : '#38bdf8',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 6px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="owner">👑 Owner</option>
                        <option value="editor">✏️ Editor</option>
                        <option value="viewer">👁️ Viewer</option>
                      </select>
                    ) : (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor:
                            role === 'owner'
                              ? 'rgba(251, 191, 36, 0.15)'
                              : role === 'viewer'
                              ? 'rgba(148, 163, 184, 0.15)'
                              : 'rgba(56, 189, 248, 0.15)',
                          color:
                            role === 'owner'
                              ? '#fbbf24'
                              : role === 'viewer'
                              ? '#94a3b8'
                              : '#38bdf8'
                        }}
                      >
                        {role === 'owner' && <Crown size={12} />}
                        {role === 'editor' && <Edit3 size={12} />}
                        {role === 'viewer' && <Eye size={12} />}
                        {role.toUpperCase()}
                      </span>
                    )}
                    <span className="status-dot up" title="Online" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Role Permissions Reference Card */}
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              fontSize: '0.72rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} color="var(--primary)" /> Collaborative Permissions Matrix
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <span style={{ color: '#fbbf24', fontWeight: 700, minWidth: '50px' }}>Owner:</span>
              <span style={{ color: 'var(--text-muted)' }}>Room administrator. Can edit topology, adjust participant roles, create & restore VCS checkpoints.</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <span style={{ color: '#38bdf8', fontWeight: 700, minWidth: '50px' }}>Editor:</span>
              <span style={{ color: 'var(--text-muted)' }}>Can add/move/delete devices, link interfaces, configure IP/VLAN routing, and trigger packet animations.</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <span style={{ color: '#94a3b8', fontWeight: 700, minWidth: '50px' }}>Viewer:</span>
              <span style={{ color: 'var(--text-muted)' }}>Read-only observer. Can inspect device configurations, watch live packet simulations, and participate in team chat.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationPanel;
