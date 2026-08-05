import React from 'react';
import { Download, X, Video } from 'lucide-react';

export default function RecorderModal({ isOpen, onClose, videoUrl, songName, mimeType }) {
  if (!isOpen || !videoUrl) return null;

  const isNativeMp4 = mimeType && mimeType.includes('mp4');
  const baseTitle = `DreamMelody_${(songName || 'Clip').replace(/\s+/g, '_')}_${Date.now()}`;

  const extension = isNativeMp4 ? 'mp4' : 'webm';
  const fileName = `${baseTitle}.${extension}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-xl bg-zinc-900/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center space-x-2 text-dream-pink">
            <Video className="w-5 h-5 animate-pulse" />
            <h2 className="text-lg font-bold text-white tracking-wide">视频片段录制完成</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭录制结果"
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview Player */}
        <div className="p-6 space-y-5 flex flex-col items-center">
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl relative">
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          </div>

          <div className="text-center space-y-1.5">
            <p className="text-sm font-bold text-white flex items-center justify-center space-x-1.5">
              <span>音画同步视频</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-400 border border-green-500/30">
                {isNativeMp4 ? 'MP4' : 'WebM'}
              </span>
            </p>
            <p className="text-xs text-white/50">页面录制包含完整界面；降级录制仅包含 Canvas 动效与音频</p>
          </div>

          {/* Download Options */}
          <div className="w-full space-y-2.5 pt-2">
            
            <a
              href={videoUrl}
              download={fileName}
              className="w-full py-3.5 bg-gradient-to-r from-dream-pink via-dream-purple to-dream-cyan text-white font-bold rounded-2xl text-sm hover:opacity-95 transition flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(192,132,252,0.4)]"
            >
              <Download className="w-4 h-4" />
              <span>下载 {isNativeMp4 ? 'MP4' : 'WebM'} 视频</span>
            </a>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-xs transition border border-white/5"
              >
                关闭
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
