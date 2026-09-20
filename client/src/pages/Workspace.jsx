import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Activity,
  BarChart3,
  Users,
  BookOpen,
  Award,
  ChevronUp,
  ChevronDown,
  X,
  Sliders,
  Bot,
  Layers,
  Network,
  Clapperboard,
  History,
  FileText
} from 'lucide-react';

import Navbar from '../components/Navbar';
import Toolbar from '../components/Toolbar';
import Sidebar from '../components/Sidebar';
import NetworkCanvas from '../components/NetworkCanvas';
import ConfigurationPanel from '../components/ConfigurationPanel';
import SimulationPanel from '../components/SimulationPanel';
import DebugPanel from '../components/DebugPanel';
import NetworkStats from '../components/NetworkStats';
import CollaborationPanel from '../components/CollaborationPanel';
import EducationalPanel from '../components/EducationalPanel';
import QuizModal from '../components/QuizModal';
import NetAssist from '../components/NetAssist';
import OSIPanel from '../components/OSIPanel';
import RoutingTable from '../components/RoutingTable';
import PacketReplay from '../components/PacketReplay';
import VersionControlPanel from '../components/VersionControlPanel';
import LabReportModal from '../components/LabReportModal';

import { useNetwork } from '../context/NetworkContext';
import { networkAPI } from '../services/api';
import { ReactFlowProvider } from 'reactflow';

const Workspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { network, loadNetwork, selectedNode, activateCollaboration, deactivateCollaboration } = useNetwork();

  // Bottom Drawer State
  const [bottomDrawerTab, setBottomDrawerTab] = useState(null); // 'simulation' | 'diagnostics' | 'stats' | 'collab' | 'learn' | 'history'
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showLearnModal, setShowLearnModal] = useState(false);
  const [showLabReportModal, setShowLabReportModal] = useState(false);

  // Load requested network if ID parameter provided
  useEffect(() => {
    if (id && id !== 'default') {
      networkAPI.getNetworkById(id)
        .then(res => {
          if (res.data?.success && res.data.data) {
            loadNetwork(res.data.data);
          }
        })
        .catch(err => {
          console.warn('Network not found:', err.message);
        });
    }
  }, [id]);

  // Enable live collaboration only while this workspace is mounted.
  useEffect(() => {
    activateCollaboration();
    return () => deactivateCollaboration();
  }, [activateCollaboration, deactivateCollaboration]);

  const toggleDrawer = (tab) => {
    setBottomDrawerTab(prev => (prev === tab ? null : tab));
  };

  return (
    <ReactFlowProvider>
      <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        onOpenQuiz={() => setShowQuizModal(true)}
        onOpenLearn={() => setShowLearnModal(true)}
      />

      {/* Toolbar */}
      <Toolbar
        onOpenSimulation={() => setBottomDrawerTab('simulation')}
        onOpenDiagnostics={() => setBottomDrawerTab('diagnostics')}
        onOpenHistory={() => setBottomDrawerTab('history')}
        onOpenLabReport={() => setShowLabReportModal(true)}
      />

      {/* Main Workspace Layout */}
      <div className="workspace-body">
        {/* Left: Device Library Sidebar */}
        <Sidebar />

        {/* Center: Interactive React Flow Network Canvas */}
        <NetworkCanvas />

        {/* Right: Device Configuration Panel (if a device is selected) */}
        {selectedNode && <ConfigurationPanel />}
      </div>

      {/* Bottom Drawer (Collapsible) */}
      <div
        style={{
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 25,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.15)'
        }}
      >
        {/* Bottom Drawer Control Bar */}
        <div
          style={{
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1rem',
            backgroundColor: 'var(--bg-tertiary)',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => toggleDrawer('simulation')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: bottomDrawerTab === 'simulation' ? 'var(--primary)' : 'transparent',
                color: bottomDrawerTab === 'simulation' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <Send size={13} /> Simulation & Ping
            </button>

            <button
              onClick={() => toggleDrawer('diagnostics')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: bottomDrawerTab === 'diagnostics' ? 'var(--primary)' : 'transparent',
                color: bottomDrawerTab === 'diagnostics' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <Activity size={13} /> Diagnostics & Debugger
            </button>

            <button
              onClick={() => toggleDrawer('stats')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: bottomDrawerTab === 'stats' ? 'var(--primary)' : 'transparent',
                color: bottomDrawerTab === 'stats' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <BarChart3 size={13} /> Network Statistics
            </button>

            <button
              onClick={() => toggleDrawer('collab')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: bottomDrawerTab === 'collab' ? 'var(--primary)' : 'transparent',
                color: bottomDrawerTab === 'collab' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <Users size={13} /> Team & Activity
            </button>

            <button
              onClick={() => toggleDrawer('netassist')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: bottomDrawerTab === 'netassist' ? 'var(--primary)' : 'transparent',
                color: bottomDrawerTab === 'netassist' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <Bot size={13} /> NetAssist
            </button>

            <button
              onClick={() => toggleDrawer('osi')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: bottomDrawerTab === 'osi' ? 'var(--primary)' : 'transparent',
                color: bottomDrawerTab === 'osi' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <Layers size={13} /> OSI Layers
            </button>

            <button
              onClick={() => toggleDrawer('routing')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: bottomDrawerTab === 'routing' ? 'var(--primary)' : 'transparent',
                color: bottomDrawerTab === 'routing' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <Network size={13} /> Routing Table
            </button>

            <button
              onClick={() => toggleDrawer('replay')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: bottomDrawerTab === 'replay' ? 'var(--primary)' : 'transparent',
                color: bottomDrawerTab === 'replay' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <Clapperboard size={13} /> Packet Replay
            </button>

            <button
              onClick={() => toggleDrawer('history')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: bottomDrawerTab === 'history' ? 'var(--primary)' : 'transparent',
                color: bottomDrawerTab === 'history' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <History size={13} /> Snapshots & VCS
            </button>
          </div>

          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => setBottomDrawerTab(prev => (prev ? null : 'simulation'))}
            title={bottomDrawerTab ? 'Collapse Panel' : 'Expand Panel'}
          >
            {bottomDrawerTab ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        {/* Drawer Content Body */}
        {bottomDrawerTab && (
          <div style={{ height: bottomDrawerTab === 'history' ? '300px' : '240px', overflow: 'hidden' }}>
            {bottomDrawerTab === 'simulation' && <SimulationPanel />}
            {bottomDrawerTab === 'diagnostics' && <DebugPanel />}
            {bottomDrawerTab === 'stats' && <NetworkStats />}
            {bottomDrawerTab === 'collab' && <CollaborationPanel />}
            {bottomDrawerTab === 'netassist' && <NetAssist />}
            {bottomDrawerTab === 'osi' && <OSIPanel />}
            {bottomDrawerTab === 'routing' && <RoutingTable />}
            {bottomDrawerTab === 'replay' && <PacketReplay />}
            {bottomDrawerTab === 'history' && <VersionControlPanel />}
          </div>
        )}
      </div>

      {/* Educational Guide Modal */}
      {showLearnModal && (
        <div className="modal-overlay" onClick={() => setShowLearnModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '880px', height: '80vh', padding: 0, overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0.75rem 1.25rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Computer Networking Learning Guide</h3>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowLearnModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ height: 'calc(80vh - 48px)' }}>
              <EducationalPanel />
            </div>
          </div>
        </div>
      )}

      {/* Networking Quiz Modal */}
      {showQuizModal && <QuizModal onClose={() => setShowQuizModal(false)} />}

      {/* Automatic Lab Report Generator Modal */}
      {showLabReportModal && <LabReportModal onClose={() => setShowLabReportModal(false)} />}
      </div>
    </ReactFlowProvider>
  );
};

export default Workspace;
