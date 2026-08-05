import React from 'react';
import { VISUAL_MODES } from './VisualizerCanvas';
import { Check, Sparkles, X } from 'lucide-react';

export default function ModeSelector({ isOpen, onClose, currentMode, onSelectMode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center space-x-2 text-dream-cyan">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-base font-bold text-white tracking-wide">6 种超维动效模式</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭动效选择"
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modes Grid */}
        <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {VISUAL_MODES.map((mode) => {
            const isSelected = currentMode === mode.id;
            return (
              <div
                key={mode.id}
                onClick={() => {
                  onSelectMode(mode.id);
                  onClose();
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-white/10 border-dream-purple shadow-[0_0_15px_rgba(192,132,252,0.3)]'
                    : 'bg-zinc-800/40 border-white/5 hover:bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{mode.icon}</span>
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
                      <span>{mode.name}</span>
                    </h4>
                    <p className="text-xs text-white/50">{mode.desc}</p>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-dream-purple flex items-center justify-center text-black">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
