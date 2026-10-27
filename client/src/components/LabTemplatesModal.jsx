import React, { useState } from 'react';
import {
  X,
  BookOpen,
  ArrowRight,
  Layers,
  Clock,
  Sparkles,
  Search,
  CheckCircle2
} from 'lucide-react';
import { LAB_TEMPLATES } from '../utils/labTemplates';
import { useNetwork } from '../context/NetworkContext';

const LabTemplatesModal = ({ onClose, onSelectTemplate }) => {
  const { loadNetwork } = useNetwork();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['ALL', 'LAN Fundamentals', 'Routing', 'Subnetting', 'Switching', 'Application Layer', 'Enterprise', 'Security', 'Troubleshooting'];

  const filtered = LAB_TEMPLATES.filter((tmpl) => {
    const matchesCat = selectedCategory === 'ALL' || tmpl.category === selectedCategory;
    const matchesSearch =
      tmpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.objective.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleLaunch = (tmpl) => {
    if (onSelectTemplate) {
      onSelectTemplate(tmpl);
    } else {
      loadNetwork({
        id: `project-${tmpl.id}-${Date.now().toString().slice(-4)}`,
        name: tmpl.title,
        description: tmpl.description,
        roomId: `NET-${Date.now().toString(36).toUpperCase().slice(-6)}`,
        nodes: tmpl.nodes,
        edges: tmpl.edges,
        simulationHistory: []
      });
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-tertiary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Standardized Networking Lab Templates</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Select an editable curriculum template to load directly onto your canvas workspace.
              </p>
            </div>
          </div>

          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            padding: '0.85rem 1.75rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Categories */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: selectedCategory === cat ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '30px', height: '30px', fontSize: '0.75rem' }}
            />
          </div>
        </div>

        {/* Templates Grid List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{
                padding: '1.25rem 1.5rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
                transition: 'border-color 0.15s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.35rem' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>{tmpl.category}</span>
                  <span
                    className={`badge ${
                      tmpl.difficulty === 'Beginner' ? 'badge-success' : tmpl.difficulty === 'Intermediate' ? 'badge-warning' : 'badge-danger'
                    }`}
                    style={{ fontSize: '0.68rem' }}
                  >
                    {tmpl.difficulty} • {tmpl.duration}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                  {tmpl.title}
                </h3>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                  {tmpl.objective}
                </p>

                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{tmpl.nodes.length} Devices</span>
                  <span>•</span>
                  <span>{tmpl.edges.length} Connections</span>
                  <span>•</span>
                  <span>{tmpl.requirements.length} Requirements</span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => handleLaunch(tmpl)}
                style={{ flexShrink: 0, padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
              >
                <span>Load Template</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LabTemplatesModal;
