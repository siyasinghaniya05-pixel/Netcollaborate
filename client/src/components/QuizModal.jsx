import React, { useState } from 'react';
import { X, Award, CheckCircle2, XCircle, RotateCcw, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

const QUESTIONS = [
  {
    id: 1,
    question: 'Which networking device operates primarily at Layer 3 of the OSI model?',
    options: ['Hub', 'Switch', 'Router', 'Repeater'],
    correct: 2,
    explanation: 'Routers operate at Layer 3 (Network Layer) and make forwarding decisions based on logical IP addresses.'
  },
  {
    id: 2,
    question: 'What is the default subnet mask for a Class C IPv4 network (/24)?',
    options: ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.255'],
    correct: 2,
    explanation: 'A /24 CIDR prefix corresponds to 24 ones in binary, which is 255.255.255.0.'
  },
  {
    id: 3,
    question: 'What happens to the Time-to-Live (TTL) field in an IP header when a packet crosses a router hop?',
    options: ['It is doubled', 'It is decremented by 1', 'It remains unchanged', 'It is reset to 255'],
    correct: 1,
    explanation: 'Every router decrements the TTL by 1. If TTL hits 0, the router discards the packet to prevent infinite loops.'
  },
  {
    id: 4,
    question: 'Why does a host need a Default Gateway configured?',
    options: [
      'To discover local MAC addresses via ARP',
      'To reach destinations outside its own local subnet',
      'To assign itself a dynamic IP address',
      'To encrypt wireless transmissions'
    ],
    correct: 1,
    explanation: 'A host forwards traffic to its Default Gateway whenever the destination IP is on a remote or external network.'
  },
  {
    id: 5,
    question: 'What protocol is used to map an IPv4 address to a physical MAC address?',
    options: ['DNS', 'DHCP', 'ARP (Address Resolution Protocol)', 'ICMP'],
    correct: 2,
    explanation: 'ARP broadcasts on the local LAN to ask "Who has IP X.X.X.X? Tell my MAC address."'
  },
  {
    id: 6,
    question: 'What is the primary function of an Ethernet Switch?',
    options: [
      'Translate private IP addresses to public IPs',
      'Broadcast every incoming frame to all ports without filtering',
      'Filter and forward frames based on destination MAC addresses',
      'Generate encryption certificates for web servers'
    ],
    correct: 2,
    explanation: 'A Switch learns MAC addresses per port and directs frames only to the port where the destination device resides.'
  }
];

const QuizModal = ({ onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentQ = QUESTIONS[currentIndex];

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsAnswerSubmitted(true);
    if (selectedOption === currentQ.correct) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < QUESTIONS.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setCompleted(true);
      if (score >= QUESTIONS.length / 2) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setCompleted(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Award size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Networking Challenge</h3>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!completed ? (
          <div>
            {/* Progress Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              <span>Question {currentIndex + 1} of {QUESTIONS.length}</span>
              <span>Score: {score}</span>
            </div>
            <div className="health-bar-container" style={{ height: '6px', marginBottom: '1.25rem' }}>
              <div
                className="health-bar-fill"
                style={{ width: `${((currentIndex + 1) / QUESTIONS.length) * 100}%`, backgroundColor: 'var(--primary)' }}
              />
            </div>

            {/* Question */}
            <div style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5, marginBottom: '1rem' }}>
              {currentQ.question}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {currentQ.options.map((opt, idx) => {
                let borderStyle = '1px solid var(--border-color)';
                let bgStyle = 'var(--bg-tertiary)';

                if (isAnswerSubmitted) {
                  if (idx === currentQ.correct) {
                    borderStyle = '1px solid var(--success)';
                    bgStyle = 'var(--success-light)';
                  } else if (idx === selectedOption) {
                    borderStyle = '1px solid var(--danger)';
                    bgStyle = 'var(--danger-light)';
                  }
                } else if (selectedOption === idx) {
                  borderStyle = '1px solid var(--primary)';
                  bgStyle = 'var(--primary-light)';
                }

                return (
                  <div
                    key={idx}
                    onClick={() => !isAnswerSubmitted && setSelectedOption(idx)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: bgStyle,
                      border: borderStyle,
                      cursor: isAnswerSubmitted ? 'default' : 'pointer',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem'
                      }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span style={{ flex: 1 }}>{opt}</span>
                    {isAnswerSubmitted && idx === currentQ.correct && (
                      <CheckCircle2 size={16} color="var(--success)" />
                    )}
                    {isAnswerSubmitted && idx === selectedOption && idx !== currentQ.correct && (
                      <XCircle size={16} color="var(--danger)" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explanation after submission */}
            {isAnswerSubmitted && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                  marginBottom: '1.25rem',
                  color: 'var(--text-secondary)'
                }}
              >
                <strong style={{ color: 'var(--primary)' }}>Explanation: </strong>
                {currentQ.explanation}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              {!isAnswerSubmitted ? (
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={selectedOption === null}
                >
                  Submit Answer
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleNext}>
                  {currentIndex + 1 < QUESTIONS.length ? 'Next Question' : 'View Results'}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Results Screen */
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <Award size={48} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Challenge Completed!
            </h2>
            <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              You scored <strong>{score}</strong> out of <strong>{QUESTIONS.length}</strong> (
              {Math.round((score / QUESTIONS.length) * 100)}%)
            </div>

            <button className="btn btn-primary" onClick={handleRestart}>
              <RotateCcw size={14} /> Try Challenge Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizModal;
