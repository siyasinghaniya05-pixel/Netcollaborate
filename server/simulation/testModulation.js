const {
  generateFskSignal,
  applyChannelDistortion,
  demodulateFskSignal,
  runFskPipeline,
  generateNoiseVsBerSweep,
  generateModulationComparison,
  textToBits,
  bitsToText
} = require('./modulationEngine');

console.log('========================================================');
console.log('   NetCollaborate DSP & Modulation Engine Unit Tests');
console.log('========================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
  }
}

// Test 1: Bit text encoding and decoding
console.log('Test Suite 1: ASCII <-> Binary Conversion');
const originalText = 'NET';
const textBits = textToBits(originalText);
assert(textBits.length === 24, `Text "NET" converts to 24 bits (got ${textBits.length})`);
const recoveredText = bitsToText(textBits);
assert(recoveredText === originalText, `Recovered text "${recoveredText}" matches "${originalText}"`);

// Test 2: BFSK Generation
console.log('\nTest Suite 2: BFSK Signal Generation');
const testBits = [1, 0, 1, 1, 0, 0, 1, 0];
const fskGen = generateFskSignal(testBits, { f0: 1000, f1: 2000, bitDuration: 0.001, samplesPerBit: 50 });
assert(fskGen.totalBits === 8, 'Generates 8 bits');
assert(fskGen.time.length === 400, `Generates 400 time samples (50 samples * 8 bits, got ${fskGen.time.length})`);
assert(fskGen.frequencyMapping.length === 8, 'Generates 8 frequency mappings');
assert(fskGen.frequencyMapping[0].frequency === 2000, 'Bit 1 maps to f1 (2000 Hz)');
assert(fskGen.frequencyMapping[1].frequency === 1000, 'Bit 0 maps to f0 (1000 Hz)');

// Test 3: Zero Noise Transmission and Matched-Filter Demodulation
console.log('\nTest Suite 3: Ideal Channel Demodulation (0% Noise)');
const cleanPipeline = runFskPipeline(testBits, { f0: 1000, f1: 2000, noisePercent: 0 });
assert(cleanPipeline.errors === 0, `Zero noise has 0 bit errors (got ${cleanPipeline.errors})`);
assert(cleanPipeline.ber === 0, `BER is 0.0% (got ${cleanPipeline.berPercent}%)`);
assert(cleanPipeline.status === 'SUCCESS', `Pipeline status is SUCCESS (got ${cleanPipeline.status})`);
assert(cleanPipeline.rxBits.join('') === testBits.join(''), `Demodulated bits (${cleanPipeline.rxBits.join('')}) match transmitted bits (${testBits.join('')})`);

// Test 4: Channel Noise and BER Calculation
console.log('\nTest Suite 4: Noisy Channel & BER');
const noisyPipeline = runFskPipeline(testBits, { f0: 1000, f1: 2000, noisePercent: 40 });
assert(typeof noisyPipeline.snrDb === 'number', `Calculates SNR in dB: ${noisyPipeline.snrDb} dB`);
assert(typeof noisyPipeline.berPercent === 'number', `Calculates BER percent: ${noisyPipeline.berPercent}%`);
assert(noisyPipeline.bandwidthHz > 0, `Calculates Carson's Bandwidth: ${noisyPipeline.bandwidthHz} Hz`);
assert(noisyPipeline.observations.length > 0, `Generates dynamic academic observations (${noisyPipeline.observations.length} points)`);

// Test 5: Noise vs BER Sweep
console.log('\nTest Suite 5: Noise vs BER Sweep Analysis');
const sweep = generateNoiseVsBerSweep(testBits, { f0: 1000, f1: 2000 });
assert(sweep.sweepResults.length === 6, `Generates 6 sweep points (0%, 10%, 20%, 30%, 40%, 50%)`);
assert(sweep.sweepResults[0].noisePercent === 0 && sweep.sweepResults[0].empiricalBer === 0, '0% noise yields 0% empirical BER');
assert(sweep.sweepResults[5].noisePercent === 50, '50% noise point is present');

// Test 6: FSK vs ASK vs PSK Comparison
console.log('\nTest Suite 6: Multi-Modulation Comparison');
const comparison = generateModulationComparison(testBits, { carrierFreq: 1500, f0: 1000, f1: 2000 });
assert(comparison.askSignal.length === 400, 'ASK signal waveform generated');
assert(comparison.fskSignal.length === 400, 'FSK signal waveform generated');
assert(comparison.pskSignal.length === 400, 'PSK signal waveform generated');
assert(comparison.comparison.techniques.length === 3, 'Includes 3 comparison techniques');

console.log('\n========================================================');
console.log(`Results: ${passedTests}/${totalTests} Tests Passed`);
console.log('========================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
