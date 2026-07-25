/**
 * 超级兼容 LRC 歌词解析器
 * 支持：
 * - 纯 LRC 字符串 (标准 [mm:ss.xx] / 极简 [m:s.x] / 冒号/逗号分隔 [mm:ss:ms] [mm:ss,ms])
 * - 转义换行符 `\\n` 自动解包
 * - JSON 数组 `[{ time, lineLyric }]` / `[{ time, text }]` 结构
 * - 重复时间戳在一行的拆分
 */

export function parseLrc(input) {
  if (!input) return [];

  // 1. 若输入直接为数组 (例如 酷我 lrclist JSON 数组)
  if (Array.isArray(input)) {
    return input
      .map(item => {
        if (!item || typeof item !== 'object') return null;
        const timeVal = item.time !== undefined ? item.time : (item.t !== undefined ? item.t : 0);
        const textVal = item.lineLyric || item.lyric || item.text || '';
        return {
          time: typeof timeVal === 'number' ? timeVal : parseFloat(timeVal || 0),
          text: String(textVal).trim()
        };
      })
      .filter(item => item && !isNaN(item.time) && item.text.length > 0)
      .sort((a, b) => a.time - b.time);
  }

  let lrcText = '';
  if (typeof input === 'string') {
    lrcText = input;
  } else if (typeof input === 'object') {
    lrcText = input.lrctxt || input.lrc || input.lyric || JSON.stringify(input);
  }

  // 2. 解码 JSON/API 接口转义的 \\n 与 \\r
  lrcText = lrcText.replace(/\\n/g, '\n').replace(/\\r/g, '');

  const lines = lrcText.split(/\r?\n/);
  const result = [];

  // 兼容绝大多数 LRC 时间标签: [00:12.34], [0:12.34], [00:12:34], [00:12,34], [00:12]
  const timeRegex = /\[(\d{1,}):(\d{2})(?:[:.,](\d{1,3}))?\]/g;
  const metaRegex = /^\[(ti|ar|al|by|offset|length|re|ve):/i;

  for (let line of lines) {
    line = line.trim();
    if (!line || metaRegex.test(line)) continue;

    timeRegex.lastIndex = 0;
    const timeMatches = [...line.matchAll(timeRegex)];
    if (timeMatches.length === 0) continue;

    // 提取纯歌词文本
    const text = line.replace(timeRegex, '').trim();

    for (const match of timeMatches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const sub = match[3];

      let msFraction = 0;
      if (sub) {
        if (sub.length === 1) {
          msFraction = parseInt(sub, 10) / 10;
        } else if (sub.length === 2) {
          msFraction = parseInt(sub, 10) / 100;
        } else if (sub.length === 3) {
          msFraction = parseInt(sub, 10) / 1000;
        }
      }

      const totalTime = minutes * 60 + seconds + msFraction;

      if (text) {
        result.push({
          time: parseFloat(totalTime.toFixed(3)),
          text
        });
      }
    }
  }

  // 3. 按时间升序排序
  result.sort((a, b) => a.time - b.time);

  return result;
}

/**
 * 根据当前播放时间获取活动的歌词索引
 */
export function getActiveLyricIndex(lyrics, currentTime) {
  if (!lyrics || lyrics.length === 0) return -1;
  let index = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}
