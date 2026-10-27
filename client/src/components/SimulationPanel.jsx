import React, { useState } from 'react';
import {
  Send,
  Terminal,
  History,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Layers,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Route,
  Radio,
  Zap,
  Activity,
  ExternalLink
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { networkAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import TraceroutePanel from './TraceroutePanel';
import { runFskPipeline, parseBits, textToBits } from '../utils/fskModulation';

const SimulationPanel = ({ onClose }) => {
  const {
    network,
    nodes,
    edges,
    playSimulationAnimation,
    pauseSimulation,
    resumeSimulation,
    stepSimulationForward,
    resetSimulation,
    isSimulationPaused,
    activeStepIndex,
    simulationResult,
    isSimulating,
    simulationHistory,
    setSimulationHistory
  } = useNetwork();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('packet'); // 'packet' | 'fsk' | 'ping' | 'history' | 'traceroute'
  const [selectedHop, setSelectedHop] = useState(null);
  const [showOsiOverlay, setShowOsiOverlay] = useState(false);

  // Packet Simulator State
  const [sourceId, setSourceId] = useState(nodes[0]?.id || '');
  const [destId, setDestId] = useState(nodes[nodes.length - 1]?.id || '');
  const [protocol, setProtocol] = useState('ICMP');
  const [ttl, setTtl] = useState(64);
  const [packetLoading, setPacketLoading] = useState(false);

  // FSK Integrated State
  const [fskBits, setFskBits] = useState('10110010');
  const [fskF0, setFskF0] = useState(1000);
  const [fskF1, setFskF1] = useState(2000);
  const [fskNoise, setFskNoise] = useState(5);
  const [fskResult, setFskResult] = useState(null);
  const [fskLoading, setFskLoading] = useState(false);

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

  // Handle Dual-Level FSK Simulation (Network Layer 3 Routing + Physical Layer 1 BFSK Modulation)
  const handleSendFsk = async () => {
    if (!sourceId || !destId) return;
    setFskLoading(true);

    try {
      // 1. Execute Network Level Packet Journey across topology
      const res = await networkAPI.simulate(network.id || network._id, {
        nodes,
        edges,
        sourceId,
        destId,
        protocol: 'FSK-DATA',
        ttl
      });

      // 2. Execute Physical Signal Level Modulation & Demodulation
      const bits = parseBits(fskBits);
      const dspResult = runFskPipeline(bits, {
        f0: fskF0,
        f1: fskF1,
        bitDuration: 0.001,
        noisePercent: fskNoise
      });

      setFskResult(dspResult);

      if (res.data?.success) {
        const simData = res.data.data;
        playSimulationAnimation(simData);

        const sNode = nodes.find(n => n.id === sourceId);
        const dNode = nodes.find(n => n.id === destId);

        const historyEntry = {
          id: 'fsk-' + Date.now(),
          timestamp: new Date(),
          sourceDevice: sNode?.data?.name || sourceId,
          destDevice: dNode?.data?.name || destId,
          protocol: 'BFSK Digital Data',
          status: dspResult.errors === 0 ? 'Delivered (0% BER)' : `Corrupted (${dspResult.berPercent}% BER)`,
          durationMs: simData.stats?.latency || 18,
          hopsCount: simData.hops?.length || 0,
          reason: `BFSK Modulated Data (${fskBits}) transmitted at f0=${fskF0}Hz, f1=${fskF1}Hz, Noise=${fskNoise}%`
        };

        setSimulationHistory(prev => [historyEntry, ...prev.slice(0, 40)]);

        // Broadcast to collaborators
        const socket = getSocket();
        socket.emit('simulate-broadcast', {
          roomId: network.roomId,
          simResult: simData,
          sourceName: historyEntry.sourceDevice,
          destName: historyEntry.destDevice,
          user,
          fskData: {
            bits: fskBits,
            berPercent: dspResult.berPercent,
            status: dspResult.status
          }
        });
      }
    } catch (err) {
      console.warn('FSK Simulation error:', err.message);
    } finally {
      setFskLoading(false);
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
          onClick={() => setActiveTab('fsk')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: activeTab === 'fsk' ? '#38bdf8' : 'var(--text-secondary)'
          }}
        >
          <Radio size={14} color={activeTab === 'fsk' ? '#38bdf8' : 'currentColor'} /> FSK Digital Comms
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

        <button
          onClick={() => setActiveTab('traceroute')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: activeTab === 'traceroute' ? 'var(--primary)' : 'var(--text-secondary)'
          }}
        >
          <Route size={14} /> Traceroute
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
                    marginBottom: '0.5rem'
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
                      marginBottom: '0.5rem'
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

                {/* Interactive Playback Controls Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.75rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {isSimulating && !isSimulationPaused ? (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                        onClick={pauseSimulation}
                        title="Pause Packet Simulation"
                      >
                        <Pause size={13} /> Pause
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                        onClick={() => {
                          if (isSimulationPaused) {
                            resumeSimulation();
                          } else {
                            playSimulationAnimation(simulationResult);
                          }
                        }}
                        title="Play or Resume Packet Simulation"
                      >
                        <Play size={13} /> {isSimulationPaused ? 'Resume' : 'Replay'}
                      </button>
                    )}

                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                      onClick={stepSimulationForward}
                      title="Step Forward One Hop"
                    >
                      <SkipForward size={13} /> Step
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                      onClick={resetSimulation}
                      title="Reset Packet Movement"
                    >
                      <RotateCcw size={13} /> Reset
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Current Step:{' '}
                      <strong style={{ color: 'var(--primary)' }}>
                        {activeStepIndex >= 0 ? activeStepIndex + 1 : '-'} / {(simulationResult.animationSteps || []).length}
                      </strong>
                    </span>

                    <button
                      onClick={() => setShowOsiOverlay(!showOsiOverlay)}
                      style={{
                        background: showOsiOverlay ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                        border: '1px solid var(--border-color)',
                        color: showOsiOverlay ? 'var(--primary)' : 'var(--text-secondary)',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600
                      }}
                    >
                      <Layers size={13} /> OSI Model
                    </button>
                  </div>
                </div>

                {/* OSI Model Overlay (Collapsible) */}
                {showOsiOverlay && (
                  <div
                    style={{
                      padding: '0.6rem 0.8rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #3b82f6',
                      marginBottom: '0.5rem',
                      fontSize: '0.72rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: '#38bdf8' }}>OSI 7-Layer Protocol Stack Breakdown</strong>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Active Layers in this Transmission</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: protocol === 'HTTP' || protocol === 'DNS' ? 1 : 0.6 }}>
                        <span style={{ minWidth: '60px', fontWeight: 700, color: '#ec4899' }}>Layer 7</span>
                        <strong>Application:</strong>
                        <span>{protocol === 'HTTP' ? 'HTTP Web request GET / index.html' : protocol === 'DNS' ? 'DNS Name Query' : 'ICMP Echo payload generation'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: protocol === 'TCP' ? 1 : 0.6 }}>
                        <span style={{ minWidth: '60px', fontWeight: 700, color: '#8b5cf6' }}>Layer 4</span>
                        <strong>Transport:</strong>
                        <span>{protocol === 'TCP' ? 'TCP SYN Flag, Port Negotiation' : 'ICMP Echo Protocol Type 8'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}>
                        <span style={{ minWidth: '60px', fontWeight: 700 }}>Layer 3</span>
                        <strong>Network:</strong>
                        <span>IPv4 Header ({simulationResult.packetInfo?.sourceIP} → {simulationResult.packetInfo?.destIP}), Route LPM Lookup, TTL Decrement</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#06b6d4' }}>
                        <span style={{ minWidth: '60px', fontWeight: 700 }}>Layer 2</span>
                        <strong>Data Link:</strong>
                        <span>Ethernet II Frame, MAC Address Resolution (ARP), 802.1Q VLAN Tags, Switch MAC Table Lookup</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
                        <span style={{ minWidth: '60px', fontWeight: 700 }}>Layer 1</span>
                        <strong>Physical:</strong>
                        <span>Bitstream signaling across twisted-pair Ethernet / BFSK modulation across physical links</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hop Details Inspector Card if hop is selected */}
                {selectedHop && (
                  <div
                    style={{
                      padding: '0.6rem 0.85rem',
                      backgroundColor: 'rgba(30, 41, 59, 0.95)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--primary)',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                          Hop #{selectedHop.step} Inspector
                        </span>
                        <strong style={{ fontSize: '0.8rem', color: '#ffffff' }}>{selectedHop.device}</strong>
                      </div>
                      <button
                        onClick={() => setSelectedHop(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.72rem' }}
                      >
                        ✕ Close
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '0.72rem', marginTop: '2px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Action: </span>
                        <strong style={{ color: 'var(--primary)' }}>{selectedHop.action}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>In/Out Port: </span>
                        <span>{selectedHop.incomingInterface || 'Auto'} → {selectedHop.outgoingInterface || 'Egress'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Routing Decision: </span>
                        <span>{selectedHop.details}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px', marginTop: '2px' }}>
                      <strong style={{ color: '#38bdf8' }}>Networking Engine Decision: </strong>
                      {selectedHop.action.toLowerCase().includes('route')
                        ? `Router inspected packet IPv4 destination ${simulationResult.packetInfo?.destIP}, matched the longest prefix route (/24) in the FIB table, decremented TTL to prevent loops, and queued packet onto next hop interface.`
                        : selectedHop.action.toLowerCase().includes('switch')
                        ? `Switch received Ethernet frame, looked up destination MAC in its CAM table, and forwarded frame to designated physical interface without modifying Layer 3 IP addressing.`
                        : selectedHop.action.toLowerCase().includes('arp')
                        ? `ARP Cache resolution: Host looked up destination hardware MAC address for default gateway to construct the Layer 2 Ethernet frame.`
                        : `Device processed packet event: ${selectedHop.details}`}
                    </div>
                  </div>
                )}

                {/* Hop-by-Hop Trace Steps (Clickable) */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {(simulationResult.hops || []).map((h, i) => {
                    const isSelected = selectedHop?.step === h.step;
                    const isStepActive = activeStepIndex === i;

                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedHop(h)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          cursor: 'pointer',
                          borderLeft: h.status === 'error' ? '3px solid var(--danger)' : isStepActive ? '3px solid var(--warning)' : isSelected ? '3px solid var(--primary)' : '3px solid #334155',
                          border: isSelected ? '1px solid var(--primary)' : undefined,
                          transition: 'all 0.15s ease'
                        }}
                        title="Click to inspect hop forwarding decision and OSI layers"
                      >
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem', minWidth: '40px' }}>
                          Hop {h.step}
                        </span>
                        <span style={{ fontWeight: 700, minWidth: '100px' }}>{h.device}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{h.action}:</span>
                        <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.details}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--primary)', opacity: 0.8 }}>
                          Inspect →
                        </span>
                      </div>
                    );
                  })}
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

      {/* Tab: FSK Integrated Digital Communication */}
      {activeTab === 'fsk' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '1rem', gap: '1.5rem' }}>
          {/* Controls */}
          <div style={{ width: '330px', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
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

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Binary Data Payload</label>
              <input
                type="text"
                className="input-field"
                value={fskBits}
                onChange={(e) => setFskBits(e.target.value.replace(/[^01]/g, ''))}
                placeholder="10110010"
                style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="input-label">f0 (Bit 0)</label>
                <input
                  type="number"
                  className="input-field"
                  value={fskF0}
                  onChange={(e) => setFskF0(Number(e.target.value))}
                />
              </div>

              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="input-label">f1 (Bit 1)</label>
                <input
                  type="number"
                  className="input-field"
                  value={fskF1}
                  onChange={(e) => setFskF1(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <label className="input-label" style={{ marginBottom: 0 }}>Channel Noise</label>
                <span style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 700 }}>{fskNoise}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={fskNoise}
                onChange={(e) => setFskNoise(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#f59e0b' }}
              />
            </div>

            <button
              className="btn btn-primary"
              style={{
                marginTop: '0.3rem',
                background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                border: 'none'
              }}
              onClick={handleSendFsk}
              disabled={fskLoading || isSimulating}
            >
              <Radio size={16} />
              <span>{fskLoading ? 'Modulating & Transmitting...' : isSimulating ? 'Animating Across Network...' : 'TRANSMIT FSK SIGNAL'}</span>
            </button>
          </div>

          {/* Dual-Level Visualization (Network Level + Signal Level) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            {fskResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Level 1: Network Hop Journey Summary */}
                <div style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>LEVEL 1 (NETWORK):</span>
                    <span>{eligibleHosts.find(n => n.id === sourceId)?.data?.name || sourceId}</span>
                    <ArrowRight size={14} color="var(--text-muted)" />
                    <span>Routing Hops</span>
                    <ArrowRight size={14} color="var(--text-muted)" />
                    <span>{eligibleHosts.find(n => n.id === destId)?.data?.name || destId}</span>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    backgroundColor: fskResult.errors === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: fskResult.errors === 0 ? '#10b981' : '#ef4444'
                  }}>
                    {fskResult.errors === 0 ? 'SUCCESS • 0% BER' : `CORRUPTED • ${fskResult.berPercent}% BER`}
                  </span>
                </div>

                {/* Level 2: Signal Waveform & Demodulated Bits */}
                <div style={{
                  backgroundColor: '#0a0f1d',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid #1e293b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399' }}>
                      LEVEL 2 (PHYSICAL FSK SIGNAL & CORRELATOR DEMODULATION)
                    </span>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem' }}>
                      <span style={{ color: '#38bdf8' }}>SNR: {fskResult.snrDb} dB</span>
                      <span style={{ color: '#f59e0b' }}>Bandwidth: {fskResult.bandwidthKhz} kHz</span>
                    </div>
                  </div>

                  {/* SVG Waveform Trace */}
                  <div style={{ height: '70px', width: '100%', position: 'relative' }}>
                    <svg viewBox="0 0 700 60" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      <polyline
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="1.8"
                        points={fskResult.fskSignal?.slice(0, 400).map((v, i) => `${(i / 400) * 700},${30 - v * 24}`).join(' ')}
                      />
                    </svg>
                  </div>

                  {/* Transmitted vs Received Bits Table */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '90px' }}>Transmitted:</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {fskResult.bits?.map((b, i) => (
                          <span key={i} style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(56, 189, 248, 0.2)',
                            color: '#38bdf8',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            fontWeight: 700
                          }}>
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '90px' }}>Recovered:</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {fskResult.rxBits?.map((b, i) => {
                          const isErr = fskResult.errorPositions?.includes(i);
                          return (
                            <span key={i} style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              backgroundColor: isErr ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                              color: isErr ? '#ef4444' : '#10b981',
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                              fontWeight: 700
                            }}>
                              {b}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic Observation */}
                {fskResult.observations && (
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: '6px' }}>
                    💡 <strong>Physical Channel Impact:</strong> {fskResult.observations[0]}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                gap: '8px'
              }}>
                <Radio size={32} color="var(--text-muted)" />
                <span>Select Source, Destination and click <strong>TRANSMIT FSK SIGNAL</strong></span>
                <span style={{ fontSize: '0.76rem' }}>Simulates simultaneous Layer 2/3 packet routing and Layer 1 physical FSK modulation!</span>
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

      {/* Tab 4: Traceroute */}
      {activeTab === 'traceroute' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          <TraceroutePanel />
        </div>
      )}
    </div>
  );
};

export default SimulationPanel;
