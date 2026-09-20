const express = require('express');
const router = express.Router();
const {
  generateFskSignal,
  applyChannelDistortion,
  demodulateFskSignal,
  runFskPipeline,
  generateNoiseVsBerSweep,
  generateModulationComparison,
  textToBits,
  bitsToText
} = require('../simulation/modulationEngine');

// POST /api/modulation/fsk/modulate
router.post('/fsk/modulate', (req, res) => {
  try {
    const { bits, text, f0, f1, bitDuration, samplesPerBit, amplitude } = req.body;
    const inputBits = text ? textToBits(text) : bits;
    const result = generateFskSignal(inputBits, { f0, f1, bitDuration, samplesPerBit, amplitude });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/modulation/fsk/demodulate
router.post('/fsk/demodulate', (req, res) => {
  try {
    const channelResult = req.body;
    const result = demodulateFskSignal(channelResult);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/modulation/fsk/analyze (End-to-End modulation -> channel -> demodulation -> BER)
router.post('/fsk/analyze', (req, res) => {
  try {
    const { bits, text, f0, f1, bitDuration, noisePercent, attenuation, delaySamples } = req.body;
    const inputBits = text ? textToBits(text) : (bits || [1, 0, 1, 1, 0, 0, 1, 0]);
    const result = runFskPipeline(inputBits, {
      f0,
      f1,
      bitDuration,
      noisePercent,
      attenuation,
      delaySamples
    });

    if (text) {
      result.recoveredText = bitsToText(result.rxBits);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/modulation/fsk/sweep-noise
router.post('/fsk/sweep-noise', (req, res) => {
  try {
    const { bits, f0, f1, bitDuration } = req.body;
    const inputBits = bits || [1, 0, 1, 1, 0, 0, 1, 0];
    const sweep = generateNoiseVsBerSweep(inputBits, { f0, f1, bitDuration });
    res.json({ success: true, data: sweep });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/modulation/compare (ASK vs FSK vs PSK)
router.post('/compare', (req, res) => {
  try {
    const { bits, carrierFreq, f0, f1, bitDuration, noisePercent } = req.body;
    const inputBits = bits || [1, 0, 1, 1, 0, 0, 1, 0];
    const result = generateModulationComparison(inputBits, {
      carrierFreq,
      f0,
      f1,
      bitDuration,
      noisePercent
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
