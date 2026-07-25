import React, { useState, useEffect, useRef } from 'react';
import VisualizerCanvas, { VISUAL_MODES } from './components/VisualizerCanvas';
import LyricView from './components/LyricView';
import PlayerControls from './components/PlayerControls';
import SearchModal from './components/SearchModal';
import ModeSelector from './components/ModeSelector';
import MultiTrackPanel from './components/MultiTrackPanel';
import LocalAudioModal from './components/LocalAudioModal';
import RecorderModal from './components/RecorderModal';
import { audioEngine } from './lib/audioEngine';
import { parseLrc } from './lib/lrcParser';
import { searchSongs, getSongDetail, getApiKey } from './lib/yaohuApi';
import { cleanFileNameForSearch } from './lib/utils';
import { Search, Sparkles, FileAudio, Pin, PinOff, Video, Square } from 'lucide-react';

const DEFAULT_DEMO_SONG = {
  name: '梦幻旋律 (Dream Melody Demo)',
  singer: 'Cyberpunk Synthwave',
  cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
  url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
  lyrics: [
    { time: 0.0, text: "🎵 梦幻旋律音乐播放器 - Dream Melody Player" },
    { time: 3.0, text: "全网页 DOM 画面录制 · 支持一键导出 MP4 格式发朋友圈" },
    { time: 7.0, text: "丝滑羽化渐变 Karaoke 扫光高亮 · 零生硬切断感" },
    { time: 12.0, text: "单句沉浸专注模式 · 自动平滑平移与高亮" },
    { time: 18.0, text: "点击底部按钮【选择本地音频】立即导入您的专属音乐" },
    { time: 24.0, text: "Enjoy the Immersive Neon Music Visualization" },
  ]
};

// 获取浏览器支持的最佳 MP4 / WebM MIME 类型
function getBestVideoMimeType() {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

export default function App() {
  const [currentMode, setCurrentMode] = useState('classic-dream');
  const [currentSong, setCurrentSong] = useState(DEFAULT_DEMO_SONG);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Lyric offset micro-tuner (seconds)
  const [lyricOffset, setLyricOffset] = useState(0);

  // Auto searching state
  const [isAutoSearching, setIsAutoSearching] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [activeMimeType, setActiveMimeType] = useState('video/mp4');
  const [isRecorderModalOpen, setIsRecorderModalOpen] = useState(false);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const currentStreamRef = useRef(null);

  // Modals & Panels
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isMultiTrackOpen, setIsMultiTrackOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);

  // MultiTrack states
  const [isMultiTrack, setIsMultiTrack] = useState(false);
  const [vocalVol, setVocalVol] = useState(0.8);
  const [vocalMuted, setVocalMuted] = useState(false);
  const [accVol, setAccVol] = useState(0.8);
  const [accMuted, setAccMuted] = useState(false);
  const [vocalTrackName, setVocalTrackName] = useState('');
  const [accTrackName, setAccTrackName] = useState('');

  // UI Auto-Hide & Locking
  const [showUI, setShowUI] = useState(true);
  const [isUILocked, setIsUILocked] = useState(false);
  const hideTimerRef = useRef(null);

  // 鼠标移动唤醒 UI，锁定状态下常亮不隐藏
  useEffect(() => {
    if (isUILocked || isRecording) {
      setShowUI(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }

    const handleMouseMove = () => {
      setShowUI(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        if (isPlaying && !isSearchOpen && !isModeMenuOpen && !isMultiTrackOpen && !isLocalModalOpen && !isUILocked && !isRecording) {
          setShowUI(false);
        }
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, isSearchOpen, isModeMenuOpen, isMultiTrackOpen, isLocalModalOpen, isUILocked, isRecording]);

  // 初始化设置默认音频
  useEffect(() => {
    if (currentSong?.url && !isMultiTrack) {
      audioEngine.setMainTrack(currentSong.url);
    }
  }, [currentSong?.url]);

  // 音频播放时间轮询 Tick
  useEffect(() => {
    let intervalId;
    if (isPlaying) {
      intervalId = setInterval(() => {
        const cur = audioEngine.getCurrentTime();
        const dur = audioEngine.getDuration();
        setCurrentTime(cur);
        if (dur && !isNaN(dur)) setDuration(dur);
      }, 100);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying]);

  // 快捷键支持 (Space: 播放/暂停)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // 播放 / 暂停切换
  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn("Playback error:", err);
      });
    }
  };

  // 进度跳转 (Seek)
  const handleSeek = (time) => {
    audioEngine.seek(time);
    setCurrentTime(time);
  };

  // 全网页 DOM 录屏 (包含 MP4 优先支持)
  const startFullWebpageRecording = async () => {
    try {
      let screenStream = null;

      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "browser",
            frameRate: 60
          },
          audio: true
        });
      }

      if (!screenStream) {
        startCanvasFallbackRecording();
        return;
      }

      currentStreamRef.current = screenStream;
      const videoTrack = screenStream.getVideoTracks()[0];
      const audioTrack = audioEngine.getAudioStreamTrack();

      const tracks = [videoTrack];
      if (audioTrack) {
        tracks.push(audioTrack);
      } else if (screenStream.getAudioTracks().length > 0) {
        tracks.push(screenStream.getAudioTracks()[0]);
      }

      const combinedStream = new MediaStream(tracks);
      const mimeType = getBestVideoMimeType();
      setActiveMimeType(mimeType);

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 8000000 // 8Mbps 高清
      });

      videoTrack.onended = () => {
        stopRecording();
      };

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const rawType = mimeType.includes('mp4') ? 'video/mp4' : 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: rawType });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideoUrl(videoUrl);
        setIsRecorderModalOpen(true);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordTime(0);

      recordTimerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.warn("Full page recording notice:", err);
      startCanvasFallbackRecording();
    }
  };

  // 降级 Canvas 录制
  const startCanvasFallbackRecording = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas || !canvas.captureStream) {
      alert("您的浏览器不支持视频录制");
      return;
    }

    try {
      const canvasStream = canvas.captureStream(60);
      const audioTrack = audioEngine.getAudioStreamTrack();

      const tracks = [...canvasStream.getVideoTracks()];
      if (audioTrack) {
        tracks.push(audioTrack);
      }

      const combinedStream = new MediaStream(tracks);
      const mimeType = getBestVideoMimeType();
      setActiveMimeType(mimeType);

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5000000
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const rawType = mimeType.includes('mp4') ? 'video/mp4' : 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: rawType });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideoUrl(videoUrl);
        setIsRecorderModalOpen(true);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordTime(0);

      recordTimerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Fallback recording error:", err);
      alert(`无法开启录制: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(track => track.stop());
      currentStreamRef.current = null;
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startFullWebpageRecording();
    }
  };

  // 自动根据提取的歌名检索网络歌词
  const autoFetchLyricsForFileName = async (rawFileName) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    const cleanTitle = cleanFileNameForSearch(rawFileName);
    if (!cleanTitle) return;

    setIsAutoSearching(true);
    setLyricOffset(0);

    try {
      let searchRes = await searchSongs(cleanTitle, 'wy', 5);
      let source = 'wy';
      if (!searchRes.ok || !searchRes.songs || searchRes.songs.length === 0) {
        searchRes = await searchSongs(cleanTitle, 'kuwo', 5);
        source = 'kuwo';
      }

      if (searchRes.ok && searchRes.songs && searchRes.songs.length > 0) {
        const topSong = searchRes.songs[0];
        const detailRes = await getSongDetail(topSong, source);
        if (detailRes.ok && detailRes.song && detailRes.song.lyrics && detailRes.song.lyrics.length > 0) {
          setCurrentSong(prev => ({
            ...prev,
            name: topSong.name || prev.name,
            singer: topSong.singer || prev.singer,
            cover: topSong.cover || prev.cover,
            lyrics: detailRes.song.lyrics
          }));
        }
      }
    } catch (err) {
      console.warn("Auto lyric fetch notice:", err);
    } finally {
      setIsAutoSearching(false);
    }
  };

  // 选择在线整曲 (妖狐 API)
  const handleSelectSong = (song) => {
    setCurrentSong(song);
    setIsPlaying(false);
    setIsMultiTrack(false);
    setLyricOffset(0);
    if (song.url) {
      audioEngine.setMainTrack(song.url);
      setTimeout(() => {
        audioEngine.play().then(() => setIsPlaying(true));
      }, 300);
    }
  };

  // 保留当前音频，仅匹配在线歌词
  const handleImportLyricsOnly = (lyrics) => {
    setCurrentSong(prev => ({
      ...prev,
      lyrics
    }));
    setLyricOffset(0);
  };

  // 载入本地合并单轨
  const handleLoadSingleTrack = ({ name, singer, url, file }) => {
    setIsMultiTrack(false);
    setLyricOffset(0);
    const newSong = {
      name,
      singer: singer || '本地音频文件',
      cover: '',
      url,
      lyrics: []
    };
    setCurrentSong(newSong);
    audioEngine.setMainTrack(url);
    setTimeout(() => {
      audioEngine.play().then(() => setIsPlaying(true));
    }, 300);

    if (file && file.name) {
      autoFetchLyricsForFileName(file.name);
    } else {
      autoFetchLyricsForFileName(name);
    }
  };

  // 载入本地分轨 (人声 + 伴奏)
  const handleLoadMultiTracks = ({ name, vocalUrl, accUrl, vocalName, accName }) => {
    setIsMultiTrack(true);
    setVocalTrackName(vocalName);
    setAccTrackName(accName);
    setIsMultiTrackOpen(true);
    setLyricOffset(0);

    const newSong = {
      name,
      singer: '本地多轨道分轨',
      cover: '',
      url: vocalUrl || accUrl,
      lyrics: []
    };
    setCurrentSong(newSong);
    audioEngine.setMultiTracks(vocalUrl, accUrl);
    setTimeout(() => {
      audioEngine.play().then(() => setIsPlaying(true));
    }, 300);

    const targetName = vocalName || accName || name;
    autoFetchLyricsForFileName(targetName);
  };

  // 本地 LRC 歌词文件上传
  const handleUploadLrc = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const parsed = parseLrc(text);
      setCurrentSong(prev => ({
        ...prev,
        lyrics: parsed
      }));
      setLyricOffset(0);
    };
    reader.readAsText(file);
  };

  // 上传分轨人声
  const handleUploadVocal = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVocalTrackName(file.name);
    setIsMultiTrack(true);
    audioEngine.setMultiTracks(url, null);
    autoFetchLyricsForFileName(file.name);
  };

  // 上传分轨伴奏
  const handleUploadAcc = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAccTrackName(file.name);
    setIsMultiTrack(true);
    audioEngine.setMultiTracks(null, url);
    autoFetchLyricsForFileName(file.name);
  };

  const currentModeInfo = VISUAL_MODES.find(m => m.id === currentMode) || VISUAL_MODES[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* Visualizer Canvas Layer */}
      <VisualizerCanvas
        mode={currentMode}
        isPlaying={isPlaying}
        onCanvasClick={togglePlay}
      />

      {/* Apple Music Style Ambient Aurora Backdrop Blur Overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[10px] pointer-events-none z-[1]" />

      {/* Top Floating Bar (Auto Fade-out unless locked/recording) */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 p-4 md:p-6 flex items-center justify-between pointer-events-none transition-all duration-700 ${
          showUI || isUILocked || isRecording ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        {/* Brand & Active Mode Badge */}
        <div className="flex items-center space-x-3 pointer-events-auto">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center text-xl shadow-lg">
            {currentModeInfo.icon}
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-dream-pink via-dream-purple to-dream-cyan bg-clip-text text-transparent tracking-wider">
              梦幻旋律
            </h1>
            <p className="text-xs text-white/60">
              当前动效: <span style={{ color: currentModeInfo.color }} className="font-semibold">{currentModeInfo.name}</span>
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          {/* Video Recording Pill */}
          <button
            onClick={toggleRecording}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border backdrop-blur-xl text-xs font-semibold transition ${
              isRecording
                ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'bg-white/10 border-white/15 text-white/80 hover:text-red-400'
            }`}
            title={isRecording ? '点击停止录制并保存' : '录制全网页音画片段 (支持微信朋友圈 MP4 下载)'}
          >
            {isRecording ? <Square className="w-3.5 h-3.5 fill-current text-red-500" /> : <Video className="w-3.5 h-3.5 text-red-400" />}
            <span>{isRecording ? `录制中 (${recordTime}s)` : '录制 MP4 视频'}</span>
          </button>

          {/* Lock UI Button */}
          <button
            onClick={() => setIsUILocked(!isUILocked)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border backdrop-blur-xl text-xs font-medium transition ${
              isUILocked
                ? 'bg-dream-pink/20 border-dream-pink text-dream-pink'
                : 'bg-white/10 border-white/15 text-white/70 hover:text-white'
            }`}
            title={isUILocked ? '点击解除常亮' : '点击锁定控制栏常亮'}
          >
            {isUILocked ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
            <span>{isUILocked ? '控制栏已锁定' : '锁定控制栏'}</span>
          </button>

          <button
            onClick={() => setIsLocalModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-dream-cyan/20 border border-dream-cyan/40 backdrop-blur-xl text-xs text-dream-cyan hover:bg-dream-cyan hover:text-black font-medium transition"
          >
            <FileAudio className="w-3.5 h-3.5" />
            <span>选择本地音频</span>
          </button>

          <button
            onClick={() => setIsModeMenuOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-xl text-xs text-white transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-dream-purple" />
            <span className="hidden sm:inline">动效切换</span>
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-dream-purple to-dream-pink text-white text-xs font-semibold shadow-lg hover:opacity-90 transition"
          >
            <Search className="w-3.5 h-3.5" />
            <span>匹配歌词</span>
          </button>
        </div>
      </header>

      {/* Main Content: Lyrics View */}
      <main className="relative z-10 w-full h-full pt-16 pb-28">
        <LyricView
          lyrics={currentSong?.lyrics || []}
          currentTime={currentTime}
          duration={duration}
          onSeekLyric={handleSeek}
          isAutoSearching={isAutoSearching}
          lyricOffset={lyricOffset}
          onChangeOffset={(newOffset) => setLyricOffset(newOffset)}
        />
      </main>

      {/* Multi-Track Panel Floating Overlay */}
      {isMultiTrackOpen && (
        <div className="fixed right-6 bottom-28 z-40 animate-fade-in">
          <MultiTrackPanel
            isMultiTrack={isMultiTrack}
            onToggleMultiTrack={() => setIsMultiTrack(!isMultiTrack)}
            vocalVol={vocalVol}
            setVocalVol={setVocalVol}
            vocalMuted={vocalMuted}
            setVocalMuted={setVocalMuted}
            accVol={accVol}
            setAccVol={setAccVol}
            accMuted={accMuted}
            setAccMuted={setAccMuted}
            onUploadVocal={handleUploadVocal}
            onUploadAcc={handleUploadAcc}
            vocalTrackName={vocalTrackName}
            accTrackName={accTrackName}
          />
        </div>
      )}

      {/* Bottom Floating Player Controls */}
      <footer
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-700 ${
          showUI || isUILocked || isRecording ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        <PlayerControls
          currentSong={currentSong}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          volume={volume}
          setVolume={setVolume}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenModeMenu={() => setIsModeMenuOpen(true)}
          onToggleMultiTrackPanel={() => setIsMultiTrackOpen(!isMultiTrackOpen)}
          onOpenLocalModal={() => setIsLocalModalOpen(true)}
          onUploadLrc={handleUploadLrc}
          isUILocked={isUILocked}
          onToggleLockUI={() => setIsUILocked(!isUILocked)}
          isRecording={isRecording}
          recordTime={recordTime}
          onToggleRecord={toggleRecording}
        />
      </footer>

      {/* Modals */}
      <RecorderModal
        isOpen={isRecorderModalOpen}
        onClose={() => setIsRecorderModalOpen(false)}
        videoUrl={recordedVideoUrl}
        songName={currentSong?.name}
        mimeType={activeMimeType}
      />

      <LocalAudioModal
        isOpen={isLocalModalOpen}
        onClose={() => setIsLocalModalOpen(false)}
        onLoadSingleTrack={handleLoadSingleTrack}
        onLoadMultiTracks={handleLoadMultiTracks}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectSong={handleSelectSong}
        onImportLyricsOnly={handleImportLyricsOnly}
        currentSong={currentSong}
      />

      <ModeSelector
        isOpen={isModeMenuOpen}
        onClose={() => setIsModeMenuOpen(false)}
        currentMode={currentMode}
        onSelectMode={(modeId) => setCurrentMode(modeId)}
      />

    </div>
  );
}
