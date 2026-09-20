/**
 * NetCollaborate - Client Mathematical Digital Signal Processing (DSP) Engine
 * 
 * Provides high-performance in-browser signal calculation for interactive
 * oscilloscope rendering, BFSK/ASK/PSK comparisons, noise sweeps, and BER analysis.
 */

function gaussianRandom(mean = 0, stdDev = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

export function parseBits(input) {
  if (Array.isArray(input)) {
    return input.map(b => (b === 1 || b === '1' ? 1 : 0));
  }
  if (typeof input === 'string') {
    const clean = input.replace(/[^01]/g, '');
    if (clean.length === 0) return [1, 0, 1, 1, 0, 0, 1, 0];
    return clean.split('').map(c => (c === '1' ? 1 : 0));
  }
  return [1, 0, 1, 1, 0, 0, 1, 0];
}

export function textToBits(text) {
  const bits = [];
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) {
      bits.push((charCode >> b) & 1);
    }
  }
  return bits;
}

export function bitsToText(bits) {
  let text = '';
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.slice(i, i + 8);
    if (byte.length < 8) break;
    let charCode = 0;
    for (let b = 0; b < 8; b++) {
      charCode = (charCode << 1) | byte[b];
    }
    text += String.fromCharCode(charCode);
  }
  return text;
}

export function generateFskSignal(rawBits, options = {}) {
  const bits = parseBits(rawBits);
  const f0 = Number(options.f0) || 1000;
  const f1 = Number(options.f1) || 2000;
  const bitDuration = Number(options.bitDuration) || 0.001;
  const samplesPerBit = Number(options.samplesPerBit) || 50;
  const amplitude = Number(options.amplitude) || 1.0;

  const totalBits = bits.length;
  const dt = bitDuration / samplesPerBit;
  const sampleRate = 1 / dt;

  const time = [];
  const digitalSignal = [];
  const fskSignal = [];
  const frequencyMapping = [];

  let currentPhase = 0;

  for (let i = 0; i < totalBits; i++) {
    const bit = bits[i];
    const freq = bit === 1 ? f1 : f0;
    frequencyMapping.push({
      bitIndex: i,
      bit,
      frequency: freq,
      label: bit === 1 ? `f1 (${freq} Hz)` : `f0 (${freq} Hz)`
    });

    for (let s = 0; s < samplesPerBit; s++) {
      const t = (i * samplesPerBit + s) * dt;
      time.push(t);
      digitalSignal.push(bit);

      currentPhase += 2 * Math.PI * freq * dt;
      const val = amplitude * Math.cos(currentPhase);
      fskSignal.push(val);
    }
  }

  return {
    bits,
    totalBits,
    f0,
    f1,
    bitDuration,
    samplesPerBit,
    sampleRate,
    time,
    digitalSignal,
    fskSignal,
    frequencyMapping
  };
}

export function applyChannelDistortion(fskResult, options = {}) {
  const { fskSignal } = fskResult;
  const noisePercent = Math.max(0, Math.min(100, Number(options.noisePercent) || 0));
  const attenuation = Math.max(0.1, Math.min(1.0, Number(options.attenuation) || 1.0));
  const delaySamples = Math.floor(Number(options.delaySamples) || 0);

  const noiseStdDev = (noisePercent / 100) * 0.95;

  const receivedSignal = [];
  const noiseOnly = [];

  for (let i = 0; i < fskSignal.length; i++) {
    const srcIndex = i - delaySamples;
    const cleanSample = srcIndex >= 0 ? fskSignal[srcIndex] * attenuation : 0;
    const noiseSample = noiseStdDev > 0 ? gaussianRandom(0, noiseStdDev) : 0;
    noiseOnly.push(noiseSample);
    receivedSignal.push(cleanSample + noiseSample);
  }

  let signalPower = 0;
  let noisePower = 0;
  for (let i = 0; i < fskSignal.length; i++) {
    signalPower += Math.pow(fskSignal[i] * attenuation, 2);
    noisePower += Math.pow(noiseOnly[i], 2);
  }
  signalPower /= fskSignal.length;
  noisePower = Math.max(0.000001, noisePower / fskSignal.length);
  const snrLinear = signalPower / noisePower;
  const snrDb = noisePercent === 0 ? 50 : Math.round(10 * Math.log10(snrLinear) * 10) / 10;

  return {
    ...fskResult,
    noisePercent,
    attenuation,
    delaySamples,
    snrDb,
    noiseOnly,
    receivedSignal
  };
}

export function demodulateFskSignal(channelResult) {
  const {
    bits: txBits,
    receivedSignal,
    f0,
    f1,
    samplesPerBit,
    sampleRate,
    bitDuration
  } = channelResult;

  const totalBits = txBits.length;
  const dt = 1 / sampleRate;
  const rxBits = [];
  const correlationHistory = [];
  const demodulatedDigitalSignal = [];

  for (let i = 0; i < totalBits; i++) {
    const startIdx = i * samplesPerBit;

    let I0 = 0;
    let Q0 = 0;
    let I1 = 0;
    let Q1 = 0;

    for (let s = 0; s < samplesPerBit; s++) {
      const idx = startIdx + s;
      if (idx >= receivedSignal.length) break;
      const r = receivedSignal[idx];
      const t = s * dt;

      I0 += r * Math.cos(2 * Math.PI * f0 * t);
      Q0 += r * Math.sin(2 * Math.PI * f0 * t);

      I1 += r * Math.cos(2 * Math.PI * f1 * t);
      Q1 += r * Math.sin(2 * Math.PI * f1 * t);
    }

    const E0 = I0 * I0 + Q0 * Q0;
    const E1 = I1 * I1 + Q1 * Q1;

    const detectedBit = E1 >= E0 ? 1 : 0;
    rxBits.push(detectedBit);

    correlationHistory.push({
      bitIndex: i,
      txBit: txBits[i],
      rxBit: detectedBit,
      energyF0: Math.round(E0 * 100) / 100,
      energyF1: Math.round(E1 * 100) / 100,
      isCorrect: detectedBit === txBits[i]
    });

    for (let s = 0; s < samplesPerBit; s++) {
      demodulatedDigitalSignal.push(detectedBit);
    }
  }

  let errors = 0;
  const errorPositions = [];
  for (let i = 0; i < totalBits; i++) {
    if (txBits[i] !== rxBits[i]) {
      errors++;
      errorPositions.push(i);
    }
  }

  const ber = totalBits > 0 ? (errors / totalBits) : 0;
  const berPercent = Math.round(ber * 10000) / 100;

  const deltaF = Math.abs(f1 - f0);
  const bitRate = 1 / bitDuration;
  const bandwidth = deltaF + 2 * bitRate;

  const transmissionTimeMs = Math.round(totalBits * bitDuration * 1000 * 10) / 10;
  const throughputBps = Math.round((totalBits - errors) / (totalBits * bitDuration));

  const observations = generateObservations({
    totalBits,
    errors,
    berPercent,
    f0,
    f1,
    noisePercent: channelResult.noisePercent,
    snrDb: channelResult.snrDb,
    bandwidth
  });

  return {
    ...channelResult,
    rxBits,
    demodulatedDigitalSignal,
    correlationHistory,
    totalBits,
    correctBits: totalBits - errors,
    errors,
    errorPositions,
    ber,
    berPercent,
    status: errors === 0 ? 'SUCCESS' : (errors <= totalBits * 0.2 ? 'ACCEPTABLE' : 'DEGRADED'),
    bandwidthHz: bandwidth,
    bandwidthKhz: Math.round(bandwidth / 10) / 100,
    bitRateBps: bitRate,
    throughputBps,
    transmissionTimeMs,
    observations
  };
}

export function runFskPipeline(rawBits, options = {}) {
  const modulated = generateFskSignal(rawBits, options);
  const distorted = applyChannelDistortion(modulated, options);
  return demodulateFskSignal(distorted);
}

export function generateObservations({ totalBits, errors, berPercent, f0, f1, noisePercent, snrDb, bandwidth }) {
  const points = [];

  points.push(`The binary sequence of ${totalBits} bits was mapped to frequencies f0 = ${f0} Hz and f1 = ${f1} Hz with continuous phase transitions.`);
  points.push(`Estimated transmission channel bandwidth by Carson's Rule is ${bandwidth} Hz with frequency separation of ${Math.abs(f1 - f0)} Hz.`);

  if (noisePercent === 0) {
    points.push(`With an ideal noiseless channel (Noise: 0%, SNR: ${snrDb} dB), correlation energy detection achieved 100% fidelity (BER: 0.0%).`);
  } else if (errors === 0) {
    points.push(`Despite simulated Gaussian channel noise of ${noisePercent}% (SNR: ${snrDb} dB), the matched filter's frequency orthogonality maintained error-free transmission (BER: 0.0%).`);
  } else {
    points.push(`At ${noisePercent}% channel noise (SNR: ${snrDb} dB), noise perturbation pushed the received correlator decision statistics across the threshold, inducing ${errors} bit error(s) (BER: ${berPercent}%).`);
    points.push(`Demodulator energy detection confirmed that higher noise levels increase false frequency estimations, directly validating the theoretical waterfall BER curve.`);
  }

  return points;
}

export function generateNoiseVsBerSweep(rawBits, options = {}) {
  const noiseLevels = [0, 10, 20, 30, 40, 50];
  const sweepResults = [];

  const baseModulated = generateFskSignal(rawBits, options);

  noiseLevels.forEach(noise => {
    let totalErrors = 0;
    let totalBitsEvaluated = 0;
    let avgSnr = 0;
    const iterations = 5;

    for (let iter = 0; iter < iterations; iter++) {
      const distorted = applyChannelDistortion(baseModulated, { ...options, noisePercent: noise });
      const demod = demodulateFskSignal(distorted);
      totalErrors += demod.errors;
      totalBitsEvaluated += demod.totalBits;
      avgSnr += distorted.snrDb;
    }

    avgSnr /= iterations;
    const empiricalBer = totalErrors / totalBitsEvaluated;

    const snrLinear = Math.pow(10, avgSnr / 10);
    const theoreticalBer = noise === 0 ? 0 : Math.min(0.5, 0.5 * Math.exp(-snrLinear / 4));

    sweepResults.push({
      noisePercent: noise,
      snrDb: Math.round(avgSnr * 10) / 10,
      errors: totalErrors,
      totalBits: totalBitsEvaluated,
      empiricalBer: Math.round(empiricalBer * 1000) / 1000,
      empiricalBerPercent: Math.round(empiricalBer * 10000) / 100,
      theoreticalBer: Math.round(theoreticalBer * 1000) / 1000,
      theoreticalBerPercent: Math.round(theoreticalBer * 10000) / 100
    });
  });

  return {
    testBits: baseModulated.bits,
    sweepResults
  };
}

export function generateModulationComparison(rawBits, options = {}) {
  const bits = parseBits(rawBits);
  const fc = Number(options.carrierFreq) || 1500;
  const f0 = Number(options.f0) || 1000;
  const f1 = Number(options.f1) || 2000;
  const bitDuration = Number(options.bitDuration) || 0.001;
  const samplesPerBit = Number(options.samplesPerBit) || 50;

  const totalBits = bits.length;
  const dt = bitDuration / samplesPerBit;

  const time = [];
  const digitalSignal = [];
  const askSignal = [];
  const fskSignal = [];
  const pskSignal = [];

  let fskPhase = 0;

  for (let i = 0; i < totalBits; i++) {
    const bit = bits[i];
    const freq = bit === 1 ? f1 : f0;

    for (let s = 0; s < samplesPerBit; s++) {
      const t = (i * samplesPerBit + s) * dt;
      time.push(t);
      digitalSignal.push(bit);

      const askAmp = bit === 1 ? 1.0 : 0.2;
      askSignal.push(askAmp * Math.cos(2 * Math.PI * fc * t));

      fskPhase += 2 * Math.PI * freq * dt;
      fskSignal.push(Math.cos(fskPhase));

      const pskPhase = bit === 1 ? 0 : Math.PI;
      pskSignal.push(Math.cos(2 * Math.PI * fc * t + pskPhase));
    }
  }

  const comparison = {
    techniques: [
      {
        name: 'ASK (Amplitude Shift Keying)',
        parameterChanged: 'Amplitude',
        bandwidthEfficiency: 'High (B = 2/Tb)',
        noiseImmunity: 'Low (susceptible to amplitude noise)',
        powerEfficiency: 'Poor',
        complexity: 'Simple (envelope detector)',
        carsonBandwidthHz: 2 * (1 / bitDuration)
      },
      {
        name: 'FSK (Frequency Shift Keying)',
        parameterChanged: 'Frequency',
        bandwidthEfficiency: 'Moderate (|f1 - f0| + 2/Tb)',
        noiseImmunity: 'High (constant envelope, immune to amplitude fluctuations)',
        powerEfficiency: 'Good (constant envelope amplifier)',
        complexity: 'Moderate (dual-frequency correlators)',
        carsonBandwidthHz: Math.abs(f1 - f0) + 2 * (1 / bitDuration)
      },
      {
        name: 'PSK (Phase Shift Keying)',
        parameterChanged: 'Phase (0° vs 180°)',
        bandwidthEfficiency: 'High (B = 2/Tb)',
        noiseImmunity: 'Superior (maximum Euclidean distance in constellation)',
        powerEfficiency: 'Best',
        complexity: 'Higher (coherent carrier recovery)',
        carsonBandwidthHz: 2 * (1 / bitDuration)
      }
    ]
  };

  return {
    bits,
    time,
    digitalSignal,
    askSignal,
    fskSignal,
    pskSignal,
    comparison
  };
}
