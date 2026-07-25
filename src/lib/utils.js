import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 从本地文件名清理无用字符，提取最佳歌名进行 API 检索
 */
export function cleanFileNameForSearch(filename) {
  if (!filename || typeof filename !== 'string') return '';

  let clean = filename
    // 移除拓展名
    .replace(/\.(mp3|wav|flac|aac|ogg|m4a|wma|ape)$/i, '')
    // 移除分轨常见后缀
    .replace(/[-_ ]*(vocal|acc|instrumental|accompaniment|stem|人声|伴奏|主唱|分轨)/gi, '')
    .replace(/[\(\（][^\)\）]*(vocal|acc|instrumental|伴奏|人声)[^\)\）]*[\)\）]/gi, '')
    // 替换下划线与多余空格
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return clean || filename;
}
