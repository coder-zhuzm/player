import test from 'node:test';
import assert from 'node:assert/strict';

import { getActiveLyricIndex, parseLrc } from '../src/lib/lrcParser.js';

test('parseLrc parses, sorts, and expands repeated timestamps', () => {
  const lyrics = parseLrc('[00:02.50][00:04,250]第二句\n[00:01]第一句');

  assert.deepEqual(lyrics, [
    { time: 1, text: '第一句' },
    { time: 2.5, text: '第二句' },
    { time: 4.25, text: '第二句' },
  ]);
});

test('parseLrc accepts escaped newlines and API array data', () => {
  assert.deepEqual(parseLrc('[0:01.5]甲\\n[0:02.050]乙'), [
    { time: 1.5, text: '甲' },
    { time: 2.05, text: '乙' },
  ]);
  assert.deepEqual(parseLrc([
    { time: '3.2', lineLyric: ' 后一句 ' },
    { t: 1, text: '前一句' },
  ]), [
    { time: 1, text: '前一句' },
    { time: 3.2, text: '后一句' },
  ]);
});

test('getActiveLyricIndex handles boundaries', () => {
  const lyrics = [{ time: 1, text: '甲' }, { time: 3, text: '乙' }];

  assert.equal(getActiveLyricIndex(lyrics, 0.9), -1);
  assert.equal(getActiveLyricIndex(lyrics, 1), 0);
  assert.equal(getActiveLyricIndex(lyrics, 3.5), 1);
  assert.equal(getActiveLyricIndex([], 1), -1);
});
