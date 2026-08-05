import React, { useEffect, useRef, useState } from 'react';
import { getActiveLyricIndex } from '../lib/lrcParser';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlignJustify, Target, RotateCcw, Plus, Minus, Clock } from 'lucide-react';

/**
 * 丝滑羽化渐变歌词扫光高亮组件 (避免任何生硬切割感)
 */
function KaraokeText({ text, progress = 0 }) {
  const p = Math.min(100, Math.max(0, progress));

  // 0% - 100% 动态生成羽化边沿渐变
  const backgroundStyle = {
    backgroundImage: `linear-gradient(90deg, 
      #f472b6 0%, 
      #c084fc ${Math.max(0, p - 12)}%, 
      #00f3ff ${p}%, 
      rgba(255, 255, 255, 0.45) ${Math.min(100, p + 10)}%, 
      rgba(255, 255, 255, 0.35) 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    transition: 'background-image 0.12s ease-out',
  };

  return (
    <span
      className="inline-block tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
      style={backgroundStyle}
    >
      {text}
    </span>
  );
}

export default function LyricView({
  lyrics = [],
  currentTime = 0,
  duration = 0,
  onSeekLyric,
  isAutoSearching = false,
  lyricOffset = 0,
  onChangeOffset,
  matchStatus = { type: 'idle', message: '' },
  onOpenSearch
}) {
  // 应用歌词时间轴偏移量 (currentTime + offset)
  const adjustedTime = currentTime + lyricOffset;
  const activeIndex = getActiveLyricIndex(lyrics, adjustedTime);
  const containerRef = useRef(null);
  const activeItemRef = useRef(null);

  // 视图模式: 'single' (Apple Music 沉浸焦点) vs 'scroll' (全歌词长卷)
  const [viewMode, setViewMode] = useState('single');
  const [isAutoFollow, setIsAutoFollow] = useState(true);

  // 计算唱句句内渲染进度 (0 ~ 100%)
  const calculateLineProgress = (index) => {
    if (index < 0 || index >= lyrics.length) return 0;
    const startTime = lyrics[index].time;
    let endTime = Math.min(duration || (startTime + 5), startTime + 8);

    if (index < lyrics.length - 1) {
      endTime = lyrics[index + 1].time;
    }

    const lineDuration = Math.max(0.5, endTime - startTime);
    const elapsed = Math.max(0, adjustedTime - startTime);
    const progress = (elapsed / lineDuration) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const activeProgress = calculateLineProgress(activeIndex);

  // 全文列表模式下的平滑居中
  useEffect(() => {
    if (viewMode === 'scroll' && isAutoFollow && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, viewMode, isAutoFollow]);

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/50 space-y-4">
        <div className="px-8 py-5 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl text-center space-y-2 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-dream-purple/20 to-dream-pink/20 flex items-center justify-center text-3xl shadow-inner">
            🎵
          </div>
          <p className="text-base text-white/90 font-semibold tracking-wide">已成功载入本地音频文件</p>
          <p className="text-xs text-white/50 font-light">{matchStatus.message || '搜索在线歌词，或从底部导入本地 LRC 文件'}</p>
          <button
            onClick={onOpenSearch}
            className="mt-2 rounded-full border border-dream-purple/50 bg-dream-purple/15 px-4 py-1.5 text-xs font-semibold text-dream-purple hover:bg-dream-purple/25"
          >
            搜索匹配歌词
          </button>
        </div>
      </div>
    );
  }

  const currentLyric = lyrics[activeIndex] || null;
  const prevLyric = activeIndex > 0 ? lyrics[activeIndex - 1] : null;
  const nextLyric = activeIndex < lyrics.length - 1 ? lyrics[activeIndex + 1] : null;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden px-6">
      {(isAutoSearching || matchStatus.message) && (
        <div className={`absolute left-6 top-4 z-20 flex max-w-md items-center gap-2 rounded-full border px-4 py-2 text-xs backdrop-blur-2xl ${
          matchStatus.type === 'error' || matchStatus.type === 'needs-key'
            ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
            : 'border-white/15 bg-black/60 text-white/75'
        }`}>
          {isAutoSearching && <Sparkles className="h-3.5 w-3.5 animate-spin text-dream-purple" />}
          <span className="truncate">{matchStatus.message}</span>
          {(matchStatus.type === 'error' || matchStatus.type === 'needs-key') && (
            <button onClick={onOpenSearch} className="shrink-0 font-semibold text-dream-purple hover:underline">手动匹配</button>
          )}
        </div>
      )}
      
      {/* Sleek Floating Control Toolbar (Mode Switcher + Offset Micro-tuner) */}
      <div className="absolute top-4 right-6 z-20 flex items-center space-x-2">
        
        {/* Lyric Offset Micro-tuner Pill (-0.1s / Reset / +0.1s) */}
        <div className="flex items-center space-x-1 bg-black/60 border border-white/15 rounded-full px-2.5 py-1 backdrop-blur-2xl shadow-2xl text-xs text-white/80">
          <Clock className="w-3.5 h-3.5 text-dream-cyan mr-0.5" />
          <span className="text-[11px] font-mono w-14 text-center">
            {lyricOffset > 0 ? `+${lyricOffset.toFixed(1)}s` : `${lyricOffset.toFixed(1)}s`}
          </span>

          <button
            onClick={() => onChangeOffset && onChangeOffset(Number((lyricOffset - 0.1).toFixed(1)))}
            className="p-1 hover:bg-white/15 rounded-full transition text-white/70 hover:text-white"
            title="歌词延后 0.1 秒"
          >
            <Minus className="w-3 h-3" />
          </button>

          <button
            onClick={() => onChangeOffset && onChangeOffset(0)}
            className="p-1 hover:bg-white/15 rounded-full transition text-white/70 hover:text-dream-pink"
            title="重置歌词时间轴 (0s)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <button
            onClick={() => onChangeOffset && onChangeOffset(Number((lyricOffset + 0.1).toFixed(1)))}
            className="p-1 hover:bg-white/15 rounded-full transition text-white/70 hover:text-white"
            title="歌词提前 0.1 秒"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* View Mode Switcher Pill */}
        <div className="flex items-center bg-black/50 border border-white/15 rounded-full p-1 shadow-2xl backdrop-blur-2xl">
          <button
            onClick={() => setViewMode('single')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
              viewMode === 'single'
                ? 'bg-gradient-to-r from-dream-pink via-dream-purple to-dream-cyan text-white shadow-[0_0_15px_rgba(192,132,252,0.5)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>沉浸焦点</span>
          </button>

          <button
            onClick={() => setViewMode('scroll')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
              viewMode === 'scroll'
                ? 'bg-gradient-to-r from-dream-pink via-dream-purple to-dream-cyan text-white shadow-[0_0_15px_rgba(192,132,252,0.5)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <AlignJustify className="w-3.5 h-3.5" />
            <span>全卷展示</span>
          </button>
        </div>

      </div>

      {/* MODE 1: APPLE MUSIC FOCUS SPOTLIGHT WITH SOFT FEATHERED HIGHLIGHT */}
      {viewMode === 'single' && (
        <div className="w-full max-w-4xl flex flex-col items-center justify-center space-y-8 text-center py-6">
          
          {/* Previous Line */}
          <div className="h-10 flex items-center justify-center">
            {prevLyric ? (
              <p
                onClick={() => onSeekLyric && onSeekLyric(prevLyric.time - lyricOffset)}
                className="text-white/35 text-base md:text-lg lg:text-xl font-medium cursor-pointer hover:text-white/70 transition-all duration-300 truncate max-w-2xl [text-shadow:_0_2px_10px_rgba(0,0,0,0.8)]"
              >
                {prevLyric.text}
              </p>
            ) : (
              <span className="text-white/20 text-xs font-mono tracking-widest">◇ INTRO ◇</span>
            )}
          </div>

          {/* Active Line - Feathered Soft Gradient Sweep */}
          <div className="min-h-[140px] flex items-center justify-center px-4 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex >= 0 ? activeIndex : 'empty'}
                initial={{ opacity: 0, y: 18, filter: 'blur(8px)', scale: 0.96 }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
                exit={{ opacity: 0, y: -18, filter: 'blur(8px)', scale: 0.96 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => currentLyric && onSeekLyric && onSeekLyric(currentLyric.time - lyricOffset)}
                className="cursor-pointer group"
              >
                {currentLyric ? (
                  <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-relaxed group-hover:scale-105 transition-transform duration-300">
                    <KaraokeText
                      text={currentLyric.text}
                      progress={activeProgress}
                    />
                  </h2>
                ) : (
                  <h2 className="text-2xl text-white/40 font-light">🎵 准备播放...</h2>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Next Line */}
          <div className="h-10 flex items-center justify-center">
            {nextLyric ? (
              <p
                onClick={() => onSeekLyric && onSeekLyric(nextLyric.time - lyricOffset)}
                className="text-white/45 text-base md:text-lg lg:text-xl font-medium cursor-pointer hover:text-white/80 transition-all duration-300 truncate max-w-2xl [text-shadow:_0_2px_10px_rgba(0,0,0,0.8)]"
              >
                {nextLyric.text}
              </p>
            ) : (
              <span className="text-white/20 text-xs font-mono tracking-widest">◇ OUTRO ◇</span>
            )}
          </div>

        </div>
      )}

      {/* MODE 2: FULL SCROLLING LIST WITH SOFT FEATHERED HIGHLIGHT */}
      {viewMode === 'scroll' && (
        <div
          ref={containerRef}
          onWheel={() => setIsAutoFollow(false)}
          onTouchStart={() => setIsAutoFollow(false)}
          className="w-full h-full overflow-y-auto px-4 py-36 scroll-smooth no-scrollbar select-none text-center"
        >
          {!isAutoFollow && (
            <button
              onClick={() => setIsAutoFollow(true)}
              className="sticky top-0 z-10 mx-auto mb-4 rounded-full border border-white/15 bg-black/70 px-4 py-1.5 text-xs text-white/75 backdrop-blur-xl hover:text-white"
            >
              恢复自动跟随
            </button>
          )}
          <div className="space-y-6 max-w-2xl mx-auto py-8">
            {lyrics.map((item, index) => {
              const isActive = index === activeIndex;
              const lineProgress = isActive ? activeProgress : (index < activeIndex ? 100 : 0);
              const distance = Math.abs(index - activeIndex);
              const opacity = isActive ? 1 : Math.max(0.25, 1 - distance * 0.22);

              return (
                <div
                  key={`${item.time}-${index}`}
                  ref={isActive ? activeItemRef : null}
                  onClick={() => {
                    setIsAutoFollow(true);
                    onSeekLyric && onSeekLyric(item.time - lyricOffset);
                  }}
                  style={{ opacity }}
                  className={`transition-all duration-300 cursor-pointer py-2 px-4 rounded-2xl transform hover:opacity-100 hover:scale-105 ${
                    isActive ? 'scale-110 font-extrabold' : 'scale-100 font-medium'
                  }`}
                >
                  <span className="inline-block text-xl md:text-3xl font-extrabold tracking-tight">
                    <KaraokeText
                      text={item.text}
                      progress={lineProgress}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
