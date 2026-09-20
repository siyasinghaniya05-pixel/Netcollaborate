import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { runFskPipeline, parseBits } from '../utils/fskModulation';

export default function WhatIfModal({ onClose, baseParams }) {
  const [testBits, setTestBits] = useState(baseParams?.bits || '10110010');

  // Baseline (Before)
  const [beforeNoise, setBeforeNoise] = useState(baseParams?.noisePercent ?? 10);
  const [beforeF0, setBeforeF0] = useState(baseParams?.f0 ?? 1000);
  const [beforeF1, setBeforeF1] = useState(baseParams?.f1 ?? 2000);

  // Altered (After)
  const [afterNoise, setAfterNoise] = useState(35);
  const [afterF0, setAfterF0] = useState(1000);
  const [afterF1, setAfterF1] = useState(1300); // Narrower frequency separation

  const [beforeResult, setBeforeResult] = useState(null);
  const [afterResult, setAfterResult] = useState(null);

  useEffect(() => {
    const bits = parseBits(testBits);
    const bRes = runFskPipeline(bits, {
      f0: beforeF0,
      f1: beforeF1,
      bitDuration: 0.001,
      noisePercent: beforeNoise
    });
    const aRes = runFskPipeline(bits, {
      f0: afterF0,
      f1: afterF1,
      bitDuration: 0.001,
      noisePercent: afterNoise
    });

    setBeforeResult(bRes);
    setAfterResult(aRes);
  }, [testBits, beforeNoise, beforeF0, beforeF1, afterNoise, afterF0, afterF1]);

  const deltaBer = (afterResult?.berPercent ?? 0) - (beforeResult?.berPercent ?? 0);
  const deltaSnr = (afterResult?.snrDb ?? 0) - (beforeResult?.snrDb ?? 0);

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
        maxWidth: '840px',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Modal Header */}
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
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={20} color="#eab308" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                "What-If" Scenario Simulator
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Evaluate comparative hypotheses: change noise, carrier separation, and channel conditions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Scenario Preset Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              {
                label: 'What if Noise increases 10% → 35%?',
                apply: () => { setBeforeNoise(10); setAfterNoise(35); setBeforeF0(1000); setBeforeF1(2000); setAfterF0(1000); setAfterF1(2000); }
              },
              {
                label: 'What if f0 and f1 are closer (Narrow Bandwidth)?',
                apply: () => { setBeforeF0(1000); setBeforeF1(2000); setAfterF0(1000); setAfterF1(1200); setBeforeNoise(15); setAfterNoise(15); }
              },
              {
                label: 'What if Noise reaches severe 50%?',
                apply: () => { setBeforeNoise(5); setAfterNoise(50); setBeforeF0(1000); setBeforeF1(2000); setAfterF0(1000); setAfterF1(2000); }
              }
            ].map((sc, i) => (
              <button
                key={i}
                onClick={sc.apply}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '20px',
                  color: 'var(--text-primary)',
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                {sc.label}
              </button>
            ))}
          </div>

          {/* Side-by-Side Comparison Container */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Scenario A: BEFORE */}
            <div style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                  SCENARIO A (BASELINE)
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Original State</span>
              </div>

              {/* Controls */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Noise Level: <strong>{beforeNoise}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={beforeNoise}
                  onChange={(e) => setBeforeNoise(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#38bdf8' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>f0</label>
                  <input
                    type="number"
                    value={beforeF0}
                    onChange={(e) => setBeforeF0(Number(e.target.value))}
                    style={{ width: '100%', padding: '5px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>f1</label>
                  <input
                    type="number"
                    value={beforeF1}
                    onChange={(e) => setBeforeF1(Number(e.target.value))}
                    style={{ width: '100%', padding: '5px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Metric Results */}
              <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bit Error Rate:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: (beforeResult?.berPercent || 0) > 0 ? '#ef4444' : '#10b981' }}>
                    {beforeResult?.berPercent ?? 0}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>SNR (dB):</span>
                  <strong>{beforeResult?.snrDb ?? 50} dB</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Carson Bandwidth:</span>
                  <strong>{beforeResult?.bandwidthKhz ?? 3.0} kHz</strong>
                </div>
              </div>
            </div>

            {/* Scenario B: AFTER */}
            <div style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '12px',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#eab308' }}>
                  SCENARIO B (WHAT-IF)
                </span>
                <span style={{ fontSize: '0.72rem', color: '#eab308' }}>Hypothesis Altered</span>
              </div>

              {/* Controls */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Noise Level: <strong>{afterNoise}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={afterNoise}
                  onChange={(e) => setAfterNoise(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#eab308' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>f0</label>
                  <input
                    type="number"
                    value={afterF0}
                    onChange={(e) => setAfterF0(Number(e.target.value))}
                    style={{ width: '100%', padding: '5px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>f1</label>
                  <input
                    type="number"
                    value={afterF1}
                    onChange={(e) => setAfterF1(Number(e.target.value))}
                    style={{ width: '100%', padding: '5px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Metric Results */}
              <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bit Error Rate:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: (afterResult?.berPercent || 0) > 0 ? '#ef4444' : '#10b981' }}>
                    {afterResult?.berPercent ?? 0}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>SNR (dB):</span>
                  <strong>{afterResult?.snrDb ?? 50} dB</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Carson Bandwidth:</span>
                  <strong>{afterResult?.bandwidthKhz ?? 3.0} kHz</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Differential Impact Summary Banner */}
          <div style={{
            backgroundColor: deltaBer > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${deltaBer > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: deltaBer > 0 ? '#ef4444' : '#10b981' }}>
                Impact Result: {deltaBer > 0 ? `BER increased by +${Math.round(deltaBer * 100) / 100}%` : (deltaBer < 0 ? `BER improved by ${Math.round(deltaBer * 100) / 100}%` : 'No BER degradation detected')}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                SNR shifted by {deltaSnr > 0 ? `+${Math.round(deltaSnr * 10) / 10}` : Math.round(deltaSnr * 10) / 10} dB.
                {Math.abs(afterF1 - afterF0) < Math.abs(beforeF1 - beforeF0)
                  ? ' Narrower frequency separation reduces correlation orthogonality and increases error vulnerability.'
                  : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
