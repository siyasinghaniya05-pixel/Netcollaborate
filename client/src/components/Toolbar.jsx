import React, { useState } from 'react';
import {
  Save,
  Undo2,
  Redo2,
  Maximize2,
  Search,
  Activity,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useReactFlow } from 'reactflow';
import { useNetwork } from '../context/NetworkContext';

const Toolbar = ({ onOpenSimulation, onOpenDiagnostics }) => {
  const {
    network,
    setNetwork,
    nodes,
    saveNetwork,
    saveStatus,
    undo,
    redo,
    canUndo,
    canRedo,
    diagnostics,
    setSelectedNode
  } = useNetwork();

  const reactFlow = useReactFlow();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [networkName, setNetworkName] = useState(network.name || 'Untitled Network');

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const matches = nodes.filter(n => {
      const name = n.data?.name || n.id;
      const ip = n.data?.ip || '';
      return name.toLowerCase().includes(q.toLowerCase()) || ip.includes(q);
    });
    setSearchResults(matches);
  };

  const focusDevice = (node) => {
    setSelectedNode(node);
    reactFlow.setCenter(node.position.x + 80, node.position.y + 40, { zoom: 1.3, duration: 800 });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleNameSave = () => {
    setIsEditingName(false);
    if (networkName.trim()) {
      setNetwork(prev => ({ ...prev, name: networkName }));
      saveNetwork();
    }
  };

  const health = diagnostics?.healthScore ?? 100;
  const isHealthy = health >= 90;

  return (
    <div
      style={{
        height: '48px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        zIndex: 20
      }}
    >
      {/* Left: Network Title & Edit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {isEditingName ? (
          <input
            type="text"
            className="input-field"
            value={networkName}
            onChange={(e) => setNetworkName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
            autoFocus
            style={{ width: '220px', height: '30px', padding: '0 8px', fontSize: '0.85rem' }}
          />
        ) : (
          <div
            onClick={() => setIsEditingName(true)}
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Click to rename project"
          >
            {network.name || 'Untitled Network'}
          </div>
        )}

        {/* Save Status indicator */}
        <span
          style={{
            fontSize: '0.7rem',
            color: saveStatus === 'unsaved' ? 'var(--warning)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'unsaved' && '● Unsaved changes'}
          {saveStatus === 'saved' && '✓ Saved'}
        </span>
      </div>

      {/* Center: Device Search & Focus */}
      <div style={{ position: 'relative', width: '220px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Find device..."
            value={searchQuery}
            onChange={handleSearch}
            style={{ paddingLeft: '28px', height: '30px', fontSize: '0.75rem' }}
          />
        </div>

        {searchResults.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '36px',
              left: 0,
              right: 0,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 50,
              maxHeight: '180px',
              overflowY: 'auto'
            }}
          >
            {searchResults.map((node) => (
              <div
                key={node.id}
                onClick={() => focusDevice(node)}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ fontWeight: 600 }}>{node.data?.name || node.id}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{node.data?.ip || node.data?.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Actions (Save, Undo, Redo, Zoom, Diagnostics, Simulate) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          style={{ opacity: canUndo ? 1 : 0.4 }}
        >
          <Undo2 size={16} />
        </button>

        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          style={{ opacity: canRedo ? 1 : 0.4 }}
        >
          <Redo2 size={16} />
        </button>

        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => reactFlow.fitView({ padding: 0.2, duration: 600 })}
          title="Fit Network to View"
        >
          <Maximize2 size={16} />
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={saveNetwork}
          title="Save Project (Ctrl+S)"
        >
          <Save size={14} />
          <span>Save</span>
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenDiagnostics}
          style={{
            borderColor: isHealthy ? 'var(--success)' : 'var(--danger)',
            color: isHealthy ? 'var(--success)' : 'var(--danger)'
          }}
          title="Run Network Health Diagnostics"
        >
          <Activity size={14} />
          <span>Health: {health}%</span>
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={onOpenSimulation}
          title="Send Packet / Ping Simulator"
        >
          <Send size={14} />
          <span>Simulate</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
