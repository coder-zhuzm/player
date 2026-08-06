/**
 * 妖狐 API 音乐搜索与歌词客户端。
 *
 * 接口说明：
 * - 网易 /api/music/wy
 * - QQ   /api/music/qq
 * - 酷我 /api/music/kuwo
 * - 聚合歌词 /api/music/lrc（平台类型为 wy / qq / kw）
 */

import { parseLrc } from './lrcParser.js';

const BASE_URL = 'https://api.yaohud.cn/api/music';
const LOCAL_STORAGE_KEY = 'yaohu_api_key';

const SOURCE_CONFIG = {
  wy: { endpoint: 'wy', lyricType: 'wy', idKeys: ['id', 'songid', 'mid'], supportsSearchCount: true },
  // QQ 文档仍列出 g，但当前接口网关会以“参数 g 未配置，禁止传递”拒绝请求。
  qq: { endpoint: 'qq', lyricType: 'qq', idKeys: ['mid', 'songmid', 'id'], supportsSearchCount: false },
  kuwo: { endpoint: 'kuwo', lyricType: 'kw', idKeys: ['rid', 'id', 'musicrid'], supportsSearchCount: true }
};

class RateLimiter {
  constructor(minIntervalMs = 400) {
    this.minIntervalMs = minIntervalMs;
    this.lastTime = 0;
    this.queue = Promise.resolve();
  }

  enqueue(fn) {
    this.queue = this.queue.then(async () => {
      const elapsed = Date.now() - this.lastTime;
      if (elapsed < this.minIntervalMs) {
        await new Promise(resolve => setTimeout(resolve, this.minIntervalMs - elapsed));
      }
      this.lastTime = Date.now();
      return fn();
    });
    return this.queue;
  }
}

const rateLimiter = new RateLimiter();

export function getApiKey() {
  return globalThis.localStorage?.getItem(LOCAL_STORAGE_KEY) || '';
}

export function setApiKey(key) {
  globalThis.localStorage?.setItem(LOCAL_STORAGE_KEY, String(key || '').trim());
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('请求超时（20 秒）');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function safeFetch(url) {
  return rateLimiter.enqueue(async () => {
    try {
      const response = await fetchWithTimeout(url);
      const body = await response.text();
      let data = body;

      try {
        data = JSON.parse(body);
      } catch {
        // 部分歌词地址直接返回 LRC 文本。
      }

      if (!response.ok) {
        const apiMessage = data && typeof data === 'object' ? data.msg || data.message : '';
        return { ok: false, error: apiMessage || `HTTP 错误：${response.status}`, data };
      }

      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error.message || '网络请求失败' };
    }
  });
}

function isSuccessPayload(data) {
  return data && (data.code === 200 || data.code === '200');
}

function sourceConfig(source) {
  return SOURCE_CONFIG[source] || SOURCE_CONFIG.wy;
}

function firstValue(object, keys) {
  for (const key of keys) {
    if (object?.[key] !== undefined && object[key] !== null && object[key] !== '') {
      return object[key];
    }
  }
  return '';
}

function getPlatformId(...objects) {
  const source = objects.pop();
  const keys = sourceConfig(source).idKeys;
  for (const object of objects) {
    const id = firstValue(object, keys);
    if (id) return String(id).replace(/^MUSIC_/, '');
  }
  return '';
}

export async function searchSongs(keyword, source = 'wy', count = 20) {
  const apiKey = getApiKey();
  if (!apiKey) return { ok: false, error: '请先配置妖狐 API Key' };

  const src = SOURCE_CONFIG[source] ? source : 'wy';
  const config = sourceConfig(src);
  const requestedCount = Math.max(1, Math.min(Number(count) || 20, 50));
  const params = new URLSearchParams({
    key: apiKey,
    msg: String(keyword || '').trim()
  });
  if (config.supportsSearchCount) params.set('g', String(requestedCount));
  const response = await safeFetch(`${BASE_URL}/${config.endpoint}?${params}`);
  if (!response.ok) return response;

  const payload = response.data;
  if (!isSuccessPayload(payload)) {
    return { ok: false, error: payload?.msg || payload?.message || `API 错误（${payload?.code ?? '未知'}）` };
  }

  const data = payload.data;
  let songs = [];
  if (Array.isArray(data)) songs = data;
  else if (Array.isArray(data?.songs)) songs = data.songs;
  else if (Array.isArray(payload.songs)) songs = payload.songs;

  return {
    ok: true,
    songs: songs.slice(0, requestedCount).map((song, index) => {
      const platformId = getPlatformId(song, src);
      return {
        ...song,
        n: song.n || index + 1,
        name: song.name || song.title || song.songname || '未知歌名',
        singer: song.singer || song.artist || song.author || '未知歌手',
        album: song.album || song.albumname || '',
        rid: song.rid || platformId,
        mid: song.mid || song.songmid || platformId,
        cover: song.cover || song.picture || song.pic || song.img || '',
        url: song.url || song.musicurl || song.mp3 || '',
        source: src
      };
    })
  };
}

const LYRIC_KEYS = new Set([
  'lrctxt', 'lrc', 'lyric', 'lrcurl', 'viplrc', 'songlrc', 'musiclrc', 'lrclist'
]);

function collectLyricCandidates(root) {
  if (!root) return [];
  if (typeof root === 'string' || Array.isArray(root)) return [root];

  const candidates = [];
  const queue = [root];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || visited.has(current)) continue;
    visited.add(current);

    for (const [key, value] of Object.entries(current)) {
      if (!value) continue;
      if (LYRIC_KEYS.has(key.toLowerCase()) && (typeof value === 'string' || Array.isArray(value))) {
        candidates.push(value);
      }
      if (typeof value === 'object') queue.push(value);
    }
  }

  return candidates;
}

async function parseFirstUsableLyric(root, depth = 0) {
  for (const candidate of collectLyricCandidates(root)) {
    if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate.trim())) {
      if (depth >= 3) continue;
      const response = await safeFetch(candidate.trim());
      if (!response.ok) continue;
      const resolved = await parseFirstUsableLyric(response.data, depth + 1);
      if (resolved.lyrics.length) return resolved;
      continue;
    }

    const lyrics = parseLrc(candidate);
    if (lyrics.length) return { rawLrc: candidate, lyrics };
  }

  return { rawLrc: null, lyrics: [] };
}

function extractIdFromDetail(detail) {
  const strings = [detail?.html, detail?.lrc, detail?.lrcurl, detail?.music?.lrcurl];
  for (const value of strings) {
    if (typeof value !== 'string') continue;
    const match = value.match(/(?:songDetail\/|[?&](?:id|mid)=)([a-zA-Z0-9_]+)/);
    if (match) return match[1].replace(/^MUSIC_/, '');
  }
  return '';
}

async function fetchAggregateLyrics(platformId, source, apiKey) {
  if (!platformId) return { rawLrc: null, lyrics: [], error: '接口未返回可用于查询歌词的歌曲 ID' };

  const params = new URLSearchParams({
    key: apiKey,
    mid: platformId,
    type: sourceConfig(source).lyricType
  });
  const response = await safeFetch(`${BASE_URL}/lrc?${params}`);
  if (!response.ok) return { rawLrc: null, lyrics: [], error: response.error };
  if (!isSuccessPayload(response.data)) {
    return { rawLrc: null, lyrics: [], error: response.data?.msg || '聚合歌词接口返回失败' };
  }

  const parsed = await parseFirstUsableLyric(response.data.data || response.data);
  return parsed.lyrics.length ? parsed : { ...parsed, error: '聚合歌词接口未返回时间轴歌词' };
}

export async function getSongDetail(song, source = 'wy') {
  const apiKey = getApiKey();
  if (!apiKey) return { ok: false, error: '缺少 API Key' };

  const src = SOURCE_CONFIG[source] ? source : 'wy';
  const config = sourceConfig(src);
  const platformId = getPlatformId(song, src);
  const params = new URLSearchParams({ key: apiKey });

  if (src === 'kuwo' && platformId) {
    // 当前网关即使在 action=song 模式下仍会强制校验 msg。
    params.set('msg', song.name || '');
    params.set('action', 'song');
    params.set('id', platformId);
    params.set('size', 'lossless');
  } else {
    params.set('msg', song.name || '');
    params.set('n', String(song.n || 1));
  }

  const response = await safeFetch(`${BASE_URL}/${config.endpoint}?${params}`);
  if (!response.ok) return response;
  if (!isSuccessPayload(response.data)) {
    return { ok: false, error: response.data?.msg || response.data?.message || '获取单曲详情失败' };
  }

  const detail = response.data.data || response.data;
  const playUrl = detail.url
    || detail.musicurl
    || detail.music_url?.url
    || detail.vipmusic?.url
    || detail.music?.url
    || song.url
    || '';
  const coverUrl = detail.cover || detail.picture || detail.pic || detail.img || song.cover || '';

  let lyricResult = await parseFirstUsableLyric(detail);
  let lyricError = '';
  if (!lyricResult.lyrics.length) {
    const resolvedId = getPlatformId(detail, song, src) || extractIdFromDetail(detail);
    lyricResult = await fetchAggregateLyrics(resolvedId, src, apiKey);
    lyricError = lyricResult.error || '';
  }

  return {
    ok: true,
    lyricError,
    song: {
      ...song,
      ...detail,
      source: src,
      url: playUrl,
      cover: coverUrl,
      rawLrc: lyricResult.rawLrc,
      lyrics: lyricResult.lyrics
    }
  };
}
