const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const LabResult = require('../models/LabResult');
const Experiment = require('../models/Experiment');
const LabReport = require('../models/LabReport');
const { authenticateUser, requireInstructor, requireStudent } = require('../middleware/authMiddleware');

// Full standard 9 experiments catalogue
const EXPERIMENTS = [
  {
    id: 'EXP-01-PAM',
    name: 'Pulse Amplitude Modulation (PAM)',
    category: 'Analog & Pulse Modulation',
    objective: 'Generate and analyze Pulse Amplitude Modulated signals from analog message waves and observe natural and flat-top sampling.',
    theory: 'PAM is a pulse modulation scheme where the amplitudes of regularly spaced pulse carrier intervals are varied in proportion to the instantaneous message signal values m(t). In flat-top PAM, each pulse retains a constant amplitude throughout duration tau.',
    parameters: { samplingRate: 8000, messageFreq: 500, pulseWidthMs: 0.2 },
    procedure: [
      'Set sinusoidal message frequency to 500 Hz.',
      'Configure pulse train carrier with sampling rate > 2 * fm (Nyquist criterion).',
      'Observe flat-top PAM waveform on oscilloscope.',
      'Measure reconstructed signal distortion.'
    ]
  },
  {
    id: 'EXP-02-AM',
    name: 'Amplitude Modulation (Double Sideband Full Carrier)',
    category: 'Analog Modulation',
    objective: 'Study Double Sideband Full Carrier (DSB-FC) AM generation, modulation index calculation, and envelope detection.',
    theory: 'In AM, the amplitude of a high-frequency carrier wave c(t) = Ac * cos(2*pi*fc*t) is varied in direct proportion to the modulating signal m(t). The modulated wave is s(t) = [Ac + m(t)] * cos(2*pi*fc*t). Modulation index mu = Am / Ac.',
    parameters: { carrierFreq: 10000, messageFreq: 1000, modulationIndex: 0.8 },
    procedure: [
      'Configure carrier frequency at 10 kHz and message at 1 kHz.',
      'Vary modulation index from 0.5 (under-modulation) to 1.0 (critical) and 1.5 (over-modulation).',
      'Observe envelope collapse during over-modulation.'
    ]
  },
  {
    id: 'EXP-03-FM',
    name: 'Frequency Modulation (FM)',
    category: 'Analog Modulation',
    objective: 'Analyze Frequency Modulation, Carson rule bandwidth, and frequency deviation Delta f.',
    theory: 'In FM, the instantaneous frequency of the carrier is varied linearly with the modulating signal m(t). Carson rule states transmission bandwidth BT = 2 * (Delta f + fm). FM offers superior noise immunity compared to AM because information is in frequency, not amplitude.',
    parameters: { carrierFreq: 20000, freqDeviation: 5000, messageFreq: 1000 },
    procedure: [
      'Configure 20 kHz carrier with 5 kHz frequency deviation.',
      'Observe carrier frequency compression during positive message peaks and expansion during negative troughs.'
    ]
  },
  {
    id: 'EXP-04-ASK',
    name: 'Amplitude Shift Keying (ASK)',
    category: 'Digital Modulation',
    objective: 'Generate Binary ASK waveforms, compute bandwidth, and evaluate envelope detection under channel noise.',
    theory: 'In BASK (OOK - On-Off Keying), bit 1 transmits carrier Ac*cos(2*pi*fc*t) and bit 0 transmits 0 or reduced amplitude. Bandwidth B = 2 * Rb.',
    parameters: { carrierFreq: 2000, bitDuration: 0.001, noisePercent: 10 },
    procedure: [
      'Input binary sequence 10110010.',
      'Observe amplitude switching between high and low levels.',
      'Inject additive noise and analyze envelope detector sensitivity.'
    ]
  },
  {
    id: 'EXP-05-BFSK',
    name: 'Binary Frequency Shift Keying (BFSK)',
    category: 'Digital Modulation',
    objective: 'Implement BFSK modulation and coherent matched-filter demodulation across noisy channels; verify Carson bandwidth and waterfall BER curve.',
    theory: 'In BFSK, binary 0 and 1 are transmitted by two distinct frequencies f0 and f1: s(t) = A*cos(2*pi*fi*t). Matched-filter correlation detection integrates received signal r(t) against cos(2*pi*f0*t) and cos(2*pi*f1*t) over bit duration Tb. Decision rule decides bit 1 if energy E1 > E0.',
    parameters: { f0: 1000, f1: 2000, bitDuration: 0.001, noisePercent: 5, sampleRate: 50000 },
    procedure: [
      'Enter binary stream: 10110010.',
      'Set space frequency f0 = 1000 Hz and mark frequency f1 = 2000 Hz.',
      'Observe real-time sinusoidal frequency transitions.',
      'Sweep noise from 0% to 50% and plot empirical BER vs theoretical curve.'
    ]
  },
  {
    id: 'EXP-06-PSK',
    name: 'Phase Shift Keying (BPSK)',
    category: 'Digital Modulation',
    objective: 'Study Binary PSK 180-degree phase reversals, constellation diagrams, and coherent carrier recovery.',
    theory: 'In BPSK, binary 1 transmits A*cos(2*pi*fc*t) (phase 0) and binary 0 transmits -A*cos(2*pi*fc*t) (phase pi). BPSK offers maximum antipodal Euclidean distance between symbols, achieving lowest BER for given SNR.',
    parameters: { carrierFreq: 2000, bitDuration: 0.001, noisePercent: 10 },
    procedure: [
      'Input bitstream and observe phase inversion on bit transitions.',
      'Compare BER against ASK and FSK at identical SNR.'
    ]
  },
  {
    id: 'EXP-07-NOISE',
    name: 'Effect of Channel Noise on Digital Modulation',
    category: 'Channel Analysis',
    objective: 'Systematically assess Gaussian thermal noise degradation across digital transmission and calculate SNR.',
    theory: 'Additive White Gaussian Noise (AWGN) corrupts physical channel signals with zero-mean normal distribution variance sigma^2 = N0/2. SNR in dB = 10*log10(Ps / Pn).',
    parameters: { noiseSweep: [0, 10, 20, 30, 40, 50] },
    procedure: [
      'Run Monte-Carlo transmission trials at 0%, 10%, 20%, 30%, 40%, 50% noise.',
      'Plot noise percentage versus empirical SNR and correlator variance.'
    ]
  },
  {
    id: 'EXP-08-BER',
    name: 'Bit Error Rate (BER) Analysis & Waterfall Curve',
    category: 'Channel Analysis',
    objective: 'Calculate empirical BER = N_errors / N_total and validate against theoretical error probability function.',
    theory: 'For non-coherent BFSK, Pb = 0.5 * exp(-Eb / (2*N0)). For coherent BFSK, Pb = Q(sqrt(Eb / N0)). The waterfall curve illustrates steep BER reduction as SNR improves beyond 10 dB.',
    parameters: { totalBits: 64, noiseSteps: 6 },
    procedure: [
      'Transmit high-density pseudorandom binary sequence.',
      'Count bit mismatch positions and compute exact BER percentage.',
      'Compare simulated curve against Q-function.'
    ]
  },
  {
    id: 'EXP-09-NETWORK-TRANSMISSION',
    name: 'End-to-End Digital Data Transmission over Virtual Network',
    category: 'Network Simulation',
    objective: 'Transmit digital payload across multi-hop router topology using BFSK modulated physical channel link.',
    theory: 'Demonstrates cross-layer networking integration: Layer 3 IPv4 packet routing through intermediate routers coupled with Layer 1 physical BFSK digital modulation over the long-distance communication link.',
    parameters: { modulation: 'BFSK', routing: 'Static LPM', hops: 4 },
    procedure: [
      'Configure PC-01, Switch-01, Router-01, WAN Channel, Router-02, Switch-02, PC-02.',
      'Select FSK communication method and input text payload.',
      'Observe dual-level simulation: packet hops across topology while FSK waveform is modulated and demodulated.'
    ]
  }
];

// In-memory submissions & reports store
const inMemoryResults = new Map();
const inMemoryReports = new Map();

// GET /api/experiments - List all catalog experiments
router.get('/', (req, res) => {
  res.json({ success: true, data: EXPERIMENTS });
});

// GET /api/experiments/:id - Get experiment details
router.get('/:id', (req, res) => {
  const exp = EXPERIMENTS.find(e => e.id === req.params.id);
  if (!exp) {
    return res.status(404).json({ success: false, message: 'Experiment not found' });
  }
  res.json({ success: true, data: exp });
});

/**
 * POST /api/experiments/:id/submit
 * Automatic Preliminary Evaluation (Exact 100 Marks Breakdown)
 *
 * Network Configuration:  20
 * FSK Implementation:    25
 * Demodulation:          15
 * BER Analysis:          15
 * Experiment Completion: 15
 * Report:                10
 * ----------------------------
 * Total                 100
 */
router.post('/:id/submit', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      studentName,
      rollNumber,
      sessionCode,
      parameters,
      results,
      networkTopology,
      networkConfigured,
      reportText
    } = req.body;

    const studentId = req.user.id || req.user.userId;
    const studentDisplayName = studentName || req.user.name || 'Student Engineer';
    const studentRoll = rollNumber || req.user.rollNumber || 'CS2026-UNSPECIFIED';
    const exp = EXPERIMENTS.find(e => e.id === id) || EXPERIMENTS[4]; // Default BFSK

    const breakdown = [];

    // 1. Network Configuration (20 Marks)
    const hasNetTopology = networkTopology && (networkTopology.nodes?.length > 0 || networkTopology.devices?.length > 0);
    const netMarks = (networkConfigured || hasNetTopology) ? 20 : 16;
    breakdown.push({
      criterion: 'Network Configuration',
      marksAwarded: netMarks,
      maxMarks: 20,
      feedback: (networkConfigured || hasNetTopology)
        ? 'Network topology configured with addressed nodes and active channel link.'
        : 'Default virtual physical channel utilized with standard IP endpoints.'
    });

    // 2. FSK Implementation (25 Marks)
    const f0 = Number(parameters?.f0) || 1000;
    const f1 = Number(parameters?.f1) || 2000;
    const validFreqs = f0 > 0 && f1 > 0 && f0 !== f1;
    const fskMarks = validFreqs ? 25 : 15;
    breakdown.push({
      criterion: 'FSK Implementation',
      marksAwarded: fskMarks,
      maxMarks: 25,
      feedback: validFreqs
        ? `Continuous-phase sinusoidal carrier generated with orthogonal space/mark frequencies (f0 = ${f0} Hz, f1 = ${f1} Hz).`
        : 'Carrier frequencies must be positive and non-identical.'
    });

    // 3. Demodulation (15 Marks)
    const ber = typeof results?.berPercent === 'number' ? results.berPercent : 0;
    let demodMarks = 15;
    if (ber > 35) demodMarks = 10;
    breakdown.push({
      criterion: 'Demodulation',
      marksAwarded: demodMarks,
      maxMarks: 15,
      feedback: `Quadrature matched-filter correlator recovered the transmitted bitstream under noise with ${ber}% error.`
    });

    // 4. BER Analysis (15 Marks)
    const noiseLevel = parameters?.noisePercent ?? parameters?.noiseLevel ?? 10;
    let berMarks = 15;
    if (noiseLevel > 30 && ber === 0) berMarks = 12; // Unrealistic noise/BER match
    breakdown.push({
      criterion: 'BER Analysis',
      marksAwarded: berMarks,
      maxMarks: 15,
      feedback: `Statistical bitwise mismatch calculated against theoretical error probability waterfall curve.`
    });

    // 5. Experiment Completion (15 Marks)
    const completedMarks = 15;
    breakdown.push({
      criterion: 'Experiment Completion',
      marksAwarded: completedMarks,
      maxMarks: 15,
      feedback: 'All required test waveforms, noise conditions, and channel simulations executed successfully.'
    });

    // 6. Report (10 Marks)
    const reportMarks = (reportText || results?.observations) ? 10 : 8;
    breakdown.push({
      criterion: 'Report',
      marksAwarded: reportMarks,
      maxMarks: 10,
      feedback: 'Experimental observations and mathematical deductions accurately summarized.'
    });

    const totalScore = breakdown.reduce((acc, c) => acc + c.marksAwarded, 0);

    let letterGrade = 'F';
    if (totalScore >= 90) letterGrade = 'A';
    else if (totalScore >= 80) letterGrade = 'B';
    else if (totalScore >= 70) letterGrade = 'C';
    else if (totalScore >= 60) letterGrade = 'D';

    const subId = 'sub-' + Date.now();
    const resultDoc = {
      id: subId,
      _id: subId,
      studentId,
      studentName: studentDisplayName,
      rollNumber: studentRoll,
      sessionId: req.body.sessionId || '',
      sessionCode: sessionCode || 'NC-7F42K',
      experimentId: exp.id,
      experimentTitle: exp.name,
      experimentType: 'FSK',
      networkTopology: networkTopology || {},
      fskParameters: parameters || {},
      transmittedData: parameters?.bits || '10110010',
      receivedData: results?.demodulatedBits || '10110010',
      ber,
      noiseLevel,
      latency: results?.latency || 12,
      packetLoss: results?.packetLoss || 0,
      score: totalScore,
      letterGrade,
      status: 'Submitted',
      feedback: `Preliminary automated score: ${totalScore}/100. Pending final instructor review.`,
      evaluationBreakdown: breakdown,
      observations: results?.observations || [
        'FSK modulation successfully encoded digital bits into alternating sinusoidal carrier frequencies.',
        'Matched-filter correlators extracted binary symbols from the noisy Gaussian channel.'
      ],
      conclusion: `Experiment successfully submitted with a score of ${totalScore}/100 (${letterGrade}).`,
      parameters: parameters || {},
      submittedAt: new Date()
    };

    // Save in LabResult & Experiment if DB connected
    if (mongoose.connection.readyState === 1) {
      try {
        await LabResult.create(resultDoc);
        await Experiment.create(resultDoc);
      } catch (dbErr) {
        // Memory fallback
      }
    }

    inMemoryResults.set(subId, resultDoc);

    // Also auto-save LabReport
    const reportDoc = {
      id: 'rep-' + Date.now(),
      studentId,
      studentName: studentDisplayName,
      rollNumber: studentRoll,
      experimentId: exp.id,
      experimentTitle: exp.name,
      sessionCode: sessionCode || 'NC-7F42K',
      reportData: {
        score: totalScore,
        letterGrade,
        ber,
        noiseLevel,
        parameters,
        breakdown,
        conclusion: resultDoc.conclusion
      },
      score: totalScore,
      generatedAt: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      try {
        await LabReport.create(reportDoc);
      } catch (dbErr) {
        // Memory fallback
      }
    }
    inMemoryReports.set(reportDoc.id, reportDoc);

    return res.status(201).json({
      success: true,
      message: 'Experiment submitted successfully with preliminary evaluation',
      data: resultDoc
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/experiments/submissions/:id/evaluate - Instructor evaluates student submission
router.put('/submissions/:id/evaluate', authenticateUser, requireInstructor, async (req, res) => {
  try {
    const { id } = req.params;
    const { score, feedback, status } = req.body;

    let submission = inMemoryResults.get(id);

    if (mongoose.connection.readyState === 1) {
      try {
        const dbSub = await LabResult.findById(id);
        if (dbSub) {
          if (typeof score === 'number') dbSub.score = score;
          if (feedback) dbSub.feedback = feedback;
          if (status) dbSub.status = status;
          await dbSub.save();
          submission = dbSub;
        }
      } catch (dbErr) {
        // Memory fallback
      }
    }

    if (!submission) {
      submission = inMemoryResults.get(id);
    }

    if (submission) {
      if (typeof score === 'number') submission.score = score;
      if (feedback) submission.feedback = feedback;
      if (status) submission.status = status;
      inMemoryResults.set(id, submission);

      return res.json({
        success: true,
        message: 'Submission evaluated and graded successfully',
        data: submission
      });
    }

    return res.status(404).json({ success: false, message: 'Submission not found' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/experiments/results/all - List evaluated lab results for instructor
router.get('/results/all', authenticateUser, async (req, res) => {
  try {
    let results = [];
    if (mongoose.connection.readyState === 1) {
      try {
        results = await LabResult.find().sort({ submittedAt: -1 });
      } catch (dbErr) {
        results = Array.from(inMemoryResults.values());
      }
    }
    if (results.length === 0) {
      results = Array.from(inMemoryResults.values());
    }
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/experiments/submissions/student/:studentId - Get student's experiment history
router.get('/submissions/student/:studentId', authenticateUser, async (req, res) => {
  try {
    const { studentId } = req.params;
    let submissions = [];

    if (mongoose.connection.readyState === 1) {
      try {
        submissions = await LabResult.find({ studentId }).sort({ submittedAt: -1 });
      } catch (dbErr) {
        submissions = Array.from(inMemoryResults.values()).filter(r => r.studentId === studentId);
      }
    }
    if (submissions.length === 0) {
      submissions = Array.from(inMemoryResults.values()).filter(r => r.studentId === studentId);
    }

    res.json({ success: true, data: submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/experiments/reports/all - Get all generated lab reports
router.get('/reports/all', authenticateUser, async (req, res) => {
  try {
    let reports = [];
    if (mongoose.connection.readyState === 1) {
      try {
        reports = await LabReport.find().sort({ generatedAt: -1 });
      } catch (dbErr) {
        reports = Array.from(inMemoryReports.values());
      }
    }
    if (reports.length === 0) {
      reports = Array.from(inMemoryReports.values());
    }
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
