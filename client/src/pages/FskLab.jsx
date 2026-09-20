import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ZoomIn,
  ZoomOut,
  Sliders,
  BarChart2,
  Layers,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  HelpCircle,
  TrendingUp,
  Cpu,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Info,
  ChevronRight,
  Radio,
  Zap,
  Volume2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import LabReportModal from '../components/LabReportModal';
import WhatIfModal from '../components/WhatIfModal';
import {
  generateFskSignal,
  applyChannelDistortion,
  demodulateFskSignal,
  runFskPipeline,
  generateNoiseVsBerSweep,
  generateModulationComparison,
  textToBits,
  bitsToText,
  parseBits
} from '../utils/fskModulation';
import { experimentAPI, labAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

const PRESETS = [
  { label: 'Standard Sequence (10110010)', value: '10110010' },
  { label: 'Alternating Bits (10101010)', value: '10101010' },
  { label: 'Block Bursts (11001100)', value: '11001100' },
  { label: 'All Mark 1s (11111111)', value: '11111111' },
  { label: 'All Space 0s (00000000)', value: '00000000' },
  { label: 'Pseudorandom PRBS (11010011)', value: '11010011' }
];

export default function FskLab() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Session context from query string or navigation state
  const querySession = new URLSearchParams(location.search).get('session');
  const activeSessionCode = querySession || location.state?.sessionCode || 'NC-FSK-7A42';

  // Active Lab Mode
  // 'oscilloscope' | 'noise-sweep' | 'comparison' | 'educational'
  const [activeTab, setActiveTab] = useState('oscilloscope');

  // Input Parameters
  const [inputMode, setInputMode] = useState('binary'); // 'binary' | 'text'
  const [binaryString, setBinaryString] = useState('10110010');
  const [textInput, setTextInput] = useState('LAB');
  const [f0, setF0] = useState(1000); // Space frequency
  const [f1, setF1] = useState(2000); // Mark frequency
  const [bitDurationMs, setBitDurationMs] = useState(1.0); // 1 ms
  const [noisePercent, setNoisePercent] = useState(5); // 0% to 50%
  const [attenuation, setAttenuation] = useState(1.0); // 0.2 to 1.0

  // Oscilloscope Animation & View Controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [playSpeed, setPlaySpeed] = useState(1.0); // 0.5, 1.0, 2.0
  const [zoomLevel, setZoomLevel] = useState(1.0); // 0.75, 1.0, 1.5, 2.0
  const [animTimeOffset, setAnimTimeOffset] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // For step-by-step
  const [isStepMode, setIsStepMode] = useState(false);

  // Simulation Results
  const [simResult, setSimResult] = useState(null);
  const [noiseSweepResult, setNoiseSweepResult] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isComputingSweep, setIsComputingSweep] = useState(false);

  // Modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showWhatIfModal, setShowWhatIfModal] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState(null);

  // Educational 6-step Mode Step (0 to 5)
  const [eduStep, setEduStep] = useState(0);

  // Canvas Refs
  const oscCanvasRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Re-run simulation when parameters change
  const recomputeSimulation = useCallback(() => {
    let bits = [];
    if (inputMode === 'text') {
      bits = textToBits(textInput || 'A');
    } else {
      bits = parseBits(binaryString);
    }

    const bitDuration = bitDurationMs / 1000;
    const res = runFskPipeline(bits, {
      f0,
      f1,
      bitDuration,
      noisePercent,
      attenuation,
      samplesPerBit: 50
    });
    setSimResult(res);
  }, [inputMode, binaryString, textInput, f0, f1, bitDurationMs, noisePercent, attenuation]);

  useEffect(() => {
    recomputeSimulation();
  }, [recomputeSimulation]);

  // Handle Noise Sweep Tab
  useEffect(() => {
    if (activeTab === 'noise-sweep') {
      setIsComputingSweep(true);
      setTimeout(() => {
        let bits = inputMode === 'text' ? textToBits(textInput || 'A') : parseBits(binaryString);
        const sweep = generateNoiseVsBerSweep(bits, {
          f0,
          f1,
          bitDuration: bitDurationMs / 1000
        });
        setNoiseSweepResult(sweep);
        setIsComputingSweep(false);
      }, 80);
    } else if (activeTab === 'comparison') {
      let bits = inputMode === 'text' ? textToBits(textInput || 'A') : parseBits(binaryString);
      const comp = generateModulationComparison(bits, {
        carrierFreq: 1500,
        f0,
        f1,
        bitDuration: bitDurationMs / 1000,
        noisePercent
      });
      setComparisonResult(comp);
    }
  }, [activeTab, binaryString, textInput, inputMode, f0, f1, bitDurationMs, noisePercent]);

  // Oscilloscope Canvas Rendering Loop
  useEffect(() => {
    if (activeTab !== 'oscilloscope' || !simResult) return;

    const canvas = oscCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let localOffset = animTimeOffset;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear Canvas
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, width, height);

      // Draw Oscilloscope Grid Lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSpacingX = 40 * zoomLevel;
      for (let x = 0; x < width; x += gridSpacingX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw 4 Divided Channels
      const channelHeight = height / 4;
      const channels = [
        { label: 'CH 1: Digital Input Sequence', color: '#38bdf8', yBase: channelHeight * 0.5 },
        { label: 'CH 2: Transmitted FSK Carrier s(t)', color: '#34d399', yBase: channelHeight * 1.5 },
        { label: `CH 3: Channel Signal with Noise (${noisePercent}%)`, color: '#f59e0b', yBase: channelHeight * 2.5 },
        { label: 'CH 4: Demodulated Output & Bit Decisions', color: '#a78bfa', yBase: channelHeight * 3.5 }
      ];

      // Draw Channel Dividers
      for (let i = 1; i < 4; i++) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, channelHeight * i);
        ctx.lineTo(width, channelHeight * i);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Channel Labels
      channels.forEach((ch, idx) => {
        ctx.fillStyle = ch.color;
        ctx.font = '11px monospace';
        ctx.fillText(ch.label, 14, channelHeight * idx + 18);
      });

      const {
        bits,
        fskSignal,
        receivedSignal,
        demodulatedDigitalSignal,
        samplesPerBit,
        totalBits,
        frequencyMapping,
        rxBits,
        errorPositions
      } = simResult;

      const totalSamples = fskSignal.length;
      const bitPixelWidth = (width / totalBits) * zoomLevel;

      // Draw Bit Boundaries & Labels across all traces
      for (let b = 0; b < totalBits; b++) {
        const xPos = b * bitPixelWidth - (isPlaying ? localOffset % (totalBits * bitPixelWidth) : 0);

        if (xPos >= -bitPixelWidth && xPos <= width + bitPixelWidth) {
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(xPos, 0);
          ctx.lineTo(xPos, height);
          ctx.stroke();
          ctx.setLineDash([]);

          // Bit Label & Frequency mapping
          const bitVal = bits[b];
          const freqVal = bitVal === 1 ? f1 : f0;
          ctx.fillStyle = bitVal === 1 ? '#34d399' : '#38bdf8';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(`Bit: ${bitVal}`, xPos + 10, channelHeight * 0.25);
          ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
          ctx.font = '10px monospace';
          ctx.fillText(`${freqVal} Hz`, xPos + 10, channelHeight * 0.4);

          // Mark Bit status in Channel 4
          const isError = errorPositions.includes(b);
          ctx.fillStyle = isError ? '#ef4444' : '#10b981';
          ctx.fillText(`Rx: ${rxBits[b]} ${isError ? '(ERR)' : '(OK)'}`, xPos + 10, channelHeight * 3.3);
        }
      }

      // 1. Draw Channel 1: Clean Digital Input (Square Wave)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let b = 0; b < totalBits; b++) {
        const xStart = b * bitPixelWidth - (isPlaying ? localOffset % (totalBits * bitPixelWidth) : 0);
        const xEnd = xStart + bitPixelWidth;
        const yVal = bits[b] === 1 ? channels[0].yBase - 22 : channels[0].yBase + 22;

        if (b === 0) ctx.moveTo(xStart, yVal);
        else ctx.lineTo(xStart, yVal);
        ctx.lineTo(xEnd, yVal);
      }
      ctx.stroke();

      // 2. Draw Channel 2: FSK Modulated Waveform (Continuous Sinusoid)
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let s = 0; s < totalSamples; s++) {
        const x = (s / totalSamples) * (totalBits * bitPixelWidth) - (isPlaying ? localOffset % (totalBits * bitPixelWidth) : 0);
        const y = channels[1].yBase - fskSignal[s] * 28;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 3. Draw Channel 3: Noisy Received Signal
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let s = 0; s < totalSamples; s++) {
        const x = (s / totalSamples) * (totalBits * bitPixelWidth) - (isPlaying ? localOffset % (totalBits * bitPixelWidth) : 0);
        const y = channels[2].yBase - receivedSignal[s] * 28;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 4. Draw Channel 4: Demodulated Recovered Square Wave
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let b = 0; b < totalBits; b++) {
        const xStart = b * bitPixelWidth - (isPlaying ? localOffset % (totalBits * bitPixelWidth) : 0);
        const xEnd = xStart + bitPixelWidth;
        const isError = errorPositions.includes(b);
        const yVal = rxBits[b] === 1 ? channels[3].yBase - 22 : channels[3].yBase + 22;

        if (b === 0) ctx.moveTo(xStart, yVal);
        else ctx.lineTo(xStart, yVal);
        ctx.lineTo(xEnd, yVal);
      }
      ctx.stroke();

      // Active Beam Cursor Scan Line
      const scanX = (localOffset * 2) % width;
      const grad = ctx.createLinearGradient(scanX - 25, 0, scanX, 0);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.4)');
      ctx.fillStyle = grad;
      ctx.fillRect(scanX - 25, 0, 25, height);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, height);
      ctx.stroke();

      // Advance time offset if playing
      if (isPlaying) {
        localOffset += 1.2 * playSpeed;
        setAnimTimeOffset(localOffset);
        animFrameIdRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [activeTab, simResult, isPlaying, playSpeed, zoomLevel, noisePercent, f0, f1]);

  // Step-by-Step button
  const handleStepForward = () => {
    if (!simResult) return;
    setIsPlaying(false);
    setIsStepMode(true);
    setCurrentStepIndex(prev => (prev + 1) % simResult.totalBits);
    setAnimTimeOffset(prev => prev + 40);
  };

  const handleRestart = () => {
    setAnimTimeOffset(0);
    setCurrentStepIndex(0);
    setIsPlaying(true);
  };

  // Submit for Academic Auto-Evaluation
  const handleSubmitEvaluation = async () => {
    if (!simResult) return;
    try {
      const payload = {
        studentId: user?.id || user?.userId || 'user_student_01',
        labSessionId: activeSessionCode,
        sessionCode: activeSessionCode,
        instructorId: location.state?.instructorId || 'user_instructor_01',
        experimentType: 'FSK',
        status: 'in-progress',
        studentName: user?.name || user?.username || 'Student Engineer',
        rollNumber: user?.rollNumber || 'CS2026-LAB',
        parameters: { f0, f1, bitDurationMs, noisePercent, attenuation },
        results: {
          totalBits: simResult.totalBits,
          errors: simResult.errors,
          berPercent: simResult.berPercent,
          snrDb: simResult.snrDb,
          status: simResult.status,
          observations: simResult.observations
        },
        networkConfigured: true
      };

      const res = await experimentAPI.submitExperiment('EXP-05-BFSK', payload);
      if (res.data?.success) {
        setSubmitFeedback(res.data.data);
      }

      // Notify instructor live monitor room
      const socket = getSocket();
      socket.emit('fsk-result-updated', {
        sessionCode: activeSessionCode,
        student: {
          studentId: user?.id || user?.userId,
          name: user?.name || user?.username,
          rollNumber: user?.rollNumber
        },
        ber: simResult.berPercent,
        params: { f0, f1, noisePercent }
      });
    } catch (err) {
      console.warn('Evaluation submission error:', err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <Navbar onOpenLearn={() => setActiveTab('educational')} />

      {/* Lab Session Navigation Banner */}
      <div style={{
        backgroundColor: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '6px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.8rem'
      }}>
        <button
          onClick={() => navigate(`/lab/${activeSessionCode}`)}
          className="btn btn-ghost btn-sm"
          style={{ padding: '2px 8px', fontSize: '0.78rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} />
          <span>Back to Lab Details ({activeSessionCode})</span>
        </button>
        <div style={{ color: 'var(--text-muted)' }}>
          Assigned Session: <strong style={{ color: '#38bdf8' }}>{activeSessionCode}</strong> • Digital Communication Lab
        </div>
      </div>

      {/* Top Header Banner */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
          }}>
            <Radio size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Binary Frequency Shift Keying (BFSK) Laboratory
              </h1>
              <span style={{
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600
              }}>
                EXP-05 • DSP Engine
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Real-time continuous phase signal modulation, Gaussian channel noise, matched-filter correlation & BER analysis.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowWhatIfModal(true)}
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem',
              fontWeight: 500
            }}
          >
            <Zap size={15} color="#eab308" />
            What-If Analysis
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem',
              fontWeight: 500
            }}
          >
            <FileText size={15} color="#38bdf8" />
            Lab Report
          </button>

          <button
            onClick={handleSubmitEvaluation}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Award size={15} />
            Submit for Grade
          </button>
        </div>
      </div>

      {/* Evaluation Feedback Banner if submitted */}
      {submitFeedback && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={20} color="#10b981" />
            <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>
              Academic Evaluation Complete: Lab Score {submitFeedback.score}/100 (Grade {submitFeedback.letterGrade})
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              • {submitFeedback.conclusion}
            </span>
          </div>
          <button
            onClick={() => setSubmitFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 24px',
        display: 'flex',
        gap: '24px'
      }}>
        {[
          { id: 'oscilloscope', label: 'FSK Waveform & Oscilloscope', icon: Activity },
          { id: 'noise-sweep', label: 'Effect of Noise on FSK (BER Curve)', icon: TrendingUp },
          { id: 'comparison', label: 'FSK vs ASK vs PSK Comparison', icon: BarChart2 },
          { id: 'educational', label: 'FSK Educational Step-by-Step Mode', icon: Sparkles }
        ].map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '12px 4px',
                border: 'none',
                borderBottom: active ? '2px solid #38bdf8' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: active ? '#38bdf8' : 'var(--text-muted)',
                fontWeight: active ? 600 : 500,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Main Body */}
      <div style={{ flex: 1, padding: '20px 24px', display: 'flex', gap: '20px', overflowX: 'hidden' }}>
        {/* Left Column: Parameter Controls Panel */}
        <div style={{
          width: '320px',
          minWidth: '320px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          height: 'fit-content'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={16} color="#38bdf8" />
              FSK Parameters
            </span>
            <button
              onClick={recomputeSimulation}
              title="Recalculate signal"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Preset Selector */}
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Presets
            </label>
            <select
              value={binaryString}
              onChange={(e) => {
                setBinaryString(e.target.value);
                setInputMode('binary');
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '0.82rem'
              }}
            >
              {PRESETS.map((p, idx) => (
                <option key={idx} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Input Format Toggle: Binary / ASCII Text */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setInputMode('binary')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '0.76rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: inputMode === 'binary' ? '#0284c7' : 'var(--bg-tertiary)',
                color: inputMode === 'binary' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Binary Bits
            </button>
            <button
              onClick={() => setInputMode('text')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '0.76rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: inputMode === 'text' ? '#0284c7' : 'var(--bg-tertiary)',
                color: inputMode === 'text' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              ASCII Text
            </button>
          </div>

          {inputMode === 'binary' ? (
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Digital Input (0s & 1s)
              </label>
              <input
                type="text"
                value={binaryString}
                onChange={(e) => setBinaryString(e.target.value.replace(/[^01]/g, ''))}
                placeholder="10110010"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: '#34d399',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Sequence Length: {binaryString.length} bits
              </span>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Message Text String
              </label>
              <input
                type="text"
                value={textInput}
                maxLength={6}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="LAB"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Converts to: {textToBits(textInput || 'A').join('')} ({textInput.length * 8} bits)
              </span>
            </div>
          )}

          {/* Frequencies Configuration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                f0 (Bit 0 Frequency)
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  min={200}
                  max={10000}
                  step={100}
                  value={f0}
                  onChange={(e) => setF0(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.82rem'
                  }}
                />
                <span style={{ marginLeft: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hz</span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', color: '#34d399', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                f1 (Bit 1 Frequency)
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  min={200}
                  max={10000}
                  step={100}
                  value={f1}
                  onChange={(e) => setF1(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.82rem'
                  }}
                />
                <span style={{ marginLeft: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hz</span>
              </div>
            </div>
          </div>

          {/* Bit Duration */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Bit Duration (Tb)
              </label>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {bitDurationMs} ms (Bit Rate: {Math.round(1000 / bitDurationMs)} bps)
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={bitDurationMs}
              onChange={(e) => setBitDurationMs(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8' }}
            />
          </div>

          {/* Channel Noise Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>
                Channel Noise Level
              </label>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: noisePercent > 25 ? '#ef4444' : '#f59e0b' }}>
                {noisePercent}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={noisePercent}
              onChange={(e) => setNoisePercent(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#f59e0b' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>0% (Ideal)</span>
              <span>20%</span>
              <span>50% (High Noise)</span>
            </div>
          </div>

          {/* Attenuation Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Channel Attenuation
              </label>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {Math.round(attenuation * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.1"
              value={attenuation}
              onChange={(e) => setAttenuation(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#818cf8' }}
            />
          </div>

          {/* Transmitter Pipeline Status Widget */}
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '8px',
            padding: '12px',
            border: '1px solid var(--border-color)',
            fontSize: '0.76rem'
          }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              TRANSMITTER PIPELINE
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-primary)' }}>
              <div>• Bit 0: <strong style={{ color: '#38bdf8' }}>f0 = {f0} Hz</strong></div>
              <div>• Bit 1: <strong style={{ color: '#34d399' }}>f1 = {f1} Hz</strong></div>
              <div>• Separation (Δf): <strong>{Math.abs(f1 - f0)} Hz</strong></div>
              <div>• Carson Bandwidth: <strong>{simResult?.bandwidthHz || 3000} Hz</strong></div>
              <div>• Status: <strong style={{ color: simResult?.status === 'SUCCESS' ? '#10b981' : '#f59e0b' }}>{simResult?.status || 'ONLINE'}</strong></div>
            </div>
          </div>
        </div>

        {/* Center / Right Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Performance Analytics Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bit Error Rate</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: (simResult?.berPercent || 0) > 0 ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                {simResult?.berPercent ?? 0}%
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {simResult?.errors ?? 0} errors / {simResult?.totalBits ?? 8} bits
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SNR (Signal/Noise)</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: (simResult?.snrDb || 0) > 10 ? '#34d399' : '#f59e0b', marginTop: '2px' }}>
                {simResult?.snrDb ?? 50} <span style={{ fontSize: '0.85rem' }}>dB</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {noisePercent === 0 ? 'Ideal Noiseless' : `${noisePercent}% Noise Power`}
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Carson Bandwidth</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                {simResult?.bandwidthKhz ?? 3.0} <span style={{ fontSize: '0.85rem' }}>kHz</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                B = |f1 - f0| + 2Rb
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Throughput</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a78bfa', marginTop: '2px' }}>
                {simResult?.throughputBps ?? 1000} <span style={{ fontSize: '0.85rem' }}>bps</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Effective Data Rate
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transmission Time</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {simResult?.transmissionTimeMs ?? 8.0} <span style={{ fontSize: '0.85rem' }}>ms</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Total symbol duration
              </span>
            </div>
          </div>

          {/* TAB 1: Oscilloscope View */}
          {activeTab === 'oscilloscope' && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Oscilloscope Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: isPlaying ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: isPlaying ? '#ef4444' : '#10b981',
                      border: `1px solid ${isPlaying ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.82rem',
                      fontWeight: 600
                    }}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    {isPlaying ? 'Pause' : 'Play Live'}
                  </button>

                  <button
                    onClick={handleRestart}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <RotateCcw size={14} />
                    Restart
                  </button>

                  <button
                    onClick={handleStepForward}
                    title="Advance single bit"
                    style={{
                      padding: '6px 10px',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <SkipForward size={14} />
                    Step
                  </button>
                </div>

                {/* Speed & Zoom */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Speed:</span>
                    {[0.5, 1.0, 2.0].map(s => (
                      <button
                        key={s}
                        onClick={() => setPlaySpeed(s)}
                        style={{
                          padding: '3px 7px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: playSpeed === s ? '#0284c7' : 'var(--bg-tertiary)',
                          color: playSpeed === s ? '#ffffff' : 'var(--text-muted)',
                          fontSize: '0.74rem',
                          cursor: 'pointer'
                        }}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(0.75, prev - 0.25))}
                      style={{ padding: '4px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '36px', textAlign: 'center' }}>
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                      style={{ padding: '4px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}
                    >
                      <ZoomIn size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* The Oscilloscope Canvas */}
              <div style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #1e293b',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
              }}>
                <canvas
                  ref={oscCanvasRef}
                  width={900}
                  height={420}
                  style={{ width: '100%', height: '420px', display: 'block', backgroundColor: '#0a0f1d' }}
                />
              </div>

              {/* Dynamic Academic Observations */}
              {simResult?.observations && (
                <div style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  border: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Info size={14} />
                    Lab Observations & Physical Analysis:
                  </span>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {simResult.observations.map((obs, idx) => (
                      <li key={idx}>{obs}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Effect of Noise on FSK (Noise vs BER Waterfall Curve) */}
          {activeTab === 'noise-sweep' && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  Experiment: "Effect of Noise on Binary FSK"
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Evaluates matched filter degradation across increasing channel noise levels (0% to 50%) and compares against theoretical Q-function probability of error.
                </p>
              </div>

              {isComputingSweep ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Computing Monte-Carlo noise iterations...
                </div>
              ) : (
                <>
                  {/* Results Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Noise Level</th>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Empirical SNR</th>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Bit Errors</th>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Simulated BER</th>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Theoretical BER (Q-func)</th>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Quality Assessment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {noiseSweepResult?.sweepResults?.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#f59e0b' }}>
                              {row.noisePercent}%
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>
                              {row.snrDb} dB
                            </td>
                            <td style={{ padding: '10px 12px', color: row.errors > 0 ? '#ef4444' : '#10b981' }}>
                              {row.errors} / {row.totalBits}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: row.empiricalBerPercent > 10 ? '#ef4444' : '#10b981' }}>
                              {row.empiricalBerPercent}%
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                              {row.theoreticalBerPercent}%
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                backgroundColor: row.empiricalBerPercent === 0 ? 'rgba(16, 185, 129, 0.15)' : (row.empiricalBerPercent < 15 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                                color: row.empiricalBerPercent === 0 ? '#10b981' : (row.empiricalBerPercent < 15 ? '#eab308' : '#ef4444')
                              }}>
                                {row.empiricalBerPercent === 0 ? 'Error-Free' : (row.empiricalBerPercent < 15 ? 'Moderate' : 'Severe Degradation')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* SVG Waterfall Curve Chart */}
                  <div style={{ backgroundColor: '#0a0f1d', borderRadius: '8px', padding: '16px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38bdf8' }}>
                        Noise Level (%) vs Bit Error Rate (BER) Curve
                      </span>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem' }}>
                        <span style={{ color: '#ef4444' }}>● Simulated Empirical BER</span>
                        <span style={{ color: '#38bdf8' }}>● Theoretical Curve (Q-Function)</span>
                      </div>
                    </div>
                    <svg viewBox="0 0 700 220" style={{ width: '100%', height: '200px' }}>
                      {/* Grid */}
                      {[0, 50, 100, 150, 200].map(y => (
                        <line key={y} x1="50" y1={y} x2="680" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                      ))}
                      {/* Axes */}
                      <line x1="50" y1="200" x2="680" y2="200" stroke="#475569" strokeWidth="1.5" />
                      <line x1="50" y1="10" x2="50" y2="200" stroke="#475569" strokeWidth="1.5" />
                      {/* Axis Labels */}
                      <text x="35" y="25" fill="#94a3b8" fontSize="10">BER 50%</text>
                      <text x="35" y="110" fill="#94a3b8" fontSize="10">25%</text>
                      <text x="35" y="198" fill="#94a3b8" fontSize="10">0%</text>

                      {/* X Labels */}
                      {[0, 10, 20, 30, 40, 50].map((n, i) => {
                        const x = 50 + (i / 5) * 600;
                        return (
                          <text key={n} x={x - 8} y="215" fill="#94a3b8" fontSize="10">
                            {n}%
                          </text>
                        );
                      })}

                      {/* Theoretical Curve Line */}
                      {noiseSweepResult?.sweepResults && (
                        <polyline
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          points={noiseSweepResult.sweepResults.map((r, i) => {
                            const x = 50 + (i / 5) * 600;
                            const y = 200 - (Math.min(50, r.theoreticalBerPercent) / 50) * 180;
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                      )}

                      {/* Empirical Curve Line */}
                      {noiseSweepResult?.sweepResults && (
                        <polyline
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2.5"
                          points={noiseSweepResult.sweepResults.map((r, i) => {
                            const x = 50 + (i / 5) * 600;
                            const y = 200 - (Math.min(50, r.empiricalBerPercent) / 50) * 180;
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                      )}

                      {/* Empirical Points */}
                      {noiseSweepResult?.sweepResults?.map((r, i) => {
                        const x = 50 + (i / 5) * 600;
                        const y = 200 - (Math.min(50, r.empiricalBerPercent) / 50) * 180;
                        return (
                          <circle key={i} cx={x} cy={y} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                        );
                      })}
                    </svg>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: FSK vs ASK vs PSK Digital Modulation Comparison */}
          {activeTab === 'comparison' && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  Digital Modulation Comparison Laboratory (ASK vs FSK vs PSK)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Side-by-side synchronized waveform visualization and structural parameter comparison for identical binary sequence ({binaryString}).
                </p>
              </div>

              {/* Synchronized 3-Signal Waveform Display */}
              <div style={{
                backgroundColor: '#0a0f1d',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #1e293b',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                {/* ASK */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b' }}>
                      1. Amplitude Shift Keying (ASK / OOK) - Amplitude shifts between A and 0.2*A
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Bandwidth: 2.0 kHz</span>
                  </div>
                  <svg viewBox="0 0 700 45" style={{ width: '100%', height: '45px', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '4px' }}>
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.6"
                      points={comparisonResult?.askSignal?.map((val, idx) => {
                        const x = (idx / comparisonResult.askSignal.length) * 700;
                        const y = 22 - val * 18;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  </svg>
                </div>

                {/* FSK */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#34d399' }}>
                      2. Frequency Shift Keying (FSK) - Frequency shifts between f0 ({f0} Hz) and f1 ({f1} Hz)
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Carson Bandwidth: {simResult?.bandwidthKhz} kHz</span>
                  </div>
                  <svg viewBox="0 0 700 45" style={{ width: '100%', height: '45px', backgroundColor: 'rgba(52, 211, 153, 0.05)', borderRadius: '4px' }}>
                    <polyline
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="1.6"
                      points={comparisonResult?.fskSignal?.map((val, idx) => {
                        const x = (idx / comparisonResult.fskSignal.length) * 700;
                        const y = 22 - val * 18;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  </svg>
                </div>

                {/* PSK */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#a78bfa' }}>
                      3. Phase Shift Keying (BPSK) - Phase flips 180° between 0 rad and π rad
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Bandwidth: 2.0 kHz (Antipodal)</span>
                  </div>
                  <svg viewBox="0 0 700 45" style={{ width: '100%', height: '45px', backgroundColor: 'rgba(167, 139, 250, 0.05)', borderRadius: '4px' }}>
                    <polyline
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="1.6"
                      points={comparisonResult?.pskSignal?.map((val, idx) => {
                        const x = (idx / comparisonResult.pskSignal.length) * 700;
                        const y = 22 - val * 18;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  </svg>
                </div>
              </div>

              {/* Comparative Analysis Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Technique</th>
                      <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Parameter Varied</th>
                      <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Bandwidth Requirement</th>
                      <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Noise Immunity</th>
                      <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Circuit Complexity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResult?.comparison?.techniques?.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: idx === 0 ? '#f59e0b' : (idx === 1 ? '#34d399' : '#a78bfa') }}>
                          {t.name}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>
                          {t.parameterChanged}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                          {t.bandwidthEfficiency}
                        </td>
                        <td style={{ padding: '10px 12px', color: idx === 0 ? '#ef4444' : (idx === 1 ? '#10b981' : '#38bdf8'), fontWeight: 600 }}>
                          {t.noiseImmunity}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                          {t.complexity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: 6-Step Guided Educational Mode */}
          {activeTab === 'educational' && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  FSK Educational Walkthrough Mode (6 Stages)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Walk through the complete physical modulation and demodulation lifecycle step-by-step.
                </p>
              </div>

              {/* Stepper Progress Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {[
                  '1. Binary Bits',
                  '2. Frequency Mapping',
                  '3. Carrier Signal',
                  '4. Channel & Noise',
                  '5. Correlator Demod',
                  '6. Recovered Bits'
                ].map((stepName, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => setEduStep(sIdx)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      border: eduStep === sIdx ? '2px solid #38bdf8' : '1px solid var(--border-color)',
                      backgroundColor: eduStep === sIdx ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-tertiary)',
                      color: eduStep === sIdx ? '#38bdf8' : 'var(--text-muted)',
                      fontSize: '0.74rem',
                      fontWeight: eduStep === sIdx ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {stepName}
                  </button>
                ))}
              </div>

              {/* Active Step Content Card */}
              <div style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '10px',
                padding: '20px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {eduStep === 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#38bdf8' }}>Step 1: Digital Binary Input Stream</h4>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                      Digital information originates as discrete binary symbols (bits) representing 0s and 1s.
                      In this experiment, the input is: <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{binaryString}</strong>.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      {binaryString.split('').map((bit, idx) => (
                        <div key={idx} style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: bit === '1' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                          border: `1px solid ${bit === '1' ? '#34d399' : '#38bdf8'}`,
                          color: bit === '1' ? '#34d399' : '#38bdf8',
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          fontFamily: 'monospace'
                        }}>
                          {bit}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {eduStep === 1 && (
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#38bdf8' }}>Step 2: Frequency Symbol Mapping</h4>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                      In Binary FSK, each binary state is assigned a distinct sinusoidal frequency:
                      <br />• <strong>Bit 0 (Space)</strong> → Frequency <span style={{ color: '#38bdf8', fontWeight: 600 }}>f0 = {f0} Hz</span>
                      <br />• <strong>Bit 1 (Mark)</strong> → Frequency <span style={{ color: '#34d399', fontWeight: 600 }}>f1 = {f1} Hz</span>
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto' }}>
                      {simResult?.frequencyMapping?.map((m, idx) => (
                        <div key={idx} style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Bit {m.bit}</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: m.bit === 1 ? '#34d399' : '#38bdf8' }}>
                            {m.frequency} Hz
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {eduStep === 2 && (
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#38bdf8' }}>Step 3: Continuous Phase FSK Signal Generation</h4>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                      The transmitter modulates the carrier wave: s(t) = A * cos(2*pi*f_i*t + phi).
                      Continuous Phase FSK (CPFSK) prevents sudden phase jumps at bit transitions, limiting spectral splatter.
                    </p>
                    <div style={{ height: '70px', backgroundColor: '#0a0f1d', borderRadius: '6px', padding: '8px' }}>
                      <svg viewBox="0 0 700 50" style={{ width: '100%', height: '100%' }}>
                        <polyline
                          fill="none"
                          stroke="#34d399"
                          strokeWidth="1.8"
                          points={simResult?.fskSignal?.slice(0, 300).map((v, i) => `${(i / 300) * 700},${25 - v * 20}`).join(' ')}
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {eduStep === 3 && (
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#f59e0b' }}>Step 4: Transmission Through Physical Channel (Noise & Attenuation)</h4>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                      The physical medium adds Additive White Gaussian Noise (AWGN) and signal attenuation: r(t) = alpha * s(t) + n(t).
                      Current noise is set to <strong>{noisePercent}%</strong> (SNR = {simResult?.snrDb} dB).
                    </p>
                    <div style={{ height: '70px', backgroundColor: '#0a0f1d', borderRadius: '6px', padding: '8px' }}>
                      <svg viewBox="0 0 700 50" style={{ width: '100%', height: '100%' }}>
                        <polyline
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.6"
                          points={simResult?.receivedSignal?.slice(0, 300).map((v, i) => `${(i / 300) * 700},${25 - v * 20}`).join(' ')}
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {eduStep === 4 && (
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#a78bfa' }}>Step 5: Matched-Filter Quadrature Correlation</h4>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                      The receiver calculates in-phase and quadrature correlations with f0 and f1 over each bit duration:
                      E0 = I0^2 + Q0^2 and E1 = I1^2 + Q1^2.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '6px' }}>
                      {simResult?.correlationHistory?.map((c, idx) => (
                        <div key={idx} style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.72rem'
                        }}>
                          <div style={{ fontWeight: 600 }}>Bit #{idx + 1}</div>
                          <div style={{ color: '#38bdf8' }}>E(f0): {c.energyF0}</div>
                          <div style={{ color: '#34d399' }}>E(f1): {c.energyF1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {eduStep === 5 && (
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#10b981' }}>Step 6: Bit Decision & Recovered Stream</h4>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                      Decision rule: If E1 &gt; E0 decide bit 1, else decide bit 0.
                      BER = {simResult?.errors} errors / {simResult?.totalBits} bits = <strong>{simResult?.berPercent}%</strong>.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      {simResult?.rxBits?.map((bit, idx) => {
                        const isErr = simResult.errorPositions.includes(idx);
                        return (
                          <div key={idx} style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: isErr ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            border: `1px solid ${isErr ? '#ef4444' : '#10b981'}`,
                            color: isErr ? '#ef4444' : '#10b981',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            fontFamily: 'monospace'
                          }}>
                            {bit}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Navigation Buttons for Step Mode */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <button
                    disabled={eduStep === 0}
                    onClick={() => setEduStep(prev => prev - 1)}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      cursor: eduStep === 0 ? 'not-allowed' : 'pointer',
                      opacity: eduStep === 0 ? 0.5 : 1
                    }}
                  >
                    Previous Step
                  </button>
                  <button
                    disabled={eduStep === 5}
                    onClick={() => setEduStep(prev => prev + 1)}
                    style={{
                      padding: '6px 16px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: eduStep === 5 ? 'not-allowed' : 'pointer',
                      opacity: eduStep === 5 ? 0.5 : 1
                    }}
                  >
                    Next Step
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showReportModal && (
        <LabReportModal
          onClose={() => setShowReportModal(false)}
          fskData={{
            binaryString,
            f0,
            f1,
            bitDurationMs,
            noisePercent,
            attenuation,
            simResult
          }}
        />
      )}

      {showWhatIfModal && (
        <WhatIfModal
          onClose={() => setShowWhatIfModal(false)}
          baseParams={{
            bits: binaryString,
            f0,
            f1,
            bitDurationMs,
            noisePercent
          }}
        />
      )}
    </div>
  );
}
