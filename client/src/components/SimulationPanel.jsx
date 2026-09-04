import React, { useState } from 'react';
import {
  Send,
  Terminal,
  History,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { networkAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

const SimulationPanel = ({ onClose }) => {
  const {
    network,
    nodes,
    edges,
    playSimulationAnimation,
    simulationResult,
    isSimulating,
    simulationHistory,
    setSimulationHistory
  } = useNetwork();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('packet'); // 'packet' | 'ping' | 'history'

  // Packet Simulator State
  const [sourceId, setSourceId] = useState(nodes[0]?.id || '');
  const [destId, setDestId] = useState(nodes[nodes.length - 1]?.id || '');
  const [protocol, setProtocol] = useState('ICMP');
  const [ttl, setTtl] = useState(64);
  const [packetLoading, setPacketLoading] = useState(false);

  // Ping Console State
  const [pingSourceId, setPingSourceId] = useState(nodes[0]?.id || '');
  const [pingTarget, setPingTarget] = useState('');
  const [pingLines, setPingLines] = useState([
    'NetCollaborate Network Diagnostic Console [Version 1.0]',
    'Type target IP or select device to simulate ICMP Ping.',
    ''
  ]);
  const [isPinging, setIsPinging] = useState(false);

  const eligibleHosts = nodes.filter(n => n.type === 'deviceNode');

  // Handle Send Packet
  const handleSendPacket = async () => {
    if (!sourceId || !destId) return;
    setPacketLoading(true);

    try {
      const res = await networkAPI.simulate(network.id || network._id, {
        nodes,
        edges,
        sourceId,
        destId,
        protocol,
        ttl
      });

      if (res.data?.success) {
        const simData = res.data.data;
        playSimulationAnimation(simData);

        const sNode = nodes.find(n => n.id === sourceId);
        const dNode = nodes.find(n => n.id === destId);

        // Record to history
        const historyEntry = {
          id: 'sim-' + Date.now(),
          timestamp: new Date(),
          sourceDevice: sNode?.data?.name || sourceId,
          destDevice: dNode?.data?.name || destId,
          sourceIP: simData.packetInfo?.sourceIP || sNode?.data?.ip,
          destIP: simData.packetInfo?.destIP || dNode?.data?.ip,
          protocol,
          status: simData.success ? 'Delivered' : 'Failed',
          durationMs: simData.stats?.latency || 0,
          hopsCount: simData.hops?.length || 0,
          reason: simData.reason
        };

        setSimulationHistory(prev => [historyEntry, ...prev.slice(0, 40)]);

        // Broadcast to collaborators
        const socket = getSocket();
        socket.emit('simulate-broadcast', {
          roomId: network.roomId,
          simResult: simData,
          sourceName: historyEntry.sourceDevice,
          destName: historyEntry.destDevice,
          user
        });
      }
    } catch (err) {
      console.warn('Simulation failed:', err.message);
    } finally {
      setPacketLoading(false);
    }
  };

  // Handle Ping Simulation
  const handleRunPing = async () => {
    if (!pingSourceId || !pingTarget) return;
    setIsPinging(true);

    const targetNode = nodes.find(n => n.id === pingTarget || n.data?.ip === pingTarget);
    const targetDisplay = targetNode?.data?.ip || pingTarget;

    setPingLines(prev => [
      ...prev,
      `> ping ${targetDisplay} -c 4`,
      `PING ${targetDisplay} (${targetDisplay}): 56 data bytes`
    ]);

    try {
      const res = await networkAPI.ping(network.id || network._id, {
        nodes,
        edges,
        sourceId: pingSourceId,
        destIdOrIP: pingTarget,
        count: 4
      });

      if (res.data?.success) {
        const pData = res.data.data;
        setPingLines(prev => [...prev, ...pData.lines.slice(1), '']);

        if (pData.simResult) {
          playSimulationAnimation(pData.simResult);
        }
      }
    } catch (err) {
      setPingLines(prev => [...prev, `Request timed out. Destination unreachable.`, '']);
    } finally {
      setIsPinging(false);
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
      {/* Sub-tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.6rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-tertiary)'
        }}
      >
        <button
          onClick={() => setActiveTab('packet')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: activeTab === 'packet' ? 'var(--primary)' : 'var(--text-secondary)'
          }}
        >
          <Send size={14} /> Send Packet
        </button>

        <button
          onClick={() => setActiveTab('ping')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: activeTab === 'ping' ? 'var(--primary)' : 'var(--text-secondary)'
          }}
        >
          <Terminal size={14} /> ICMP Ping Utility
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-secondary)'
          }}
        >
          <History size={14} /> Simulation History
        </button>
      </div>

      {/* Tab 1: Packet Simulator */}
      {activeTab === 'packet' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '1rem', gap: '1.5rem' }}>
          {/* Controls */}
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Source Device</label>
              <select
                className="input-field"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                {eligibleHosts.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.data?.name || n.id} ({n.data?.ip || n.data?.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Destination Device</label>
              <select
                className="input-field"
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
              >
                {eligibleHosts.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.data?.name || n.id} ({n.data?.ip || n.data?.type})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="input-label">Protocol</label>
                <select
                  className="input-field"
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                >
                  <option value="ICMP">ICMP (Ping)</option>
                  <option value="HTTP">HTTP (Port 80)</option>
                  <option value="TCP">TCP SYN</option>
                  <option value="DNS">DNS Query</option>
                </select>
              </div>

              <div className="input-group" style={{ width: '80px', marginBottom: 0 }}>
                <label className="input-label">TTL</label>
                <input
                  type="number"
                  className="input-field"
                  value={ttl}
                  onChange={(e) => setTtl(parseInt(e.target.value, 10) || 64)}
                  min={1}
                  max={255}
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: '0.5rem' }}
              onClick={handleSendPacket}
              disabled={packetLoading || isSimulating}
            >
              <Play size={16} />
              <span>{packetLoading ? 'Calculating Path...' : isSimulating ? 'Animating Packet...' : 'SEND PACKET'}</span>
            </button>
          </div>

          {/* Packet Details & Step Log */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {simulationResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Status Bar */}
                <div
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: simulationResult.success ? 'var(--success-light)' : 'var(--danger-light)',
                    color: simulationResult.success ? 'var(--success)' : 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    marginBottom: '0.75rem'
                  }}
                >
                  {simulationResult.success ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <span>{simulationResult.success ? 'PACKET DELIVERED SUCCESSFULLY' : 'PACKET DROPPED'}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 500, fontSize: '0.75rem' }}>
                    {simulationResult.reason}
                  </span>
                </div>

                {/* Packet Header Info Cards */}
                {simulationResult.packetInfo && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '0.5rem',
                      marginBottom: '0.75rem'
                    }}
                  >
                    <div style={{ padding: '0.4rem 0.6rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Packet ID</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>#{simulationResult.packetInfo.packetId}</div>
                    </div>
                    <div style={{ padding: '0.4rem 0.6rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Source IP</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{simulationResult.packetInfo.sourceIP}</div>
                    </div>
                    <div style={{ padding: '0.4rem 0.6rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Destination IP</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{simulationResult.packetInfo.destIP}</div>
                    </div>
                    <div style={{ padding: '0.4rem 0.6rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Latency / TTL</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                        {simulationResult.stats?.latency || 0}ms / {simulationResult.stats?.ttlRemaining || 0}
                      </div>
                    </div>
                  </div>
                )}

                {/* Hop-by-Hop Trace Steps */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {(simulationResult.hops || []).map((h, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        borderLeft: h.status === 'error' ? '3px solid var(--danger)' : '3px solid var(--primary)'
                      }}
                    >
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem', minWidth: '40px' }}>
                        Hop {h.step}
                      </span>
                      <span style={{ fontWeight: 700, minWidth: '110px' }}>{h.device}</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{h.action}:</span>
                      <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{h.details}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem'
                }}
              >
                Select source and destination devices and click SEND PACKET to visualize transmission.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: ICMP Ping Terminal */}
      {activeTab === 'ping' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '1rem', gap: '1.5rem' }}>
          {/* Input Controls */}
          <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Ping From (Source)</label>
              <select
                className="input-field"
                value={pingSourceId}
                onChange={(e) => setPingSourceId(e.target.value)}
              >
                {eligibleHosts.map(n => (
                  <option key={n.id} value={n.id}>{n.data?.name || n.id} ({n.data?.ip})</option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Target Device or IP</label>
              <input
                type="text"
                className="input-field"
                placeholder="192.168.2.10 or Device Name"
                value={pingTarget}
                onChange={(e) => setPingTarget(e.target.value)}
              />
            </div>

            {/* Quick target buttons */}
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Quick Targets:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {eligibleHosts.slice(0, 4).map(h => (
                  <button
                    key={h.id}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                    onClick={() => setPingTarget(h.data?.ip || h.id)}
                  >
                    {h.data?.name || h.id}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: '0.5rem' }}
              onClick={handleRunPing}
              disabled={isPinging}
            >
              <Terminal size={14} />
              <span>{isPinging ? 'Pinging Target...' : 'RUN PING'}</span>
            </button>
          </div>

          {/* Terminal Console Output */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="terminal-console" style={{ flex: 1, minHeight: '180px' }}>
              {pingLines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Simulation History */}
      {activeTab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {simulationHistory.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.85rem' }}>
              No simulations recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {simulationHistory.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.6rem 0.85rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.78rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      className={`badge ${item.status === 'Delivered' ? 'badge-success' : 'badge-danger'}`}
                    >
                      {item.status}
                    </span>
                    <span style={{ fontWeight: 600 }}>{item.sourceDevice} ({item.sourceIP})</span>
                    <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontWeight: 600 }}>{item.destDevice} ({item.destIP})</span>
                    <span className="badge badge-primary">{item.protocol}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                    <span>{item.hopsCount} hops</span>
                    <span>{item.durationMs}ms</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimulationPanel;
