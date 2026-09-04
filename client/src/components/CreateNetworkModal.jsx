import React, { useState } from 'react';
import { X, Network, Globe, Lock } from 'lucide-react';
import { networkAPI } from '../services/api';

const CreateNetworkModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a network name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await networkAPI.createNetwork({
        name,
        description,
        visibility
      });

      if (res.data?.success) {
        onCreated(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create network project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Network size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Create New Network</h3>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.6rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger)',
              fontSize: '0.8rem',
              marginBottom: '1rem'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Network Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Branch Office WAN"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Description</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Describe network topology, subnets, and routing intent..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Visibility</label>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '4px' }}>
              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: visibility === 'private' ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                  border: visibility === 'private' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                  style={{ display: 'none' }}
                />
                <Lock size={14} color={visibility === 'private' ? 'var(--primary)' : 'var(--text-muted)'} />
                <span>Private</span>
              </label>

              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: visibility === 'shared' ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                  border: visibility === 'shared' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="shared"
                  checked={visibility === 'shared'}
                  onChange={() => setVisibility('shared')}
                  style={{ display: 'none' }}
                />
                <Globe size={14} color={visibility === 'shared' ? 'var(--primary)' : 'var(--text-muted)'} />
                <span>Shared / Public</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Network'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNetworkModal;
