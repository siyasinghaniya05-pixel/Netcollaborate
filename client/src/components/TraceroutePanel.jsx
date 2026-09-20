import React, { useState } from 'react';
import {
  Route,
  Radar,
  MapPin,
  Play,
  Loader,
  AlertTriangle,
  CheckCircle2,
  Terminal
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { networkAPI } from '../services/api';

const TraceroutePanel = () => {
  const {
    network,
    nodes,
    edges,
    setActiveNodeId,
    setActiveEdgeId
  } = useNetwork();

  const [sourceId, setSourceId] = useState(nodes[0]?.id || '');
  const [target, setTarget] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hopIndex, setHopIndex] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);

  const eligibleHosts = nodes.filter(n => n.type === 'deviceNode' && n.data?.type !== 'router');

  const highlightHop = (idx) => {
    const hop = result?.hops?.[idx];
    if (!hop) return;
    setActiveNodeId(hop.id);
    setActiveEdgeId(null);
    setHopIndex(idx);
  };

  const runTrace = async () => {
    if (!sourceId || !target) return;
    setIsLoading(true);
    setResult(null);
    setHopIndex(-1);
    try {
      const res = await networkAPI.traceroute(network.id || network._id, {
        nodes,
        edges,
        sourceId,
        destIdOrIP: target,
        maxHops: 15
      });
      if (res.data?.success) setResult(res.data.data);
    } catch (err) {
      console.warn('Traceroute failed:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const animateRoute = () => {
    if (!result || result.hops.length === 0) return;
    setIsAnimating(true);
    setHopIndex(-1);
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= result.hops.length) {
        clearInterval(interval);
        setIsAnimating(false);
        setActiveNodeId(result.hops[result.hops.length - 1]?.id);
        setActiveEdgeId(null);
        return;
      }
      setHopIndex(idx);
      highlightHop(idx);
      idx++;
    }, 900);
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
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
          <Radar size={15} color="var(--primary)" /> TRACEROUTE
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Source Host</label>
          <select className="input-field" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            {eligibleHosts.length === 0 && <option value="">No hosts available</option>}
            {eligibleHosts.map(n => (
              <option key={n.id} value={n.id}>
                {n.data?.name || n.id} ({n.data?.ip})
              </option>
            ))}
          </select>
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Destination Host or IP</label>
          <input
            type="text"
            className="input-field"
            placeholder="Web-Server-1 or 192.168.2.10"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runTrace()}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={runTrace}
          disabled={isLoading || !sourceId || !target}
        >
          <Route size={14} />
          <span>{isLoading ? 'Tracing Route...' : 'TRACE ROUTE'}</span>
        </button>

        <button
          className="btn btn-ghost"
          onClick={animateRoute}
          disabled={!result || result.hops.length === 0 || isAnimating}
        >
          <Play size={14} />
          <span>{isAnimating ? 'Animating Route...' : 'ANIMATE ON CANVAS'}</span>
        </button>

        <div
          style={{
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            backgroundColor: 'var(--bg-tertiary)',
            padding: '0.6rem',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          Traceroute reveals every router/host along the path by sending probes with
          incrementally larger TTL values, just like the real <span style={{ fontFamily: 'var(--font-mono)' }}>tracert</span> /
          <span style={{ fontFamily: 'var(--font-mono)' }}>traceroute</span> utilities. Click a hop to highlight it on the canvas.
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.9rem', overflow: 'hidden' }}>
        {!result && !isLoading && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
              gap: '6px'
            }}
          >
            <Terminal size={16} /> Select a source and destination to begin a traceroute.
          </div>
        )}

        {isLoading && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: '8px'
            }}
          >
            <Loader size={16} className="spin" /> Probing path with increasing TTL values...
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1, overflowY: 'auto' }}>
            {/* Status banner */}
            <div
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: result.success ? 'var(--success-light)' : 'var(--danger-light)',
                color: result.success ? 'var(--success)' : 'var(--danger)'
              }}
            >
              {result.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>
                Trace to {result.targetName || result.target}: {result.success ? 'complete' : result.error || 'unreachable'}
              </span>
            </div>

            {/* Hop rows */}
            {result.hops.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', padding: '1rem 0' }}>
                No hops discovered — the destination is unreachable from the source.
              </div>
            ) : (
              result.hops.map((h, idx) => (
                <div
                  key={idx}
                  onClick={() => highlightHop(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.7rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: hopIndex === idx ? 'var(--bg-active, #eef3f8)' : 'var(--bg-tertiary)',
                    border: '1px solid ' + (hopIndex === idx ? 'var(--primary)' : 'var(--border-color)'),
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span className="badge badge-primary" style={{ minWidth: '44px' }}>Hop {h.hop}</span>
                  <MapPin size={13} color="var(--primary)" />
                  <span style={{ fontWeight: 700, minWidth: '120px' }}>{h.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', minWidth: '120px' }}>{h.ip || '—'}</span>
                  <span style={{ color: 'var(--text-muted)' }}>ttl={h.ttl}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{h.latency} ms</span>
                  {h.reached && <span className="badge badge-success">Dest</span>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TraceroutePanel;