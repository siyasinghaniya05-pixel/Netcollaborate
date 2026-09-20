import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Award,
  ChevronRight,
  RotateCcw,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CHALLENGES = [
  {
    id: 'det-01',
    title: 'The Ghost Frequency: FSK Demodulator Mismatch',
    difficulty: 'Intermediate',
    category: 'Digital Communication',
    description: 'PC-01 is transmitting binary telemetry at f0 = 1000 Hz and f1 = 2000 Hz. However, the destination demodulator on PC-02 reports a devastating 50% BER because its correlation filter was misconfigured.',
    symptom: 'Transmitted "10110010" produces BER = 50.0% with zero channel noise!',
    misconfigType: 'fsk_rx_mismatch',
    options: [
      { label: 'Set Rx f0 to 1000 Hz and Rx f1 to 2000 Hz (Match Transmitter)', correct: true },
      { label: 'Double the transmitter carrier amplitude', correct: false },
      { label: 'Change bit duration Tb from 1ms to 10ms', correct: false },
      { label: 'Increase channel attenuation', correct: false }
    ],
    hints: [
      'In coherent matched-filter detection, the receiver correlator must integrate against exact matching carrier frequencies.',
      'Check the transmitter frequencies: f0 is 1000 Hz and f1 is 2000 Hz. The receiver was mistakenly set to 1500 Hz.'
    ],
    explanation: 'Coherent and non-coherent BFSK demodulation depends on matched-filter correlation over the exact transmission carrier frequencies f0 and f1. A frequency mismatch causes severe cross-talk and complete loss of orthogonality.'
  },
  {
    id: 'det-02',
    title: 'The Silent Gateway: Layer 3 Black Hole',
    difficulty: 'Beginner',
    category: 'Networking',
    description: 'PC-01 (192.168.1.10/24) cannot transmit data packets to Server-01 (192.168.2.50/24). The local switch is operational, but packets vanish immediately upon dispatch.',
    symptom: 'Destination Unreachable: Default Gateway is unreachable or unconfigured.',
    misconfigType: 'wrong_gateway',
    options: [
      { label: 'Correct PC-01 Default Gateway to 192.168.1.1 (Router G0/0 IP)', correct: true },
      { label: 'Assign PC-01 IP to 192.168.2.10', correct: false },
      { label: 'Disable firewall on Server-01', correct: false },
      { label: 'Replace Ethernet link with Fiber optic', correct: false }
    ],
    hints: [
      'Look at PC-01 configuration: Gateway is currently set to 192.168.1.254.',
      'Examine Router-01 interface G0/0 IP address connected to the switch: it is 192.168.1.1.'
    ],
    explanation: 'When sending packets to a foreign subnet, a host dispatches the packet to its Default Gateway MAC address. If the gateway IP does not exist on the local subnet, ARP resolution fails and the packet is dropped.'
  },
  {
    id: 'det-03',
    title: 'The Missing Hop: Asymmetric Routing Deadlock',
    difficulty: 'Advanced',
    category: 'Routing',
    description: 'Packets travel successfully from PC-01 through Router-01 to Router-02. However, Router-02 drops return acknowledgments because it has no route back to 192.168.1.0/24.',
    symptom: 'ICMP Request Delivered, but Reply Times Out: No Route to Host.',
    misconfigType: 'missing_route',
    options: [
      { label: 'Add static route on Router-02: 192.168.1.0/24 via Next Hop 10.0.0.1', correct: true },
      { label: 'Change PC-01 subnet mask to /16', correct: false },
      { label: 'Enable DHCP on Router-01', correct: false },
      { label: 'Restart the switch ports', correct: false }
    ],
    hints: [
      'Routing in computer networks is symmetric and independent. Both directions must have explicit forwarding entries.',
      'Check Router-02 routing table: it only knows 192.168.2.0/24 and 10.0.0.0/30, but knows nothing about 192.168.1.0/24.'
    ],
    explanation: 'A router must possess a route for every destination subnet. Without a route back to the source subnet, return packets (replies/ACKs) are dropped as "Destination Net Unreachable".'
  }
];

export default function NetworkDetectiveModal({ onClose }) {
  const [selectedChallengeIdx, setSelectedChallengeIdx] = useState(0);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timer

  const currentChallenge = CHALLENGES[selectedChallengeIdx];

  // Timer countdown
  useEffect(() => {
    if (isSolved || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isSolved, timeLeft]);

  const handleTestFix = () => {
    if (selectedOption === null) return;
    setAttempts(prev => prev + 1);

    const isCorrect = currentChallenge.options[selectedOption].correct;

    if (isCorrect) {
      setIsSolved(true);
      setFeedback({
        type: 'success',
        message: 'BINGO! Misconfiguration resolved successfully! Channel and routing tests pass with 0 errors.'
      });
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } else {
      setFeedback({
        type: 'error',
        message: 'Incorrect fix. Problem persists! Check the symptom and inspect the parameters again.'
      });
    }
  };

  const handleNextChallenge = () => {
    setSelectedChallengeIdx(prev => (prev + 1) % CHALLENGES.length);
    setSelectedOption(null);
    setIsSolved(false);
    setFeedback(null);
    setHintsRevealed(0);
    setAttempts(0);
    setTimeLeft(300);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Search size={20} color="#ef4444" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                Network Detective Mode
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Investigate and diagnose intentional real-world misconfigurations in topology & FSK modulation.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status Bar: Timer, Attempts, Challenge Tracker */}
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '10px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: timeLeft < 60 ? '#ef4444' : '#38bdf8', fontWeight: 600 }}>
              <Clock size={16} />
              Time Remaining: {formatTimer(timeLeft)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Case {selectedChallengeIdx + 1} of {CHALLENGES.length} • Attempts: <strong>{attempts}</strong>
            </div>
          </div>

          {/* Challenge Dossier Card */}
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 700 }}>
                {currentChallenge.category.toUpperCase()} • {currentChallenge.difficulty}
              </span>
            </div>

            <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              {currentChallenge.title}
            </h4>

            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {currentChallenge.description}
            </p>

            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.8rem',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span><strong>Reported Symptom:</strong> {currentChallenge.symptom}</span>
            </div>
          </div>

          {/* Detective Diagnostic Choices */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              SELECT CORRECT DIAGNOSTIC FIX:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentChallenge.options.map((opt, idx) => (
                <button
                  key={idx}
                  disabled={isSolved}
                  onClick={() => setSelectedOption(idx)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: selectedOption === idx ? '2px solid #38bdf8' : '1px solid var(--border-color)',
                    backgroundColor: selectedOption === idx ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    cursor: isSolved ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '2px solid var(--border-color)',
                    backgroundColor: selectedOption === idx ? '#38bdf8' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {selectedOption === idx && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                  </div>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: feedback.type === 'success' ? '#10b981' : '#ef4444',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Explanation if solved */}
          {isSolved && (
            <div style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '8px',
              padding: '14px',
              border: '1px solid var(--border-color)',
              fontSize: '0.82rem',
              color: 'var(--text-muted)'
            }}>
              <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '4px' }}>
                Engineering Explanation:
              </strong>
              {currentChallenge.explanation}
            </div>
          )}

          {/* Hints Area */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setHintsRevealed(prev => Math.min(currentChallenge.hints.length, prev + 1))}
              disabled={hintsRevealed >= currentChallenge.hints.length}
              style={{
                background: 'none',
                border: 'none',
                color: hintsRevealed >= currentChallenge.hints.length ? 'var(--text-muted)' : '#eab308',
                fontSize: '0.78rem',
                cursor: hintsRevealed >= currentChallenge.hints.length ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <HelpCircle size={14} />
              Need a Hint? ({hintsRevealed}/{currentChallenge.hints.length} Used)
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              {!isSolved ? (
                <button
                  onClick={handleTestFix}
                  disabled={selectedOption === null}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: selectedOption === null ? 'not-allowed' : 'pointer',
                    opacity: selectedOption === null ? 0.6 : 1
                  }}
                >
                  Test Proposed Fix
                </button>
              ) : (
                <button
                  onClick={handleNextChallenge}
                  style={{
                    padding: '8px 20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Next Challenge <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Display Revealed Hints */}
          {hintsRevealed > 0 && (
            <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.08)', borderRadius: '8px', padding: '10px 14px', border: '1px solid rgba(234, 179, 8, 0.25)' }}>
              {currentChallenge.hints.slice(0, hintsRevealed).map((hint, idx) => (
                <div key={idx} style={{ fontSize: '0.78rem', color: '#eab308', margin: '4px 0' }}>
                  💡 <strong>Hint {idx + 1}:</strong> {hint}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
