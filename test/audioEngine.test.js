import test from 'node:test';
import assert from 'node:assert/strict';

import { AudioEngine } from '../src/lib/audioEngine.js';

class FakeAudio {
  constructor() {
    this.src = '';
    this.currentTime = 0;
    this.duration = 120;
    this.ended = false;
    this.paused = true;
    this.listeners = new Map();
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  removeAttribute(name) {
    if (name === 'src') this.src = '';
  }

  load() {}
  pause() { this.paused = true; }
  play() { this.paused = false; return Promise.resolve(); }
}

const fakeNode = () => ({ connect() {} });

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = fakeNode();
  }

  createAnalyser() { return { ...fakeNode(), getByteFrequencyData() {}, getByteTimeDomainData() {} }; }
  createMediaStreamDestination() { return { ...fakeNode(), stream: { getAudioTracks: () => [] } }; }
  createGain() { return { ...fakeNode(), gain: { value: 1, setValueAtTime(value) { this.value = value; } } }; }
  createMediaElementSource() { return fakeNode(); }
}

function createEngine() {
  globalThis.Audio = FakeAudio;
  globalThis.window = { AudioContext: FakeAudioContext };
  return new AudioEngine();
}

test('switching between single and multi track clears inactive sources', () => {
  const engine = createEngine();
  engine.setMultiTracks('vocal.wav', 'acc.wav');
  engine.setMainTrack('song.wav');

  assert.equal(engine.getMode(), 'single');
  assert.equal(engine.mainAudio.src, 'song.wav');
  assert.equal(engine.vocalAudio.src, '');
  assert.equal(engine.accAudio.src, '');

  engine.setMultiTracks(null, 'new-acc.wav');
  assert.equal(engine.getMode(), 'multi');
  assert.equal(engine.mainAudio.src, '');
  assert.equal(engine.vocalAudio.src, '');
  assert.equal(engine.accAudio.src, 'new-acc.wav');
});

test('updating one stem preserves the other stem and pauses playback', () => {
  const engine = createEngine();
  engine.setMultiTracks('old-vocal.wav', 'acc.wav');
  engine.vocalAudio.paused = false;
  engine.accAudio.paused = false;

  engine.updateMultiTrack('vocal', 'new-vocal.wav');

  assert.equal(engine.vocalAudio.src, 'new-vocal.wav');
  assert.equal(engine.accAudio.src, 'acc.wav');
  assert.equal(engine.vocalAudio.paused, true);
  assert.equal(engine.accAudio.paused, true);
});

test('master volume covers every playback mode and seek clamps boundaries', () => {
  const engine = createEngine();
  engine.setMainTrack('song.wav');
  engine.setMasterVolume(0.35, false);
  assert.equal(engine.masterGain.gain.value, 0.35);
  engine.setMasterVolume(0.35, true);
  assert.equal(engine.masterGain.gain.value, 0);

  assert.equal(engine.seek(-5), 0);
  assert.equal(engine.mainAudio.currentTime, 0);
  assert.equal(engine.seek(500), 120);
  assert.equal(engine.mainAudio.currentTime, 120);
});
