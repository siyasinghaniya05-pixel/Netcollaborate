import React from 'react';
import { Link } from 'react-router-dom';
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
  Layers
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: Users,
      title: 'Real-Time Collaboration',
      desc: 'Work on virtual network topologies simultaneously with your teammates. See live cursors, device placements, and synchronized packet animations.'
    },
    {
      icon: Send,
      title: 'Packet & Ping Simulation',
      desc: 'Send ICMP, HTTP, TCP, or DNS packets across subnets and watch them travel hop-by-hop through switches and routers with live path animations.'
    },
    {
      icon: Cpu,
      title: 'Smart Diagnostic Debugger',
      desc: 'Automatically detect IP conflicts, invalid subnet masks, missing static routes, disconnected devices, and switch loops with 1-click Quick Fixes.'
    },
    {
      icon: Activity,
      title: 'Network Health & Analytics',
      desc: 'Evaluate your network with an automated health score algorithm (0-100%) and view comprehensive topological and packet transmission metrics.'
    },
    {
      icon: BookOpen,
      title: 'Interactive Learning Mode',
      desc: 'Deepen your knowledge of computer networking concepts, OSI layers, routing tables, and subnetting with an integrated educational glossary.'
    },
    {
      icon: Award,
      title: 'Networking Quiz Challenge',
      desc: 'Test your understanding with real-world networking scenarios, instant feedback, scoring, and progress tracking.'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Hero Section */}
      <section
        style={{
          padding: '5rem 1.5rem 3.5rem',
          maxWidth: '1100px',
          margin: '0 auto',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '1.5rem'
          }}
        >
          <Sparkles size={15} />
          <span>Next-Generation Virtual Network Simulator & Whiteboard</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: '1.25rem'
          }}
        >
          Build Networks. Collaborate.<br />
          <span style={{ color: 'var(--primary)', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Simulate & Debug in Real Time.
          </span>
        </h1>

        <p
          style={{
            fontSize: '1.15rem',
            color: 'var(--text-secondary)',
            maxWidth: '700px',
            lineHeight: 1.6,
            marginBottom: '2rem'
          }}
        >
          Learn computer networking concepts by designing, configuring, testing, and troubleshooting virtual networks together with classmates and engineers.
        </p>

        {/* Hero CTA Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              <span>Go to Dashboard</span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
                <span>Start Building Free</span>
                <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
                <Network size={18} color="var(--primary)" />
                <span>Sign In to Laboratory</span>
              </Link>
            </>
          )}
        </div>

        {/* Interactive Topology Mockup Preview */}
        <div
          style={{
            marginTop: '3.5rem',
            width: '100%',
            maxWidth: '960px',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.4)',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '8px' }}>
                Campus Network Simulation — PC1 → Switch1 → Router1 → Router2 → Server1
              </span>
            </div>
            <span className="badge badge-success">Health: 100% (Perfect)</span>
          </div>

          <div
            style={{
              padding: '1.5rem',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              flexWrap: 'wrap',
              gap: '1rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem'
            }}
          >
            <div style={{ padding: '0.6rem 1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--primary)', textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>PC1</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>192.168.1.10</div>
            </div>
            <span style={{ color: 'var(--primary)' }}>── Ethernet ──</span>
            <div style={{ padding: '0.6rem 1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>Switch1</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>VLAN 10</div>
            </div>
            <span style={{ color: 'var(--primary)' }}>── Gigabit ──</span>
            <div style={{ padding: '0.6rem 1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>Router1</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>192.168.1.1</div>
            </div>
            <span style={{ color: '#f59e0b' }}>══ Fiber ══</span>
            <div style={{ padding: '0.6rem 1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>Router2</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>10.0.0.2</div>
            </div>
            <span style={{ color: 'var(--primary)' }}>── Gigabit ──</span>
            <div style={{ padding: '0.6rem 1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--success)', textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>Server1</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>192.168.2.10</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section style={{ padding: '4rem 1.5rem', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              Everything You Need to Master Networking
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              Designed from the ground up for modern engineering students, professors, and devops teams.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {features.map((f, idx) => {
              const IconComp = f.icon;
              return (
                <div
                  key={idx}
                  style={{
                    padding: '1.75rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <IconComp size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{f.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2rem 1.5rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        NetCollaborate © 2026 — Real-Time Collaborative Virtual Network Simulator
      </footer>
    </div>
  );
};

export default Landing;
