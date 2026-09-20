import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  StepForward,
  StepBack,
  RotateCcw,
  Clapperboard,
  Loader,
  Package,
  ArrowDown,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { networkAPI } from '../services/api';

const PacketReplay = () => {
  const {
    network,
    nodes,
    edges,
    simulationResult,
    setActiveNodeId,
    setActiveEdgeId
  } = useNetwork();

  const [sourceId, setSourceId] = useState(nodes[0]?.id || '');
  const [destId, setDestId] = useState(nodes[nodes.length - 1]?.id || '');
  const [protocol, setProtocol] = useState('ICMP');
  const [ttl, setTtl] = useState(64);
  const [replay, setReplay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [frameIndex, setFrameIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);

  const frames = replay?.frames || [];
  const currentFrame = frames[frameIndex];

  const eligibleHosts = nodes.filter(n => n.type === 'deviceNode' && n.data?.type !== 'router');

  // Pre-fill from the last simulation if available
  useEffect(() => {
    if (!simulationResult) return;
    const path = simulationResult.pathNodes || [];
    if (path[0]) setSourceId(path[0]);
    if (path[path.length - 1]) setDestId(path[path.length - 1]);
  }, [simulationResult]);

  const fetchReplay = async () => {
    if (!sourceId || !destId) return;
    setLoading(true);
    setReplay(null);
    setFrameIndex(-1);
    setPlaying(false);
    try {
      const res = await networkAPI.replay(network.id || network._id, {
        nodes,
        edges,
        sourceId,
        destId,
        protocol,
        ttl
      });
      if (res.data?.success) {
        setReplay(res.data.data.replay);
        setFrameIndex(0);
      }
    } catch (err) {
      console.warn('Replay failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Frame playback timer
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setFrameIndex((prev) => {
        if (prev >= frames.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(t);
  }, [playing, frames.length]);

  // Highlight current frame's node/edge on canvas
  useEffect(() => {
    if (!currentFrame) return;
    if (currentFrame.nodeId) setActiveNodeId(currentFrame.nodeId);
    setActiveEdgeId(currentFrame.edgeId || null);
  }, [frameIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepTo = (idx) => {
    const clamped = Math.max(0, Math.min(frames.length - 1, idx));
    setPlaying(false);
    setFrameIndex(clamped);
  };

  const jumpTo = (i) => {
    setPlaying(false);
    setFrameIndex(i);
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Controls */}
      <div
        style={{
          width: '300px',
          padding: '0.9rem',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
          <Clapperboard size={15} color="var(--primary)" /> PACKET REPLAY
        </div>

        {replay && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.7rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              backgroundColor: replay.success ? 'var(--success-light)' : 'var(--danger-light)',
              color: replay.success ? 'var(--success)' : 'var(--danger)'
            }}
          >
            {replay.success ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            <span style={{ fontWeight: 700 }}>{replay.success ? 'DELIVERED' : replay.reason || 'DROPPED'}</span>
            {replay.packetId && <span style={{ marginLeft: 'auto', fontWeight: 600 }}>#{replay.packetId}</span>}
          </div>
        )}

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Source Device</label>
          <select className="input-field" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            {eligibleHosts.length === 0 && <option value="">No hosts</option>}
            {eligibleHosts.map(n => (
              <option key={n.id} value={n.id}>{n.data?.name || n.id} ({n.data?.ip})</option>
            ))}
          </select>
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Destination Device</label>
          <select className="input-field" value={destId} onChange={(e) => setDestId(e.target.value)}>
            {eligibleHosts.length === 0 && <option value="">No hosts</option>}
            {eligibleHosts.map(n => (
              <option key={n.id} value={n.id}>{n.data?.name || n.id} ({n.data?.ip})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="input-label">Protocol</label>
            <select className="input-field" value={protocol} onChange={(e) => setProtocol(e.target.value)}>
              <option value="ICMP">ICMP</option>
              <option value="HTTP">HTTP</option>
              <option value="TCP">TCP</option>
              <option value="DNS">DNS</option>
            </select>
          </div>
          <div className="input-group" style={{ width: '70px', marginBottom: 0 }}>
            <label className="input-label">TTL</label>
            <input type="number" className="input-field" value={ttl} min={1} max={255}
              onChange={(e) => setTtl(parseInt(e.target.value, 10) || 64)} />
          </div>
        </div>

        <button className="btn btn-primary" onClick={fetchReplay} disabled={loading || !sourceId || !destId}>
          {loading ? <Loader size={14} className="spin" /> : <Package size={14} />}
          <span>{loading ? 'Building Journey...' : 'CAPTURE JOURNEY'}</span>
        </button>

        {/* Player controls */}
        {frames.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.5rem',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)'
            }}
          >
            <button className="btn btn-ghost btn-icon btn-sm" title="Reset" onClick={() => jumpTo(0)}>
              <RotateCcw size={14} />
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" title="Step back" onClick={() => stepTo(frameIndex - 1)}>
              <StepBack size={14} />
            </button>
            <button
              className="btn btn-primary btn-sm"
              style={{ width: '52px' }}
              title={playing ? 'Pause' : 'Play'}
              onClick={() => {
                if (frameIndex >= frames.length - 1) setFrameIndex(0);
                setPlaying(!playing);
              }}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" title="Step forward" onClick={() => stepTo(frameIndex + 1)}>
              <StepForward size={14} />
            </button>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
              {frameIndex + 1}/{frames.length}
            </span>
          </div>
        )}
      </div>

      {/* Journey frames */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.9rem', overflow: 'hidden' }}>
        {frames.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '8px',
              color: 'var(--text-muted)',
              fontSize: '0.82rem'
            }}
          >
            <Package size={20} />
            Capture a packet journey to step through it hop-by-hop.
            {replay && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>offline replay available for last sim</span>}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {frames.map((f, i) => {
              const isCurrent = i === frameIndex;
              return (
                <div
                  key={i}
                  onClick={() => jumpTo(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.45rem 0.7rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isCurrent ? 'var(--bg-active, #eef3f8)' : 'var(--bg-tertiary)',
                    border: '1px solid ' + (isCurrent ? 'var(--primary)' : 'var(--border-color)'),
                    cursor: 'pointer',
                    fontSize: '0.73rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ minWidth: '24px', fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}</span>
                  <span className={`badge ${f.status === 'delivered' ? 'badge-success' : f.status === 'dropped' ? 'badge-danger' : 'badge-primary'}`} style={{ fontSize: '0.6rem' }}>
                    {f.status}
                  </span>
                  <span style={{ fontWeight: 700, minWidth: '120px' }}>{f.deviceName}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', minWidth: '115px' }}>{f.ip || '—'}</span>
                  <span style={{ color: 'var(--primary)', minWidth: '130px' }}>{f.action}:</span>
                  <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.details}</span>
                  <ArrowDown size={13} style={{ color: 'var(--text-muted)', opacity: i === frames.length - 1 ? 0 : 1 }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.66rem', minWidth: '90px' }}>→ {f.nextHop}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PacketReplay;