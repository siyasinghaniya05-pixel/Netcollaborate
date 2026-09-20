import React, { useEffect, useRef, useState } from 'react';
import {
  Layers,
  Play,
  Pause,
  SkipForward,
  Package
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';

const LAYERS = [
  { n: 7, name: 'Application', pdu: 'Data', desc: 'Network services directly used by applications (HTTP, DNS, SMTP, DHCP).', examples: 'HTTP · DNS · SMTP' },
  { n: 6, name: 'Presentation', pdu: 'Data', desc: 'Encoding, encryption and translation of data for the application layer.', examples: 'TLS · JPEG · ASCII' },
  { n: 5, name: 'Session', pdu: 'Data', desc: 'Establishes, manages and terminates communication sessions.', examples: 'RPC · NetBIOS' },
  { n: 4, name: 'Transport', pdu: 'Segment', desc: 'End-to-end delivery, reliability, flow control and port-based multiplexing.', examples: 'TCP · UDP' },
  { n: 3, name: 'Network', pdu: 'Packet', desc: 'Logical addressing (IP) and routing packets across networks.', examples: 'IP · ICMP · OSPF' },
  { n: 2, name: 'Data Link', pdu: 'Frame', desc: 'Physical addressing (MAC), VLANs and switching within a subnet.', examples: 'Ethernet · Wi-Fi' },
  { n: 1, name: 'Physical', pdu: 'Bits', desc: 'Transmission of raw bits over the wire, fiber or radio.', examples: 'Fiber · Copper · RF' }
];

function actionToLayer(action) {
  const a = String(action || '').toLowerCase();

  if (/(l2|frame|mac|switch|vlan)/.test(a)) return 2;
  if (/(crafting|subnet|routing|route|forward|packet|ip\b|icmp|ttl|gateway|nexthop|next.hop|lookup|deliver|arp|broadcast|unicast|firewall)/.test(a)) return 3;
  if (/(tcp|udp|segment|port|syn|ack|transport)/.test(a)) return 4;
  if (/(tls|ssl|encrypt|present)/.test(a)) return 6;
  if (/(session|handshake|establish|negotiat)/.test(a)) return 5;
  if (/(applicat|http|dns|ftp|smtp|dhcp|payload|request|response)/.test(a)) return 7;
  if (/(link|signal|physical|fiber|copper|bit|electric)/.test(a)) return 1;

  return 3; // default to Network layer for generic forwarding events
}

const OSIPanel = () => {
  const { simulationResult, isSimulating, setActiveNodeId } = useNetwork();

  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  const hops = simulationResult?.hops || [];
  const currentHop = hops[step];

  useEffect(() => {
    if (!isSimulating) {
      setPlaying(false);
      return;
    }
    setStep(0);
    setPlaying(true);
  }, [simulationResult, isSimulating]);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setStep((s) => {
        if (s >= hops.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 850);

    return () => clearInterval(timerRef.current);
  }, [playing, hops.length]);

  useEffect(() => {
    if (currentHop) setActiveNodeId(currentHop.id === 'Destination' ? null : currentHop.id);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeLayer = currentHop ? actionToLayer(currentHop.action) : null;
  const activeDesc = LAYERS.find((l) => l.n === activeLayer) || null;

  const jumpTo = (i) => {
    setStep(i);
    setPlaying(false);
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: OSI Layer Stack */}
      <div
        style={{
          width: '340px',
          padding: '0.9rem',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
          <Layers size={15} color="var(--primary)" /> OSI LAYER MODEL
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              title={playing ? 'Pause' : 'Play'}
              onClick={() => setPlaying(!playing)}
              disabled={hops.length === 0}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              title="Next hop"
              onClick={() => step < hops.length - 1 && setStep(step + 1)}
              disabled={hops.length === 0}
            >
              <SkipForward size={14} />
            </button>
          </div>
        </div>

        {/* Layer stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {LAYERS.map((layer) => {
            const isActive = layer.n === activeLayer;
            return (
              <div
                key={layer.n}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.45rem 0.7rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isActive ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid ' + (isActive ? 'var(--primary)' : 'var(--border-color)'),
                  fontSize: '0.75rem',
                  transition: 'all 0.2s ease',
                  cursor: 'default'
                }}
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)'
                  }}
                >
                  {layer.n}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{layer.name}</div>
                  <div style={{ fontSize: '0.62rem', opacity: isActive ? 0.85 : 0.7 }}>PDU: {layer.pdu}</div>
                </div>
                <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>{layer.examples}</span>
                {isActive && <Package size={14} className="spin" />}
              </div>
            );
          })}
        </div>

        {/* Active layer detail */}
        <div
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            padding: '0.6rem 0.7rem',
            fontSize: '0.72rem',
            minHeight: '96px'
          }}
        >
          {activeDesc && currentHop ? (
            <>
              <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.3rem' }}>
                Layer {activeDesc.n} — {activeDesc.name}
              </div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{activeDesc.desc}</div>
              <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Current hop: </span>
                <span style={{ fontWeight: 600 }}>{currentHop.action}</span> — {currentHop.device}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {hops.length === 0
                ? 'Run a packet simulation to see which OSI layer each forwarding decision belongs to.'
                : 'The current hop is highlighted. Watch the packet move through the layers as it travels.'}
            </div>
          )}
        </div>
      </div>

      {/* Right: Packet journey synced with layers */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.9rem', overflow: 'hidden' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.6rem' }}>
          PACKET JOURNEY
          {simulationResult && (
            <span
              className={`badge ${simulationResult.success ? 'badge-success' : 'badge-danger'}`}
              style={{ fontSize: '0.62rem' }}
            >
              {simulationResult.success ? 'Delivered' : simulationResult.reason || 'Dropped'}
            </span>
          )}
        </div>

        {hops.length === 0 ? (
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
            <Layers size={16} /> No packet journey yet. Use Simulation &gt; Send Packet.
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {hops.map((h, i) => {
              const layer = actionToLayer(h.action);
              const isCurrent = i === step;
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
                  <span style={{ fontWeight: 700, minWidth: '26px', color: 'var(--text-muted)' }}>{i + 1}</span>
                  <span
                    className="badge"
                    style={{
                      minWidth: '30px',
                      textAlign: 'center',
                      backgroundColor: isCurrent ? 'var(--primary)' : 'var(--bg-secondary)',
                      color: isCurrent ? '#fff' : 'var(--primary)',
                      border: '1px solid var(--primary)',
                      fontSize: '0.62rem'
                    }}
                  >
                    L{layer}
                  </span>
                  <span style={{ fontWeight: 700, minWidth: '130px' }}>{h.device}</span>
                  <span style={{ color: 'var(--primary)' }}>{h.action}:</span>
                  <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.details}
                  </span>
                  {h.status === 'error' && <span className="badge badge-danger">Error</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OSIPanel;