import test from 'node:test';
import assert from 'node:assert/strict';

import { cleanFileNameForSearch, formatTime } from '../src/lib/utils.js';

test('formatTime formats finite non-negative durations', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65.9), '01:05');
  assert.equal(formatTime(-1), '00:00');
  assert.equal(formatTime(Infinity), '00:00');
});

test('cleanFileNameForSearch removes extensions and track markers', () => {
  assert.equal(cleanFileNameForSearch('周杰伦 - 晴天（伴奏版）.mp3'), '周杰伦 - 晴天');
  assert.equal(cleanFileNameForSearch('Dream_Melody_vocal.wav'), 'Dream Melody');
  assert.equal(cleanFileNameForSearch('vocal.mp3'), '');
  assert.equal(cleanFileNameForSearch('Accident.mp3'), 'Accident');
  assert.equal(cleanFileNameForSearch(null), '');
});
