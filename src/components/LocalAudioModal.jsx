import React, { useState } from 'react';
import { Upload, Mic, Disc3, Music, X, Layers, Check, Volume2, Search } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

export default function LocalAudioModal({
  isOpen,
  onClose,
  onLoadSingleTrack,
  onLoadMultiTracks,
  onOpenSearch
}) {
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'multi'

  // Single Track File
  const [singleFile, setSingleFile] = useState(null);

  // Multi-Track Files
  const [vocalFile, setVocalFile] = useState(null);
  const [accFile, setAccFile] = useState(null);

  const [vocalVol, setVocalVol] = useState(0.8);
  const [accVol, setAccVol] = useState(0.8);

  if (!isOpen) return null;

  const handleSingleSubmit = () => {
    if (!singleFile) return;
    const url = URL.createObjectURL(singleFile);
    onLoadSingleTrack({
      name: singleFile.name.replace(/\.[^/.]+$/, ""),
      singer: '本地合并音频',
      url,
      file: singleFile
    });
    onClose();
  };

  const handleMultiSubmit = () => {
    if (!vocalFile && !accFile) return;
    const vocalUrl = vocalFile ? URL.createObjectURL(vocalFile) : null;
    const accUrl = accFile ? URL.createObjectURL(accFile) : null;

    const trackName = vocalFile
      ? vocalFile.name.replace(/\.[^/.]+$/, "")
      : accFile.name.replace(/\.[^/.]+$/, "");

    onLoadMultiTracks({
      name: `[分轨] ${trackName}`,
      vocalUrl,
      accUrl,
      vocalName: vocalFile ? vocalFile.name : '',
      accName: accFile ? accFile.name : '',
      vocalVol,
      accVol
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center space-x-2 text-dream-cyan">
            <Upload className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white tracking-wide">选择本地音频 (单轨/分轨)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 bg-black/40 p-1.5">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2 ${
              activeTab === 'single'
                ? 'bg-dream-purple/20 border border-dream-purple/50 text-dream-purple shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>合并单轨歌曲 (MP3/WAV)</span>
          </button>
          <button
            onClick={() => setActiveTab('multi')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2 ${
              activeTab === 'multi'
                ? 'bg-dream-pink/20 border border-dream-pink/50 text-dream-pink shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>人声与伴奏分离轨 (多轨道)</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">

          {/* TAB 1: SINGLE MERGED TRACK */}
          {activeTab === 'single' && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-white/20 hover:border-dream-purple rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 transition group">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Music className="w-8 h-8 text-dream-purple group-hover:scale-110 transition" />
                  <span className="text-xs font-medium text-white/80">
                    {singleFile ? singleFile.name : '点击或拖拽上传本地单轨音频 (MP3, WAV, AAC, OGG)'}
                  </span>
                  {singleFile && (
                    <span className="text-[11px] text-green-400 font-mono">
                      {(singleFile.size / (1024 * 1024)).toFixed(2)} MB · 已准备就绪
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setSingleFile(e.target.files[0])}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleSingleSubmit}
                disabled={!singleFile}
                className="w-full py-3 bg-gradient-to-r from-dream-purple to-dream-pink text-white font-semibold rounded-xl text-sm hover:opacity-90 transition disabled:opacity-40"
              >
                立即播放此合并单轨
              </button>
            </div>
          )}

          {/* TAB 2: SEPARATED VOCAL + ACCOMPANIMENT TRACKS */}
          {activeTab === 'multi' && (
            <div className="space-y-4">
              
              {/* Vocal Track File Picker */}
              <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-dream-pink">
                  <span className="flex items-center space-x-1.5">
                    <Mic className="w-4 h-4" />
                    <span>人声轨道文件 (Vocal Track)</span>
                  </span>
                  {vocalFile && <span className="text-green-400 font-mono text-[11px]">已选择</span>}
                </div>
                <label className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition">
                  <span className="text-xs text-white/70 truncate max-w-[280px]">
                    {vocalFile ? vocalFile.name : '选择人声音频 (例如 song_vocal.mp3)'}
                  </span>
                  <span className="text-xs font-medium px-3 py-1 bg-dream-pink/20 text-dream-pink rounded-md">
                    浏览文件
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setVocalFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Accompaniment Track File Picker */}
              <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-dream-cyan">
                  <span className="flex items-center space-x-1.5">
                    <Disc3 className="w-4 h-4" />
                    <span>伴奏轨道文件 (Accompaniment Track)</span>
                  </span>
                  {accFile && <span className="text-green-400 font-mono text-[11px]">已选择</span>}
                </div>
                <label className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition">
                  <span className="text-xs text-white/70 truncate max-w-[280px]">
                    {accFile ? accFile.name : '选择伴奏音频 (例如 song_instrumental.mp3)'}
                  </span>
                  <span className="text-xs font-medium px-3 py-1 bg-dream-cyan/20 text-dream-cyan rounded-md">
                    浏览文件
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAccFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                onClick={handleMultiSubmit}
                disabled={!vocalFile && !accFile}
                className="w-full py-3 bg-gradient-to-r from-dream-pink via-dream-purple to-dream-cyan text-white font-semibold rounded-xl text-sm hover:opacity-90 transition disabled:opacity-40"
              >
                开启双轨道并行调音播放
              </button>
            </div>
          )}

          {/* Quick lyric match tip */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
            <span>选完本地音频后，可随时在线搜索匹配 LRC 歌词</span>
            <button
              onClick={() => {
                onClose();
                onOpenSearch();
              }}
              className="text-dream-purple hover:underline flex items-center space-x-1"
            >
              <Search className="w-3 h-3" />
              <span>去匹配歌词</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
