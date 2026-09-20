import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  X,
  Radio,
  Activity,
  Layers,
  CheckCircle2,
  ChevronRight,
  Play,
  ExternalLink,
  Award
} from 'lucide-react';

const EXPERIMENTS = [
  {
    id: 'EXP-01-PAM',
    name: 'Pulse Amplitude Modulation (PAM)',
    category: 'Analog & Pulse Modulation',
    objective: 'Generate and analyze Pulse Amplitude Modulated signals from analog message waves and observe natural and flat-top sampling.',
    theory: 'In PAM, pulse amplitudes are varied in proportion to the instantaneous message signal m(t). Flat-top sampling maintains constant voltage for pulse duration tau, creating aperture distortion compensable by equalizers.',
    formula: 's(t) = sum( m(n*Ts) * h(t - n*Ts) )',
    parameters: { samplingRate: '8 kHz', messageFreq: '500 Hz', dutyCycle: '20%' }
  },
  {
    id: 'EXP-02-AM',
    name: 'Amplitude Modulation (DSB-FC)',
    category: 'Analog Modulation',
    objective: 'Study Double Sideband Full Carrier AM generation, calculate modulation index mu, and observe envelope collapse during over-modulation.',
    theory: 'The carrier amplitude varies linearly with the modulating signal: s(t) = [Ac + m(t)] * cos(2*pi*fc*t). Modulation index mu = Am / Ac. Critical modulation occurs at mu = 1.0.',
    formula: 's(t) = Ac * [1 + mu * cos(2*pi*fm*t)] * cos(2*pi*fc*t)',
    parameters: { carrierFreq: '10 kHz', messageFreq: '1 kHz', mu: '0.8' }
  },
  {
    id: 'EXP-03-FM',
    name: 'Frequency Modulation (FM)',
    category: 'Analog Modulation',
    objective: 'Analyze FM frequency deviation Delta f, frequency modulation index beta, and Carson bandwidth rule.',
    theory: 'Instantaneous carrier frequency varies with message amplitude: fi(t) = fc + kf * m(t). Carson rule states total bandwidth BT = 2 * (Delta f + fm). FM offers superior noise immunity compared to AM.',
    formula: 's(t) = Ac * cos( 2*pi*fc*t + beta * sin(2*pi*fm*t) )',
    parameters: { carrierFreq: '20 kHz', deltaF: '5 kHz', fm: '1 kHz' }
  },
  {
    id: 'EXP-04-ASK',
    name: 'Amplitude Shift Keying (ASK / OOK)',
    category: 'Digital Modulation',
    objective: 'Generate Binary ASK waveforms, compute transmission bandwidth, and evaluate noise sensitivity in envelope detection.',
    theory: 'Binary 1 transmits carrier Ac*cos(2*pi*fc*t) while binary 0 transmits zero or low amplitude. Bandwidth B = 2 * Rb.',
    formula: 's(t) = d(t) * Ac * cos(2*pi*fc*t), where d(t) in {0, 1}',
    parameters: { carrierFreq: '2 kHz', bitRate: '1000 bps', bandwidth: '2 kHz' }
  },
  {
    id: 'EXP-05-BFSK',
    name: 'Binary Frequency Shift Keying (BFSK)',
    category: 'Digital Modulation',
    objective: 'Implement BFSK modulation and coherent matched-filter demodulation across noisy channels; verify Carson bandwidth and waterfall BER curve.',
    theory: 'Bit 0 transmits carrier f0 and bit 1 transmits f1. Receiver correlators integrate r(t) against orthogonal sinusoidal bases over bit duration Tb to achieve optimal decision statistics.',
    formula: 's(t) = A * cos(2*pi*f_i*t),  B = |f1 - f0| + 2*Rb',
    parameters: { f0: '1000 Hz', f1: '2000 Hz', bitDuration: '1.0 ms', noise: '5%' }
  },
  {
    id: 'EXP-06-PSK',
    name: 'Phase Shift Keying (BPSK)',
    category: 'Digital Modulation',
    objective: 'Study Binary PSK 180-degree phase reversals, constellation diagrams, and coherent carrier recovery.',
    theory: 'Binary 1 transmits 0 rad phase and binary 0 transmits pi rad phase. Offers maximum antipodal Euclidean distance, achieving minimum BER for a given SNR.',
    formula: 's(t) = Ac * cos(2*pi*fc*t + (1 - d(t))*pi)',
    parameters: { carrierFreq: '2 kHz', phaseSeparation: '180 deg', bitRate: '1000 bps' }
  },
  {
    id: 'EXP-07-NOISE',
    name: 'Effect of Channel Noise on Digital Modulation',
    category: 'Channel Analysis',
    objective: 'Systematically assess Gaussian thermal noise degradation across digital transmission and calculate SNR.',
    theory: 'Additive White Gaussian Noise (AWGN) has zero mean and variance sigma^2 = N0/2. As noise power approaches signal power, the detection decision threshold is breached.',
    formula: 'r(t) = s(t) + n(t),  SNR_dB = 10 * log10(Ps / Pn)',
    parameters: { noiseSweep: '0% to 50%', steps: '6 levels' }
  },
  {
    id: 'EXP-08-BER',
    name: 'Bit Error Rate (BER) Analysis & Waterfall Curve',
    category: 'Channel Analysis',
    objective: 'Calculate empirical BER = N_errors / N_total and validate against theoretical error probability function.',
    theory: 'For non-coherent BFSK, Pb = 0.5 * exp(-Eb / (2*N0)). For coherent BFSK, Pb = Q(sqrt(Eb / N0)). The waterfall curve exhibits a steep error drop-off beyond 10 dB SNR.',
    formula: 'BER = N_incorrect / N_total,  Pb = Q(sqrt(Eb / N0))',
    parameters: { testBits: '64 bits', trials: 'Monte-Carlo' }
  },
  {
    id: 'EXP-09-NETWORK-TRANSMISSION',
    name: 'End-to-End Digital Data Transmission over Virtual Network',
    category: 'Network Simulation',
    objective: 'Transmit digital payload across multi-hop router topology using BFSK modulated physical channel link.',
    theory: 'Integrates Layer 3 IPv4 packet routing through intermediate switches and routers with Layer 1 physical BFSK digital modulation over long-distance links.',
    formula: 'Cross-layer: IP/ICMP Routing + Physical BFSK Channel',
    parameters: { topology: 'PC -> Switch -> Router -> Channel -> PC' }
  }
];

export default function ExperimentLibraryModal({ onClose }) {
  const navigate = useNavigate();
  const [selectedExp, setSelectedExp] = useState(EXPERIMENTS[4]); // Default BFSK
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = ['all', 'Digital Modulation', 'Analog Modulation', 'Channel Analysis', 'Network Simulation'];

  const filtered = filterCategory === 'all'
    ? EXPERIMENTS
    : EXPERIMENTS.filter(e => e.category.toLowerCase().includes(filterCategory.toLowerCase()));

  const handleLaunchExperiment = (exp) => {
    onClose();
    if (exp.id === 'EXP-09-NETWORK-TRANSMISSION') {
      navigate('/workspace/demo');
    } else {
      navigate('/fsk-lab');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
        maxWidth: '960px',
        height: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
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
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BookOpen size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                Digital Communication & Networking Experiment Library
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Standardized curriculum of 9 laboratory experiments with mathematical theory & live simulation.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Category Filter Chips */}
        <div style={{
          padding: '10px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          gap: '8px',
          backgroundColor: 'var(--bg-tertiary)'
        }}>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              style={{
                padding: '5px 12px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: filterCategory === c ? '#0284c7' : 'transparent',
                color: filterCategory === c ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {c === 'all' ? 'All Experiments (9)' : c}
            </button>
          ))}
        </div>

        {/* Content Body: Left List + Right Detail */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Column: Experiments List */}
          <div style={{
            width: '340px',
            minWidth: '340px',
            borderRight: '1px solid var(--border-color)',
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {filtered.map(exp => {
              const active = selectedExp.id === exp.id;
              return (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExp(exp)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: active ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                    backgroundColor: active ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8' }}>
                      {exp.id}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {exp.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {exp.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Experiment Dossier */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 700 }}>
                  {selectedExp.id} • {selectedExp.category}
                </span>
                <h2 style={{ margin: '8px 0 0 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  {selectedExp.name}
                </h2>
              </div>

              <button
                onClick={() => handleLaunchExperiment(selectedExp)}
                style={{
                  padding: '9px 18px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                Launch Simulator
                <ExternalLink size={14} />
              </button>
            </div>

            {/* Objective */}
            <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '10px', padding: '14px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', display: 'block', marginBottom: '4px' }}>
                LABORATORY OBJECTIVE
              </span>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {selectedExp.objective}
              </p>
            </div>

            {/* Theory & Mathematical Formula */}
            <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '10px', padding: '14px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399', display: 'block', marginBottom: '4px' }}>
                THEORETICAL FOUNDATION & FORMULAS
              </span>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {selectedExp.theory}
              </p>
              <div style={{
                backgroundColor: '#0a0f1d',
                padding: '10px 14px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.84rem',
                color: '#38bdf8',
                border: '1px solid #1e293b'
              }}>
                {selectedExp.formula}
              </div>
            </div>

            {/* Standard Parameters Table */}
            <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '10px', padding: '14px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', display: 'block', marginBottom: '8px' }}>
                DEFAULT PARAMETER BENCHMARKS
              </span>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {Object.entries(selectedExp.parameters).map(([k, v]) => (
                  <div key={k} style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
