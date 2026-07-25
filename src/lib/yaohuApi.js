/**
 * 妖狐 API 音乐搜索与歌词解析客户端
 */

import { parseLrc } from './lrcParser';

const BASE_URL = 'https://api.yaohud.cn/api/music';
const LOCAL_STORAGE_KEY = 'yaohu_api_key';

// 限流器 (最小间隔 100ms)
class RateLimiter {
  constructor(minIntervalMs = 100) {
    this.minIntervalMs = minIntervalMs;
    this.lastTime = 0;
    this.queue = Promise.resolve();
  }

  enqueue(fn) {
    this.queue = this.queue.then(async () => {
      const now = Date.now();
      const timeSinceLast = now - this.lastTime;
      if (timeSinceLast < this.minIntervalMs) {
        await new Promise(resolve => setTimeout(resolve, this.minIntervalMs - timeSinceLast));
      }
      this.lastTime = Date.now();
      return fn();
    });
    return this.queue;
  }
}

const rateLimiter = new RateLimiter(100);

export function getApiKey() {
  return localStorage.getItem(LOCAL_STORAGE_KEY) || '';
}

export function setApiKey(key) {
  localStorage.setItem(LOCAL_STORAGE_KEY, key.trim());
}

/**
 * 封装带超时的 fetch 请求
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('请求超时（20s）');
    }
    throw err;
  }
}

/**
 * 限流网络请求
 */
async function safeFetchJson(url) {
  return rateLimiter.enqueue(async () => {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) {
        return { ok: false, error: `HTTP 错误: ${res.status}` };
      }
      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || '网络请求失败' };
    }
  });
}

/**
 * 搜索歌曲列表
 * GET /api/music/{source}?key={key}&msg={keyword}&g={count}
 */
export async function searchSongs(keyword, source = 'wy', count = 20) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, error: '请先在右上角或设置中配置妖狐 API Key' };
  }

  const validSources = ['wy', 'qq', 'kuwo'];
  const src = validSources.includes(source) ? source : 'wy';
  const url = `${BASE_URL}/${src}?key=${encodeURIComponent(apiKey)}&msg=${encodeURIComponent(keyword)}&g=${count}`;

  const res = await safeFetchJson(url);
  if (!res.ok) return res;

  const data = res.data;
  if (data.code !== 200 && data.code !== '200') {
    return { ok: false, error: data.msg || data.message || `API 错误 (${data.code})` };
  }

  // 整理歌曲列表
  let songs = [];
  if (Array.isArray(data.data)) {
    songs = data.data;
  } else if (data.data && Array.isArray(data.data.songs)) {
    songs = data.data.songs;
  } else if (data.songs && Array.isArray(data.songs)) {
    songs = data.songs;
  } else if (typeof data.data === 'object') {
    songs = Object.values(data.data).filter(item => item && typeof item === 'object');
  }

  const formattedSongs = songs.map((song, idx) => ({
    n: song.n || idx + 1,
    name: song.name || song.title || song.songname || '未知歌名',
    singer: song.singer || song.artist || song.author || '未知歌手',
    album: song.album || song.albumname || '',
    rid: song.rid || song.id || song.songmid || '',
    cover: song.cover || song.pic || song.img || '',
    url: song.url || song.mp3 || '',
    source: src
  }));

  return { ok: true, songs: formattedSongs };
}

/**
 * 广度/深度遍历寻找可能包含 LRC 歌词或 URL 的字段
 */
function extractLyricField(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') return obj.trim();

  // 如果包含 酷我/QQ 特有的 lrclist 数组
  if (Array.isArray(obj.lrclist)) return obj.lrclist;
  if (obj.lyric && Array.isArray(obj.lyric.lrclist)) return obj.lyric.lrclist;

  const candidateKeys = [
    'lrctxt', 'lrc', 'lyric', 'lrcurl', 'viplrc', 'text', 'songlrc', 'musiclrc'
  ];

  const queue = [obj];
  const visited = new Set();

  while (queue.length > 0) {
    const curr = queue.shift();
    if (!curr || typeof curr !== 'object' || visited.has(curr)) continue;
    visited.add(curr);

    for (const key of candidateKeys) {
      if (key in curr && curr[key]) {
        const val = curr[key];
        if (typeof val === 'string' && val.trim().length > 0) {
          return val.trim();
        } else if (Array.isArray(val)) {
          return val;
        } else if (typeof val === 'object') {
          queue.push(val);
        }
      }
    }

    for (const k of Object.keys(curr)) {
      if (curr[k] && typeof curr[k] === 'object' && !visited.has(curr[k])) {
        queue.push(curr[k]);
      }
    }
  }

  return null;
}

/**
 * 从 URL 获取歌词内容（支持 3 次追链）
 */
async function fetchLyricFromUrl(url, depth = 0) {
  if (depth > 3) return null;
  try {
    const res = await safeFetchJson(url);
    if (!res.ok) {
      const textRes = await rateLimiter.enqueue(() => fetchWithTimeout(url));
      const text = await textRes.text();
      return text;
    }

    const data = res.data;
    if (typeof data === 'string') return data;
    
    const embedded = extractLyricField(data) || extractLyricField(data.data);
    if (embedded) {
      if (typeof embedded === 'string' && (embedded.startsWith('http://') || embedded.startsWith('https://'))) {
        return fetchLyricFromUrl(embedded, depth + 1);
      }
      return embedded;
    }
    return JSON.stringify(data);
  } catch {
    return null;
  }
}

/**
 * 获取歌曲详情（播放链接与歌词）
 */
export async function getSongDetail(song, source = 'wy') {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, error: '缺少 API Key' };
  }

  const src = ['wy', 'qq', 'kuwo'].includes(source) ? source : 'wy';
  let url = `${BASE_URL}/${src}?key=${encodeURIComponent(apiKey)}&msg=${encodeURIComponent(song.name)}&n=${song.n || 1}`;
  if (src === 'kuwo') {
    url += '&size=lossless';
  }

  const res = await safeFetchJson(url);
  if (!res.ok) return res;

  const data = res.data;
  if (data.code !== 200 && data.code !== '200') {
    return { ok: false, error: data.msg || '获取单曲详情失败' };
  }

  const detailData = data.data || data;
  const playUrl = detailData.url || detailData.mp3 || detailData.musicurl || song.url;
  const coverUrl = detailData.cover || detailData.pic || detailData.img || song.cover;

  let rawLrc = extractLyricField(detailData);

  // 如果提取到的是 URL 链接 -> 追链拉取
  if (typeof rawLrc === 'string' && (rawLrc.startsWith('http://') || rawLrc.startsWith('https://'))) {
    rawLrc = await fetchLyricFromUrl(rawLrc);
  }

  // 酷我/QQ 回查与聚合备用
  if (!rawLrc) {
    if (src === 'kuwo' && (song.rid || detailData.rid)) {
      const rid = song.rid || detailData.rid;
      const retryUrl = `${BASE_URL}/kuwo?key=${encodeURIComponent(apiKey)}&action=song&id=${rid}`;
      const retryRes = await safeFetchJson(retryUrl);
      if (retryRes.ok && retryRes.data) {
        rawLrc = extractLyricField(retryRes.data.data || retryRes.data);
      }
    } else if (src === 'qq') {
      const mid = detailData.mid || detailData.songmid || song.rid || extractMidFromHtml(detailData.html);
      if (mid) {
        const lrcApiUrl = `${BASE_URL}/lrc?key=${encodeURIComponent(apiKey)}&mid=${mid}&type=qq`;
        const lrcRes = await safeFetchJson(lrcApiUrl);
        if (lrcRes.ok && lrcRes.data) {
          rawLrc = extractLyricField(lrcRes.data.data || lrcRes.data);
          if (typeof rawLrc === 'string' && (rawLrc.startsWith('http://') || rawLrc.startsWith('https://'))) {
            rawLrc = await fetchLyricFromUrl(rawLrc);
          }
        }
      }
    }
  }

  // 使用超级兼容解析器解析成 [{ time, text }] 时间轴
  const parsedLyrics = parseLrc(rawLrc);

  return {
    ok: true,
    song: {
      ...song,
      url: playUrl,
      cover: coverUrl,
      rawLrc,
      lyrics: parsedLyrics
    }
  };
}

function extractMidFromHtml(htmlStr) {
  if (!htmlStr || typeof htmlStr !== 'string') return '';
  const match = htmlStr.match(/\/songDetail\/([a-zA-Z0-9]+)/);
  return match ? match[1] : '';
}
