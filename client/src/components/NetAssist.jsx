import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Wrench, RefreshCw, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { networkAPI } from '../services/api';

const SUGGESTIONS = [
  'Why is my BER high?',
  'Explain BFSK modulation',
  'How do f0 and f1 affect bandwidth?',
  'Diagnose my network'
];

const NetAssist = () => {
  const { network, nodes, edges, applyQuickFix, runDiagnostics } = useNetwork();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const addMessage = (msg) => setMessages((prev) => [...prev, msg]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Local fallback answer when the backend is unreachable or for modulation questions
  const localDiagnose = (question = '') => {
    const q = question.toLowerCase();

    // Digital Comms & FSK Reasoning
    if (q.includes('ber') || q.includes('bit error') || q.includes('error rate')) {
      return {
        answer: 'Your Bit Error Rate (BER) depends on Signal-to-Noise Ratio (SNR) and frequency separation.',
        points: [
          '• High Channel Noise: If noise > 25%, Gaussian noise perturbations cause received signal voltage to breach the matched filter decision boundary.',
          '• Frequency Separation: When |f1 - f0| is too small, correlation energy leakage occurs between the mark and space filters.',
          '• Attenuation: High channel attenuation lowers received carrier power, shrinking the SNR.',
          '💡 Recommendation: Decrease channel noise to < 10% or increase frequency separation (|f1 - f0| >= 1000 Hz) to restore 0% BER.'
        ],
        actions: []
      };
    }

    if (q.includes('fsk') || q.includes('modulation') || q.includes('carrier') || q.includes('bfsk')) {
      return {
        answer: 'Binary Frequency Shift Keying (BFSK) is a digital modulation technique.',
        points: [
          '• Bit 0 (Space) is transmitted using carrier frequency f0 (e.g. 1000 Hz).',
          '• Bit 1 (Mark) is transmitted using carrier frequency f1 (e.g. 2000 Hz).',
          '• In Continuous Phase FSK (CPFSK), the carrier waveform phase remains continuous at bit transitions to limit spectral splatter.',
          '• The receiver uses quadrature matched filters: I_k = ∫ r(t)*cos(2π*f_k*t)dt and Q_k = ∫ r(t)*sin(2π*f_k*t)dt, deciding bit 1 if E1 > E0.'
        ],
        actions: []
      };
    }

    if (q.includes('bandwidth') || q.includes('carson')) {
      return {
        answer: "Transmission Bandwidth in BFSK follows Carson's Rule:",
        points: [
          '• Formula: B = |f1 - f0| + 2 * (1 / Tb), where Tb is the bit duration.',
          '• For f0 = 1000 Hz, f1 = 2000 Hz, and Tb = 1.0 ms: Bandwidth = 1000 + 2000 = 3000 Hz (3.0 kHz).',
          '• Widening frequency separation improves noise immunity but requires wider channel bandwidth.'
        ],
        actions: []
      };
    }

    // Network Topology Diagnosis
    const issues = [];
    const connected = new Set();
    edges.forEach((e) => {
      if (e.source) connected.add(e.source);
      if (e.target) connected.add(e.target);
    });
    nodes.forEach((n) => {
      if (!connected.has(n.id)) {
        issues.push(`⚠ ${n.data?.name || n.id} is disconnected — connect it to a switch or router.`);
      }
    });
    const ipSeen = {};
    nodes.forEach((n) => {
      const ip = n.data?.ip;
      if (ip) {
        if (ipSeen[ip]) issues.push(`✗ Duplicate IP ${ip} on ${n.data?.name}.`);
        ipSeen[ip] = true;
      }
    });
    return {
      answer: issues.length
        ? `I found ${issues.length} issue(s) in your network.`
        : `Your network and communication topology are healthy. No critical issues detected!`,
      points: issues.slice(0, 6),
      actions: []
    };
  };

  const ask = async (text) => {
    const question = (text || '').trim();
    if (!question || loading) return;
    addMessage({ role: 'user', text: question });
    setInput('');
    setLoading(true);

    let result = null;
    try {
      const networkId = network?.id || network?._id || 'demo-enterprise-network';
      const res = await networkAPI.assist(networkId, { nodes, edges, question });
      if (res.data?.success) result = res.data.data;
    } catch (err) {
      console.warn('NetAssist backend unavailable, using local diagnosis:', err.message);
    }

    if (!result) result = localDiagnose();

    addMessage({ role: 'assist', ...result });
    setLoading(false);
  };

  const handleQuickFix = (action) => {
    applyQuickFix(action);
    addMessage({ role: 'assist', text: 'Applying quick fix… diagnostics will refresh automatically.' });
    setTimeout(() => runDiagnostics && runDiagnostics(), 150);
  };

  const renderPoints = (points = []) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
      {points.map((p, i) => (
        <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
          {p}
        </div>
      ))}
    </div>
  );

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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-tertiary)'
        }}
      >
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Bot size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            NetAssist <Sparkles size={12} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            AI Network Troubleshooter · Rule-based engine
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <span className="badge badge-success">● Online</span>
        </div>
      </div>

      {/* Chat scroll area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.length === 0 && (
          <div
            style={{
              padding: '1.25rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem'
            }}
          >
            <Bot size={26} color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>How can I help with your network?</div>
            <div style={{ marginTop: '4px' }}>Ask me to diagnose problems, explain devices, or troubleshoot connectivity.</div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', marginTop: '0.9rem' }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn btn-secondary btn-sm" onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={() => ask('Why can\u2019t devices communicate?')}>
                Why can’t devices communicate?
              </button>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            {m.role === 'assist' ? (
              <div
                style={{
                  maxWidth: '85%',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 0.9rem',
                  fontSize: '0.8rem',
                  lineHeight: 1.5
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Bot size={14} color="var(--primary)" />
                  <span style={{ fontWeight: 700, fontSize: '0.72rem' }}>NetAssist</span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{m.text || m.answer}</div>
                {renderPoints(m.points)}

                {m.actions && m.actions.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
                    {m.actions.map((action, ai) => (
                      <button key={ai} className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem' }} onClick={() => handleQuickFix(action)}>
                        <Wrench size={13} /> Suggest Fix
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  maxWidth: '85%',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.6rem 0.9rem',
                  fontSize: '0.8rem'
                }}
              >
                {m.text}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <Loader size={14} className="spin" /> NetAssist is analyzing your network…
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ padding: '0.6rem 0.8rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
        <input
          className="input-field"
          placeholder="Ask about your network… e.g. Why can't PC-01 reach Server-01?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(input)}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={() => ask(input)} disabled={loading || !input.trim()}>
          <Send size={16} />
        </button>
        <button className="btn btn-secondary" title="Run fresh diagnostics" onClick={() => { runDiagnostics && runDiagnostics(); addMessage({ role: 'assist', text: 'Ran a fresh diagnostics pass on the network.' }); }} disabled={loading}>
          <RefreshCw size={16} />
        </button>
      </div>
    </div>
  );
};

export default NetAssist;
