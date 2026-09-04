import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  MessageSquare,
  Activity,
  Send,
  Share2
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';

const CollaborationPanel = () => {
  const {
    network,
    activeUsers,
    activityLogs,
    chatMessages,
    sendChatMessage
  } = useNetwork();

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
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem 1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeUsers.map((u, i) => (
              <div
                key={u.socketId || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: u.avatarColor || '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: '#ffffff'
                  }}
                >
                  {(u.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                </div>
                <span className="status-dot up" title="Online" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationPanel;
