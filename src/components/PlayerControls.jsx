import React from 'react';
import { Play, Pause, Volume2, VolumeX, Upload, Search, Sparkles, Layers, FileText, Pin, PinOff, Video, Square } from 'lucide-react';
import { formatTime } from '../lib/utils';
import { audioEngine } from '../lib/audioEngine';

export default function PlayerControls({
  currentSong,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  volume,
  setVolume,
  isMuted,
  setIsMuted,
  onOpenSearch,
  onOpenModeMenu,
  onToggleMultiTrackPanel,
  onOpenLocalModal,
  onUploadLrc,
  isUILocked,
  onToggleLockUI,
  isRecording,
  recordTime,
  onToggleRecord
}) {
  return (
    <div className="w-full pb-4 px-4 select-none">
      <div className="mx-auto max-w-4xl rounded-3xl bg-zinc-950/70 border border-white/15 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] px-6 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: Vinyl Cover & Track Title */}
        <div className="flex items-center space-x-3.5 w-full md:w-1/3 min-w-0">
          <div className="relative group w-12 h-12 rounded-2xl overflow-hidden bg-zinc-900 flex-shrink-0 shadow-lg border border-white/15">
            {currentSong?.cover ? (
              <img
                src={currentSong.cover}
                alt="cover"
                className={`w-full h-full object-cover ${isPlaying ? 'animate-spin-slow' : ''}`}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-dream-purple text-xl bg-gradient-to-br from-dream-purple/30 via-dream-pink/20 to-dream-cyan/20 ${isPlaying ? 'animate-spin-slow' : ''}`}>
                🎵
              </div>
            )}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white truncate tracking-wide">
              {currentSong?.name || '梦幻旋律播放器'}
            </h4>
            <p className="text-xs text-white/50 truncate font-light">
              {currentSong?.singer || '点击【选择本地音频】开始播放'}
            </p>
          </div>
        </div>

        {/* Center: Interactive Control Buttons & Seekbar */}
        <div className="flex flex-col items-center w-full md:w-2/4 max-w-md space-y-2">
          
          {/* Action Button Row */}
          <div className="flex items-center space-x-3 md:space-x-3.5">
            
            {/* Record Canvas Video Button */}
            <button
              onClick={onToggleRecord}
              title={isRecording ? '点击停止录制并保存视频' : '录制当前音画动效视频片段'}
              className={`p-2 rounded-xl transition-all duration-200 flex items-center space-x-1 ${
                isRecording
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                  : 'text-white/60 hover:text-red-400 hover:bg-white/10'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-4 h-4 fill-current text-red-500" />
                  <span className="text-xs font-mono font-bold">{formatTime(recordTime)}</span>
                </>
              ) : (
                <Video className="w-4 h-4 md:w-5 md:h-5" />
              )}
            </button>

            {/* Lock/Pin UI Controls */}
            <button
              onClick={onToggleLockUI}
              title={isUILocked ? 'UI 已锁定常亮 (点击取消锁定)' : '锁定 UI 面板常亮不自动隐藏'}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isUILocked
                  ? 'bg-dream-pink/20 text-dream-pink border border-dream-pink/40 shadow-[0_0_12px_rgba(244,114,182,0.4)]'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {isUILocked ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
            </button>

            {/* Visualizer Mode Select */}
            <button
              onClick={onOpenModeMenu}
              title="切换 6 种动效模式"
              className="p-2 text-white/70 hover:text-dream-cyan hover:bg-white/10 rounded-xl transition-all duration-200"
            >
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {/* Online Lyric Match Search */}
            <button
              onClick={onOpenSearch}
              title="匹配全网歌词"
              className="p-2 text-white/70 hover:text-dream-purple hover:bg-white/10 rounded-xl transition-all duration-200"
            >
              <Search className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {/* Play / Pause Main Trigger */}
            <button
              onClick={onTogglePlay}
              className="p-3.5 bg-gradient-to-r from-dream-pink via-dream-purple to-dream-cyan text-white rounded-full shadow-[0_0_25px_rgba(192,132,252,0.6)] hover:scale-105 active:scale-95 transition-all duration-200"
            >
              {isPlaying ? <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" /> : <Play className="w-5 h-5 md:w-6 md:h-6 fill-current ml-0.5" />}
            </button>

            {/* Multi-Track Controls Panel */}
            <button
              onClick={onToggleMultiTrackPanel}
              title="分轨调音面板"
              className="p-2 text-white/70 hover:text-dream-pink hover:bg-white/10 rounded-xl transition-all duration-200"
            >
              <Layers className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {/* Upload Local Audio Modal */}
            <button
              onClick={onOpenLocalModal}
              title="选择本地音频文件"
              className="p-2 text-dream-cyan hover:bg-dream-cyan/20 rounded-xl transition-all duration-200"
            >
              <Upload className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {/* Local LRC File Upload */}
            <label
              title="导入本地 LRC 文件"
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer transition-all duration-200"
            >
              <FileText className="w-4 h-4 md:w-5 md:h-5" />
              <input type="file" accept=".lrc,.txt" onChange={onUploadLrc} className="hidden" />
            </label>
          </div>

          {/* Progress Seekbar */}
          <div className="w-full flex items-center space-x-3 text-[11px] text-white/50 font-mono">
            <span className="w-9 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime || 0}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="flex-1 accent-dream-purple h-1 bg-white/20 rounded-lg cursor-pointer hover:h-1.5 transition-all"
            />
            <span className="w-9">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Master Volume Slider */}
        <div className="hidden md:flex items-center justify-end space-x-3 w-1/3">
          <button
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              audioEngine.setMainVolume(volume, nextMuted);
            }}
            className="text-white/70 hover:text-white transition"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              audioEngine.setMainVolume(val, isMuted);
            }}
            className="w-20 accent-dream-cyan h-1 bg-white/20 rounded-lg cursor-pointer"
          />
        </div>

      </div>
    </div>
  );
}
