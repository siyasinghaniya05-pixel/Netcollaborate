import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Network,
  Users,
  Cpu,
  Activity,
  Send,
  BookOpen,
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Layers,
  Globe,
  Radio,
  Terminal,
  Play,
  RotateCcw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sliders,
  Laptop,
  Server,
  Monitor,
  Check,
  Zap,
  Clock,
  ExternalLink
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { LAB_TEMPLATES } from '../utils/labTemplates';

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const { loadNetwork } = useNetwork();
  const navigate = useNavigate();

  // Hero Interactive Simulation Demo State
  const [activeHop, setActiveHop] = useState(0); // 0 = idle, 1 = PC1, 2 = SW1, 3 = R1, 4 = R2, 5 = SW2, 6 = Srv1
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLog, setSimLog] = useState([
    'Topology initialized. Click "Transmit ICMP Packet" to run live forwarding engine.'
  ]);

  // NetAssist AI interactive demo question
  const [activePrompt, setActivePrompt] = useState(0);
  const aiPrompts = [
    {
      q: "Why can't my PC ping the server?",
      a: "Root Cause: Workstation-1 has IP 192.168.1.10/24 with Default Gateway 192.168.99.1. Since 192.168.99.1 is on a different subnet, Workstation-1 cannot perform ARP resolution to reach its default router interface. Fix: Change Default Gateway to 192.168.1.1."
    },
    {
      q: "Explain this packet trace hop-by-hop.",
      a: "Hop 1 (PC1): Evaluates destination 192.168.2.10 as remote, crafts ICMP frame with TTL=64.\nHop 2 (Switch1): Forwards frame via MAC table out trunk port to Router1.\nHop 3 (Router1): Decrements TTL to 63, performs Longest Prefix Match (LPM), forwards across 10.0.0.0/30 fiber link.\nHop 4 (Router2): Directly connected to 192.168.2.0/24, delivers packet to Server1."
    },
    {
      q: "Find the configuration mistake in my topology.",
      a: "Analysis: Router2 interface G0/1 is administratively DOWN, and Router2's static routing table lacks a return route back to 192.168.1.0/24. Packets reaching Server1 will be dropped because Server1 has no route back to PC1."
    }
  ];

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState(null);

  const toggleFaq = (index) => {
    setExpandedFaq(prev => (prev === index ? null : index));
  };

  // Launch a template directly into Workspace
  const handleLaunchTemplate = (template) => {
    loadNetwork({
      id: `project-${template.id}-${Date.now().toString().slice(-4)}`,
      name: template.title,
      description: template.description,
      roomId: `NET-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      nodes: template.nodes,
      edges: template.edges,
      simulationHistory: []
    });
    navigate('/workspace');
  };

  // Hero Packet Step Animation
  const runHeroSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setActiveHop(1);
    setSimLog([
      '[Hop 1] PC-1 (192.168.1.10): Crafting ICMP Echo Request. TTL=64, Subnet Mask=255.255.255.0'
    ]);

    const steps = [
      { hop: 2, log: '[Hop 2] Switch-1: Performing MAC address lookup. Forwarding frame out port G0/24 towards Default Gateway 192.168.1.1.' },
      { hop: 3, log: '[Hop 3] Router-1: Decrementing TTL to 63. LPM match found for 192.168.2.0/24. Forwarding across transit fiber to 10.0.0.2.' },
      { hop: 4, log: '[Hop 4] Router-2: Decrementing TTL to 62. Destination subnet directly connected on G0/1. Forwarding via ARP.' },
      { hop: 5, log: '[Hop 5] Switch-2: Forwarding frame out port 24 towards destination Server-1.' },
      { hop: 6, log: '[Hop 6] Server-1 (192.168.2.10): Packet Accepted! Echo Reply generated. 0.0% packet loss, RTT = 18.4ms.' }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setActiveHop(step.hop);
        setSimLog(prev => [...prev, step.log]);
        if (idx === steps.length - 1) {
          setIsSimulating(false);
        }
      }, (idx + 1) * 750);
    });
  };

  const resetHeroSimulation = () => {
    setActiveHop(0);
    setIsSimulating(false);
    setSimLog(['Topology reset to idle. Ready to simulate.']);
  };

  const faqs = [
    {
      q: 'Do I need to install Cisco Packet Tracer or specialized software?',
      a: 'No. NetCollaborate runs 100% in any modern web browser without browser plugins, virtual machine images, or installation files.'
    },
    {
      q: 'Is the packet simulation actually computing network logic or just playing animations?',
      a: 'NetCollaborate uses a deterministic educational networking engine. Every packet forwarding decision validates IPv4 addressing, performs bitwise subnet math, evaluates ARP, checks interface up/down status, and looks up static and dynamic routes via Longest Prefix Match (LPM). If a route or gateway is misconfigured, the packet drops with the exact networking error.'
    },
    {
      q: 'How does real-time collaboration work between multiple students?',
      a: 'NetCollaborate uses WebSocket communication with Socket.IO. Multiple students join the same room using a 6-character room code. When one collaborator places a device, configures an IP address, or transmits a packet, all other participants in the room observe the change and live animated packet movement synchronously.'
    },
    {
      q: 'Can instructors create lab assignments and monitor student sections?',
      a: 'Yes. NetCollaborate includes a dedicated Instructor Portal where professors can generate lab session codes, monitor active student rosters, inspect students live topologies, run automated 100-mark rubric evaluations, and export standardized academic lab reports.'
    },
    {
      q: 'Does NetCollaborate support Physical Layer digital communications?',
      a: 'Yes. In addition to Layer 2/3 IP networking, NetCollaborate includes a mathematical BFSK Digital Signal Processing (DSP) engine with continuous-phase modulation, Box-Muller Gaussian channel noise, matched-filter correlator demodulation, and empirical Bit Error Rate (BER) waterfall curves.'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Hero Section */}
      <section
        style={{
          padding: '4.5rem 1.5rem 3rem',
          maxWidth: '1240px',
          margin: '0 auto',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Brand Tagline Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: 'var(--primary)',
            fontSize: '0.82rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            marginBottom: '1.5rem'
          }}
        >
          <Sparkles size={16} />
          <span>Build Together. Simulate Smarter. Debug Collaboratively.</span>
        </div>

        {/* Master Headline */}
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5.5vw, 4.25rem)',
            fontWeight: 900,
            letterSpacing: '-0.035em',
            lineHeight: 1.15,
            marginBottom: '1.25rem',
            color: 'var(--text-primary)'
          }}
        >
          Build Networks Together.<br />
          <span
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Understand Every Packet.
          </span>
        </h1>

        {/* Supporting Description */}
        <p
          style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            maxWidth: '780px',
            lineHeight: 1.65,
            marginBottom: '2.25rem'
          }}
        >
          Design virtual networks, configure devices, simulate packet flow, and solve networking problems together in one collaborative workspace.
        </p>

        {/* Hero Call-To-Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginBottom: '3.5rem' }}>
          <button
            onClick={() => {
              if (isAuthenticated) {
                navigate('/workspace');
              } else {
                // Instant demo workspace access
                navigate('/workspace/demo');
              }
            }}
            className="btn btn-primary"
            style={{
              padding: '0.85rem 2rem',
              fontSize: '1.05rem',
              fontWeight: 700,
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
              background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)'
            }}
          >
            <Zap size={19} />
            <span>Start Building</span>
            <ArrowRight size={18} />
          </button>

          <a
            href="#templates-section"
            className="btn btn-secondary"
            style={{
              padding: '0.85rem 1.75rem',
              fontSize: '1.05rem',
              fontWeight: 600
            }}
          >
            <BookOpen size={18} color="var(--primary)" />
            <span>Explore Network Labs</span>
          </a>
        </div>

        {/* Interactive Topology Simulator Preview */}
        <div
          style={{
            width: '100%',
            maxWidth: '1060px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
            overflow: 'hidden',
            textAlign: 'left'
          }}
        >
          {/* Mock Canvas Toolbar */}
          <div
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: '8px' }}>
                Enterprise Dual-Router Interconnect — Live Simulation Preview
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={runHeroSimulation}
                disabled={isSimulating}
                style={{ fontSize: '0.75rem' }}
              >
                <Play size={13} />
                <span>{isSimulating ? 'Forwarding...' : 'Transmit ICMP Packet'}</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={resetHeroSimulation}
                style={{ fontSize: '0.75rem' }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Topology Canvas Schematic */}
          <div
            style={{
              padding: '2rem 1.5rem',
              backgroundColor: '#0a101f',
              backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              position: 'relative'
            }}
          >
            {/* PC-1 */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: activeHop === 1 ? 'rgba(59, 130, 246, 0.25)' : 'var(--bg-card)',
                border: activeHop === 1 ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                boxShadow: activeHop === 1 ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                minWidth: '110px'
              }}
            >
              <Monitor size={24} color={activeHop === 1 ? '#3b82f6' : 'var(--text-secondary)'} style={{ margin: '0 auto 4px' }} />
              <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>PC-1</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>192.168.1.10</div>
              <span className="badge badge-success" style={{ fontSize: '0.62rem', marginTop: '4px' }}>GW: 1.1</span>
            </div>

            <span style={{ color: activeHop >= 2 ? '#3b82f6' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem' }}>
              ── Ethernet ──▶
            </span>

            {/* Switch-1 */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: activeHop === 2 ? 'rgba(6, 182, 212, 0.25)' : 'var(--bg-card)',
                border: activeHop === 2 ? '2px solid #06b6d4' : '1px solid var(--border-color)',
                boxShadow: activeHop === 2 ? '0 0 20px rgba(6, 182, 212, 0.5)' : 'none',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                minWidth: '110px'
              }}
            >
              <Network size={24} color={activeHop === 2 ? '#06b6d4' : 'var(--text-secondary)'} style={{ margin: '0 auto 4px' }} />
              <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Switch-1</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>L2 FastEthernet</div>
              <span className="badge badge-primary" style={{ fontSize: '0.62rem', marginTop: '4px' }}>VLAN 10</span>
            </div>

            <span style={{ color: activeHop >= 3 ? '#3b82f6' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem' }}>
              ── Gigabit ──▶
            </span>

            {/* Router-1 */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: activeHop === 3 ? 'rgba(16, 185, 129, 0.25)' : 'var(--bg-card)',
                border: activeHop === 3 ? '2px solid #10b981' : '1px solid var(--border-color)',
                boxShadow: activeHop === 3 ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                minWidth: '110px'
              }}
            >
              <Globe size={24} color={activeHop === 3 ? '#10b981' : 'var(--text-secondary)'} style={{ margin: '0 auto 4px' }} />
              <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Router-1</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>192.168.1.1</div>
              <span className="badge badge-warning" style={{ fontSize: '0.62rem', marginTop: '4px' }}>TTL=63</span>
            </div>

            <span style={{ color: activeHop >= 4 ? '#f59e0b' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem' }}>
              ══ Fiber ══▶
            </span>

            {/* Router-2 */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: activeHop === 4 ? 'rgba(16, 185, 129, 0.25)' : 'var(--bg-card)',
                border: activeHop === 4 ? '2px solid #10b981' : '1px solid var(--border-color)',
                boxShadow: activeHop === 4 ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                minWidth: '110px'
              }}
            >
              <Globe size={24} color={activeHop === 4 ? '#10b981' : 'var(--text-secondary)'} style={{ margin: '0 auto 4px' }} />
              <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Router-2</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>10.0.0.2</div>
              <span className="badge badge-warning" style={{ fontSize: '0.62rem', marginTop: '4px' }}>TTL=62</span>
            </div>

            <span style={{ color: activeHop >= 5 ? '#3b82f6' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem' }}>
              ── Gigabit ──▶
            </span>

            {/* Switch-2 */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: activeHop === 5 ? 'rgba(6, 182, 212, 0.25)' : 'var(--bg-card)',
                border: activeHop === 5 ? '2px solid #06b6d4' : '1px solid var(--border-color)',
                boxShadow: activeHop === 5 ? '0 0 20px rgba(6, 182, 212, 0.5)' : 'none',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                minWidth: '110px'
              }}
            >
              <Network size={24} color={activeHop === 5 ? '#06b6d4' : 'var(--text-secondary)'} style={{ margin: '0 auto 4px' }} />
              <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Switch-2</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>L2 Datacenter</div>
              <span className="badge badge-primary" style={{ fontSize: '0.62rem', marginTop: '4px' }}>VLAN 20</span>
            </div>

            <span style={{ color: activeHop >= 6 ? '#10b981' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem' }}>
              ── Ethernet ──▶
            </span>

            {/* Server-1 */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: activeHop === 6 ? 'rgba(16, 185, 129, 0.25)' : 'var(--bg-card)',
                border: activeHop === 6 ? '2px solid #10b981' : '1px solid var(--border-color)',
                boxShadow: activeHop === 6 ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                minWidth: '110px'
              }}
            >
              <Server size={24} color={activeHop === 6 ? '#10b981' : 'var(--text-secondary)'} style={{ margin: '0 auto 4px' }} />
              <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Server-1</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>192.168.2.10</div>
              <span className="badge badge-success" style={{ fontSize: '0.62rem', marginTop: '4px' }}>Echo Reply</span>
            </div>
          </div>

          {/* Hop Log Terminal */}
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#070b14',
              borderTop: '1px solid var(--border-color)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: '#38bdf8',
              maxHeight: '120px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {simLog.map((line, idx) => (
              <div key={idx} style={{ color: idx === simLog.length - 1 ? '#4ade80' : 'rgba(255,255,255,0.7)' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span className="badge badge-primary" style={{ marginBottom: '0.75rem' }}>Core Capabilities</span>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.025em', marginBottom: '0.75rem' }}>
              Engineered for Real Networking Mastery
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '650px', margin: '0 auto' }}>
              A complete suite of diagnostic, simulation, and collaborative tools designed from first principles.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.75rem' }}>
            <div
              style={{
                padding: '2rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Real-Time Multiplayer Collaboration</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                Work simultaneously on live virtual network topologies with team members. See collaborator presence, dynamic cursor tracking, instant topology sync, and shared packet animation broadcast.
              </p>
            </div>

            <div
              style={{
                padding: '2rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Deterministic Packet Simulation</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                Packets are simulated through actual networking algorithms: ARP, MAC learning, CIDR subnet evaluation, Longest Prefix Match (LPM), and TTL decrement. Never faked or pre-rendered.
              </p>
            </div>

            <div
              style={{
                padding: '2rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cpu size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Intelligent Rule-Based Diagnostics</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                Detect duplicate IPs, subnet mismatches, invalid default gateways, missing routes, disabled interfaces, and loops with 1-click &ldquo;Guide Me to Fix&rdquo; automated repair workflows.
              </p>
            </div>

            <div
              style={{
                padding: '2rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Radio size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Dual-Level L2/3 + Physical FSK DSP</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                Bridge the gap between computer networks and telecommunications. Transmit binary data modulated as continuous-phase BFSK waveforms across Gaussian noise channels with matched-filter BER analysis.
              </p>
            </div>

            <div
              style={{
                padding: '2rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Instructor Portal & Academic Grading</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                Generate session codes & printable QR codes, monitor class progress in real time, auto-evaluate student submissions against a 100-mark rubric, and generate official PDF lab reports.
              </p>
            </div>

            <div
              style={{
                padding: '2rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Terminal size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Interactive CLI & Version Control</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                Configure devices using Cisco-style CLI commands (`show ip route`, `ping`, `show ip int brief`). Capture Git-like version snapshots, compare topological diffs, and revert changes effortlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Troubleshooting Mentor Preview (NetAssist) */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>Intelligent Networking Mentor</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900 }}>Meet NetAssist: Your 24/7 Lab Tutor</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              Deep educational explanations for every packet drop, configuration error, and routing anomaly.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {/* Prompt Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {aiPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePrompt(idx)}
                  className={`btn btn-sm ${activePrompt === idx ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem' }}
                >
                  <span>{item.q}</span>
                </button>
              ))}
            </div>

            {/* Answer Display */}
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '12px',
                borderLeft: '4px solid var(--primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.95rem',
                lineHeight: 1.7,
                whiteSpace: 'pre-line'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}>
                <Sparkles size={16} />
                <span>NetAssist Reasoning Analysis:</span>
              </div>
              <div style={{ color: 'var(--text-primary)' }}>
                {aiPrompts[activePrompt].a}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10 Standardized Networking Lab Templates */}
      <section id="templates-section" style={{ padding: '5rem 1.5rem', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span className="badge badge-success" style={{ marginBottom: '0.75rem' }}>Curriculum-Aligned</span>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.025em', marginBottom: '0.75rem' }}>
              10 Interactive Starter Lab Templates
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '700px', margin: '0 auto' }}>
              Pre-configured, educational topologies designed for university networking and digital communications courses. Launch any template with a single click.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {LAB_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
                onClick={() => handleLaunchTemplate(tmpl)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{tmpl.category}</span>
                    <span
                      className={`badge ${
                        tmpl.difficulty === 'Beginner' ? 'badge-success' : tmpl.difficulty === 'Intermediate' ? 'badge-warning' : 'badge-danger'
                      }`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {tmpl.difficulty} • {tmpl.duration}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {tmpl.title}
                  </h3>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    {tmpl.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {tmpl.nodes.length} Devices • {tmpl.edges.length} Links
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLaunchTemplate(tmpl);
                    }}
                    style={{ fontSize: '0.78rem' }}
                  >
                    <span>Launch Lab</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>Workflow</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900 }}>How NetCollaborate Works</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              From initial topology design to academic report submission in four streamlined steps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '0.5rem' }}>01</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Design & Connect</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Drag and drop PCs, routers, switches, and firewalls onto the interactive canvas. Link devices with Ethernet or fiber optic cables.
              </p>
            </div>

            <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#06b6d4', marginBottom: '0.5rem' }}>02</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Configure Devices</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Assign IPv4 addresses, subnet masks, default gateways, static routes, and VLANs via the GUI or the interactive Cisco-style CLI terminal.
              </p>
            </div>

            <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', marginBottom: '0.5rem' }}>03</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Simulate & Trace</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Transmit ICMP, HTTP, or FSK packets. Watch packets travel hop-by-hop across the canvas with live routing and TTL evaluations.
              </p>
            </div>

            <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#8b5cf6', marginBottom: '0.5rem' }}>04</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Diagnose & Report</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Run automated health diagnostics, apply 1-click Quick Fixes, collaborate with peers, and export an official PDF lab report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Student vs Instructor Value Proposition */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900 }}>Built for Both Learners and Faculty</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
            <div style={{ padding: '2rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3b82f6', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Monitor size={22} />
                <span>For Students & CCNA Learners</span>
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> No software installation or terminal setup required</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Collaborate on group lab assignments in real time</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Clear visual explanations of why pings fail</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Practice 10 standardized university networking templates</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Generate official PDF lab reports with 1 click</li>
              </ul>
            </div>

            <div style={{ padding: '2rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#8b5cf6', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={22} />
                <span>For College Faculty & Instructors</span>
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Instant session codes and projected QR codes for class access</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Live 50-student roster monitoring across college LAN</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Inspect any student workspace live in view-only mode</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Automated 100-mark rubric grading on topology & routing</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="#10b981" /> Aggregate class pass rates and average performance metrics</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions (FAQ) */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>FAQ</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900 }}>Frequently Asked Questions</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden'
                }}
              >
                <div
                  onClick={() => toggleFaq(idx)}
                  style={{
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {faq.q}
                  </span>
                  {expandedFaq === idx ? <ChevronUp size={18} color="var(--primary)" /> : <ChevronDown size={18} />}
                </div>

                {expandedFaq === idx && (
                  <div
                    style={{
                      padding: '0 1.5rem 1.25rem',
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.65,
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '0.85rem'
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section style={{ padding: '5rem 1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '750px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '1rem' }}>
            Ready to Build and Simulate Networks?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
            Join thousands of engineering students and instructors mastering computer networking together.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/workspace/demo"
              className="btn btn-primary"
              style={{
                padding: '0.85rem 2rem',
                fontSize: '1.05rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)'
              }}
            >
              <span>Launch Simulator Workspace</span>
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="btn btn-secondary"
              style={{
                padding: '0.85rem 1.75rem',
                fontSize: '1.05rem'
              }}
            >
              <span>Sign In / Demo Accounts</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: '2.5rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-muted)',
          fontSize: '0.82rem'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Network size={14} />
            </div>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>NetCollaborate</span>
            <span>— Real-Time Collaborative Network Simulation & Troubleshooting Platform</span>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/workspace/demo" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Simulator</Link>
            <Link to="/fsk-lab" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>FSK Lab</Link>
            <Link to="/instructor/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Instructor Portal</Link>
            <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Sign In</Link>
          </div>
        </div>
        <div style={{ maxWidth: '1200px', margin: '1rem auto 0', textAlign: 'center', fontSize: '0.75rem' }}>
          NetCollaborate © 2026. Built for college networking laboratories, CCNA learners, and software engineering students.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
