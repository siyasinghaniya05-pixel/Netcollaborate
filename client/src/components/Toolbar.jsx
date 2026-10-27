import React, { useState, useRef } from 'react';
import {
  Save,
  Undo2,
  Redo2,
  Maximize2,
  Search,
  Activity,
  Send,
  History,
  FileText,
  Download,
  Upload,
  LayoutGrid,
  Copy,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { useReactFlow } from 'reactflow';
import { useNetwork } from '../context/NetworkContext';
import LabTemplatesModal from './LabTemplatesModal';

const Toolbar = ({ onOpenSimulation, onOpenDiagnostics, onOpenHistory, onOpenLabReport }) => {
  const {
    network,
    setNetwork,
    nodes,
    setNodes,
    edges,
    setEdges,
    saveNetwork,
    saveStatus,
    undo,
    redo,
    canUndo,
    canRedo,
    diagnostics,
    selectedNode,
    setSelectedNode,
    addDevice,
    loadNetwork
  } = useNetwork();

  const reactFlow = useReactFlow();
  const fileInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [networkName, setNetworkName] = useState(network.name || 'Untitled Network');
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

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

  // Auto-Arrange Network Topology Hierarchically
  const handleAutoArrange = () => {
    if (nodes.length === 0) return;

    const tier1 = []; // Core / WAN / Routers
    const tier2 = []; // Distribution / Switches / Firewalls
    const tier3 = []; // End Hosts / Servers

    nodes.forEach(node => {
      const type = (node.type || node.data?.type || '').toLowerCase();
      if (['cloud', 'internet', 'router'].includes(type)) {
        tier1.push(node);
      } else if (['switch', 'hub', 'firewall', 'accesspoint'].includes(type)) {
        tier2.push(node);
      } else {
        tier3.push(node);
      }
    });

    const arrangeTier = (tierNodes, yPos) => {
      const spacing = 220;
      const totalWidth = (tierNodes.length - 1) * spacing;
      const startX = 600 - totalWidth / 2;
      return tierNodes.map((n, idx) => ({
        ...n,
        position: { x: Math.max(80, startX + idx * spacing), y: yPos }
      }));
    };

    const arranged1 = arrangeTier(tier1, 100);
    const arranged2 = arrangeTier(tier2, 280);
    const arranged3 = arrangeTier(tier3, 460);

    const rearranged = [...arranged1, ...arranged2, ...arranged3];
    setNodes(rearranged);
    setTimeout(() => {
      reactFlow.fitView({ padding: 0.25, duration: 600 });
    }, 100);
  };

  // Export Project JSON
  const handleExportJSON = () => {
    const projectData = {
      project: 'NetCollaborate',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      network: {
        name: network.name || 'Untitled Network',
        description: network.description || '',
        roomId: network.roomId,
        nodes,
        edges
      }
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(network.name || 'network').toLowerCase().replace(/\s+/g, '-')}-topology.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import Project JSON
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const importedNet = parsed.network || parsed;
        if (importedNet.nodes && Array.isArray(importedNet.nodes)) {
          loadNetwork({
            id: `imported-${Date.now()}`,
            name: importedNet.name || file.name.replace('.json', ''),
            description: importedNet.description || 'Imported network project',
            roomId: importedNet.roomId || `NET-${Date.now().toString(36).toUpperCase().slice(-6)}`,
            nodes: importedNet.nodes,
            edges: importedNet.edges || [],
            simulationHistory: []
          });
          setTimeout(() => reactFlow.fitView({ padding: 0.2, duration: 600 }), 200);
        } else {
          alert('Invalid NetCollaborate project file: Missing nodes definition.');
        }
      } catch (err) {
        alert('Failed to parse JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Duplicate Selected Device
  const handleDuplicate = () => {
    if (!selectedNode) return;
    const type = selectedNode.data?.type || selectedNode.type || 'pc';
    const newPos = {
      x: selectedNode.position.x + 50,
      y: selectedNode.position.y + 50
    };
    addDevice(type, newPos);
  };

  const health = diagnostics?.healthScore ?? 100;
  const isHealthy = health >= 90;

  return (
    <>
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
        <div style={{ position: 'relative', width: '200px' }}>
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

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* Templates Picker */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowTemplatesModal(true)}
            title="Browse 10 Standardized Lab Templates"
          >
            <BookOpen size={14} color="var(--primary)" />
            <span>Templates</span>
          </button>

          {/* Auto Arrange */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleAutoArrange}
            title="Auto-Arrange Network Topology Tiers"
          >
            <LayoutGrid size={14} />
            <span>Arrange</span>
          </button>

          {/* Duplicate selected */}
          {selectedNode && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleDuplicate}
              title="Duplicate Selected Device"
            >
              <Copy size={14} />
              <span>Duplicate</span>
            </button>
          )}

          {/* Undo / Redo */}
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            style={{ opacity: canUndo ? 1 : 0.4 }}
          >
            <Undo2 size={15} />
          </button>

          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            style={{ opacity: canRedo ? 1 : 0.4 }}
          >
            <Redo2 size={15} />
          </button>

          {/* Fit View */}
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => reactFlow.fitView({ padding: 0.2, duration: 600 })}
            title="Fit Network to View"
          >
            <Maximize2 size={15} />
          </button>

          {/* Export JSON */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportJSON}
            title="Export Topology as JSON"
          >
            <Download size={14} />
            <span>Export</span>
          </button>

          {/* Import JSON */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleImportClick}
            title="Import Topology JSON"
          >
            <Upload size={14} />
            <span>Import</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            style={{ display: 'none' }}
          />

          {/* Save */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={saveNetwork}
            title="Save Project (Ctrl+S)"
          >
            <Save size={14} />
            <span>Save</span>
          </button>

          {/* Version History */}
          {onOpenHistory && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenHistory}
              title="Snapshots & Version Control Diff"
            >
              <History size={14} />
              <span>History</span>
            </button>
          )}

          {/* Lab Report */}
          {onOpenLabReport && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenLabReport}
              title="Generate & Export PDF Lab Report"
            >
              <FileText size={14} />
              <span>Lab Report</span>
            </button>
          )}

          {/* Health Diagnostics */}
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

          {/* Simulate */}
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

      {showTemplatesModal && (
        <LabTemplatesModal onClose={() => setShowTemplatesModal(false)} />
      )}
    </>
  );
};

export default Toolbar;
