import React from 'react';
import {
  Activity,
  Globe,
  Network,
  Monitor,
  Server,
  Link2,
  CheckCircle,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';

const NetworkStats = () => {
  const { nodes, edges, diagnostics, simulationHistory } = useNetwork();

  const health = diagnostics?.healthScore ?? 100;
  let healthRating = 'Perfect';
  let healthColor = 'var(--success)';

  if (health >= 90) {
    healthRating = 'Excellent';
    healthColor = 'var(--success)';
  } else if (health >= 75) {
    healthRating = 'Good';
    healthColor = '#3b82f6';
  } else if (health >= 50) {
    healthRating = 'Needs Attention';
    healthColor = 'var(--warning)';
  } else {
    healthRating = 'Critical';
    healthColor = 'var(--danger)';
  }

  // Device counts
  const routers = nodes.filter(n => (n.data?.type || n.type || '').toLowerCase() === 'router').length;
  const switches = nodes.filter(n => ['switch', 'hub'].includes((n.data?.type || n.type || '').toLowerCase())).length;
  const pcs = nodes.filter(n => ['pc', 'laptop'].includes((n.data?.type || n.type || '').toLowerCase())).length;
  const servers = nodes.filter(n => (n.data?.type || n.type || '').toLowerCase() === 'server').length;

  // Packet statistics from simulation history
  const totalSent = simulationHistory.length;
  const totalDelivered = simulationHistory.filter(s => s.status === 'Delivered').length;
  const totalFailed = totalSent - totalDelivered;
  const successRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : 100;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      {/* Health Score Overview Card */}
      <div
        style={{
          padding: '1.25rem',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color={healthColor} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Overall Network Health</span>
          </div>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: health >= 75 ? 'var(--success-light)' : 'var(--warning-light)',
              color: healthColor
            }}
          >
            {healthRating} ({health}%)
          </span>
        </div>

        {/* Health Bar */}
        <div className="health-bar-container">
          <div
            className="health-bar-fill"
            style={{ width: `${health}%`, backgroundColor: healthColor }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          <span>0% Critical</span>
          <span>50% Attention</span>
          <span>75% Good</span>
          <span>100% Perfect</span>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}
      >
        <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Monitor size={14} /> Total Devices
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '4px' }}>{nodes.length}</div>
        </div>

        <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Link2 size={14} /> Active Links
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '4px' }}>{edges.length}</div>
        </div>

        <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={14} /> Packets Delivered
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
            {totalDelivered}
          </div>
        </div>

        <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} /> Success Rate
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
            {successRate}%
          </div>
        </div>
      </div>

      {/* Device Breakdown by Type */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Device Topology Breakdown
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
            <Globe size={16} color="var(--primary)" />
            <span>Routers: <strong>{routers}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
            <Network size={16} color="#10b981" />
            <span>Switches: <strong>{switches}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
            <Monitor size={16} color="#f59e0b" />
            <span>Workstations: <strong>{pcs}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
            <Server size={16} color="#8b5cf6" />
            <span>Servers: <strong>{servers}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkStats;
