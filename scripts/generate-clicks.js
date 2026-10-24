/**
 * Generates the metronome click samples in assets/sounds/ as 16-bit mono WAV.
 * Deterministic (no randomness), so re-running produces identical files.
 *
 *   node scripts/generate-clicks.js
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const DURATION_S = 0.05;

// accent: count 1 (higher, louder); count: other counts; and: quiet "and" tick.
const CLICKS = {
  accent: { freq: 1760, gain: 0.95, decay: 60 },
  count: { freq: 1175, gain: 0.7, decay: 70 },
  and: { freq: 880, gain: 0.35, decay: 90 },
};

function renderClick({ freq, gain, decay }) {
  const n = Math.round(SAMPLE_RATE * DURATION_S);
  const samples = new Int16Array(n);
  const attack = Math.round(SAMPLE_RATE * 0.001);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, i / attack) * Math.exp(-decay * t);
    // Fundamental plus a little second harmonic for a woodblock-ish snap.
    const v = Math.sin(2 * Math.PI * freq * t) * 0.8 + Math.sin(4 * Math.PI * freq * t) * 0.2;
    samples[i] = Math.round(Math.max(-1, Math.min(1, v * env * gain)) * 32767);
  }
  return samples;
}

function wav(samples) {
  const dataBytes = samples.length * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(samples[i], 44 + i * 2);
  return buf;
}

const outDir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });
for (const [name, spec] of Object.entries(CLICKS)) {
  const file = path.join(outDir, `click-${name}.wav`);
  fs.writeFileSync(file, wav(renderClick(spec)));
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
