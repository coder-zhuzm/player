import React from 'react';
import { Volume2, VolumeX, Mic, Disc3, Upload, Layers, Sparkles } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

export default function MultiTrackPanel({
  isMultiTrack,
  vocalVol,
  setVocalVol,
  vocalMuted,
  setVocalMuted,
  vocalReverb,
  setVocalReverb,
  accVol,
  setAccVol,
  accMuted,
  setAccMuted,
  onUploadVocal,
  onUploadAcc,
  vocalTrackName,
  accTrackName
}) {
  return (
    <div className="bg-zinc-900/80 border border-white/10 backdrop-blur-xl rounded-2xl p-4 text-white shadow-2xl space-y-4 max-w-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2 text-dream-pink">
          <Layers className="w-5 h-5" />
          <h3 className="text-sm font-bold tracking-wide">多轨道同步调音面板</h3>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-dream-pink/20 border-dream-pink text-dream-pink">
          {isMultiTrack ? '分轨模式已开启' : '请先载入分轨'}
        </span>
      </div>

      {/* Vocal Track Controls */}
      <div className="space-y-2 bg-black/40 p-3 rounded-xl border border-white/5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center space-x-1.5 text-dream-pink font-semibold">
            <Mic className="w-4 h-4" />
            <span>人声轨道 (Vocal)</span>
          </span>
          <label className="cursor-pointer text-[11px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white/80 transition flex items-center space-x-1">
            <Upload className="w-3 h-3" />
            <span>{vocalTrackName ? '重传' : '上传人声'}</span>
            <input type="file" accept="audio/*" onChange={onUploadVocal} className="hidden" />
          </label>
        </div>
        {vocalTrackName && (
          <p className="text-[11px] text-white/50 truncate">已载入: {vocalTrackName}</p>
        )}

        <div className="flex items-center space-x-3 pt-1">
          <button
            onClick={() => {
              const newMute = !vocalMuted;
              setVocalMuted(newMute);
              audioEngine.setVocalVolume(vocalVol, newMute);
            }}
            className="text-white/70 hover:text-white transition"
          >
            {vocalMuted || vocalVol === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-dream-pink" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={vocalMuted ? 0 : vocalVol}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVocalVol(val);
              audioEngine.setVocalVolume(val, vocalMuted);
            }}
            className="flex-1 accent-dream-pink cursor-pointer h-1.5 bg-white/20 rounded-lg"
          />
          <span className="text-xs text-white/60 w-8 text-right">
            {vocalMuted ? 'Mute' : `${Math.round(vocalVol * 100)}%`}
          </span>
        </div>

        <div className="flex items-center space-x-3 pt-1 border-t border-white/5">
          <Sparkles className="w-4 h-4 text-dream-purple" />
          <label htmlFor="vocal-reverb" className="text-[11px] text-white/60 whitespace-nowrap">
            人声混响
          </label>
          <input
            id="vocal-reverb"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={vocalReverb}
            onChange={(event) => {
              const value = Number.parseFloat(event.target.value);
              setVocalReverb(value);
              audioEngine.setVocalReverb(value);
            }}
            className="flex-1 accent-dream-purple cursor-pointer h-1.5 bg-white/20 rounded-lg"
            aria-label="人声混响大小"
          />
          <span className="text-xs text-white/60 w-8 text-right">
            {Math.round(vocalReverb * 100)}%
          </span>
        </div>
      </div>

      {/* Accompaniment Track Controls */}
      <div className="space-y-2 bg-black/40 p-3 rounded-xl border border-white/5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center space-x-1.5 text-dream-cyan font-semibold">
            <Disc3 className="w-4 h-4" />
            <span>伴奏轨道 (Accompaniment)</span>
          </span>
          <label className="cursor-pointer text-[11px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white/80 transition flex items-center space-x-1">
            <Upload className="w-3 h-3" />
            <span>{accTrackName ? '重传' : '上传伴奏'}</span>
            <input type="file" accept="audio/*" onChange={onUploadAcc} className="hidden" />
          </label>
        </div>
        {accTrackName && (
          <p className="text-[11px] text-white/50 truncate">已载入: {accTrackName}</p>
        )}

        <div className="flex items-center space-x-3 pt-1">
          <button
            onClick={() => {
              const newMute = !accMuted;
              setAccMuted(newMute);
              audioEngine.setAccVolume(accVol, newMute);
            }}
            className="text-white/70 hover:text-white transition"
          >
            {accMuted || accVol === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-dream-cyan" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={accMuted ? 0 : accVol}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setAccVol(val);
              audioEngine.setAccVolume(val, accMuted);
            }}
            className="flex-1 accent-dream-cyan cursor-pointer h-1.5 bg-white/20 rounded-lg"
          />
          <span className="text-xs text-white/60 w-8 text-right">
            {accMuted ? 'Mute' : `${Math.round(accVol * 100)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}
