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
    { time: 3.0, text: "全网页 DOM 画面录制 · 自动选择浏览器支持的视频格式" },
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
  const [playbackNotice, setPlaybackNotice] = useState('');

  // Lyric offset micro-tuner (seconds)
  const [lyricOffset, setLyricOffset] = useState(0);

  // Auto searching state
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const [lyricMatchStatus, setLyricMatchStatus] = useState({ type: 'idle', message: '' });
  const [searchKeyword, setSearchKeyword] = useState('');

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [activeMimeType, setActiveMimeType] = useState('video/webm');
  const [isRecorderModalOpen, setIsRecorderModalOpen] = useState(false);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const currentStreamRef = useRef(null);
  const localObjectUrlsRef = useRef([]);
  const lyricRequestIdRef = useRef(0);

  // Modals & Panels
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isMultiTrackOpen, setIsMultiTrackOpen] = useState(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);

  // MultiTrack states
  const [isMultiTrack, setIsMultiTrack] = useState(false);
  const [vocalVol, setVocalVol] = useState(0.8);
  const [vocalMuted, setVocalMuted] = useState(false);
  const [vocalReverb, setVocalReverb] = useState(0);
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

  // 初始化默认音频并订阅引擎状态
  useEffect(() => {
    audioEngine.setMainTrack(DEFAULT_DEMO_SONG.url);
    audioEngine.setMasterVolume(volume, isMuted);

    const offEnded = audioEngine.on('ended', () => {
      setIsPlaying(false);
      setCurrentTime(audioEngine.getDuration());
    });
    const offMetadata = audioEngine.on('metadata', ({ duration: nextDuration }) => {
      if (Number.isFinite(nextDuration) && nextDuration > 0) setDuration(nextDuration);
    });
    const offError = audioEngine.on('error', ({ message }) => {
      setIsPlaying(false);
      setPlaybackNotice(message);
    });

    return () => {
      offEnded();
      offMetadata();
      offError();
      localObjectUrlsRef.current.filter(Boolean).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => () => {
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
  }, [recordedVideoUrl]);

  useEffect(() => {
    if (lyricMatchStatus.type !== 'success') return undefined;
    const timer = setTimeout(() => setLyricMatchStatus({ type: 'idle', message: '' }), 4500);
    return () => clearTimeout(timer);
  }, [lyricMatchStatus]);

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
  const startPlayback = () => {
    setPlaybackNotice('正在载入音频…');
    return audioEngine.play().then(() => {
      setIsPlaying(true);
      setPlaybackNotice('');
    }).catch(err => {
      setIsPlaying(false);
      setPlaybackNotice(err?.message || '无法播放该音频');
      console.warn("Playback error:", err);
    });
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      startPlayback();
    }
  };

  // 进度跳转 (Seek)
  const handleSeek = (time) => {
    const safeTime = audioEngine.seek(time);
    setCurrentTime(safeTime);
  };

  const replaceLocalObjectUrls = (urls) => {
    const nextUrls = urls;
    localObjectUrlsRef.current
      .filter(url => url && !nextUrls.includes(url))
      .forEach(url => URL.revokeObjectURL(url));
    localObjectUrlsRef.current = nextUrls;
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
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
        setPlaybackNotice('已取消页面录制');
        return;
      }
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
    const requestId = ++lyricRequestIdRef.current;
    const cleanTitle = cleanFileNameForSearch(rawFileName);
    setSearchKeyword(cleanTitle);
    setIsAutoSearching(false);

    if (!cleanTitle) {
      setLyricMatchStatus({ type: 'error', message: '无法从文件名识别歌曲，请手动输入歌名匹配' });
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      setLyricMatchStatus({ type: 'needs-key', message: `已载入音频；配置 API Key 后可搜索“${cleanTitle}”` });
      return;
    }

    setIsAutoSearching(true);
    setLyricMatchStatus({ type: 'searching', message: `正在匹配“${cleanTitle}”…` });
    setLyricOffset(0);

    try {
      const normalize = value => String(value || '').toLowerCase().replace(/[\s\-_·・()（）\[\]【】]/g, '');
      const normalizedTitle = normalize(cleanTitle);
      let matchedSong = null;
      let matchedLyrics = null;

      for (const source of ['wy', 'qq', 'kuwo']) {
        const searchRes = await searchSongs(cleanTitle, source, 5);
        if (requestId !== lyricRequestIdRef.current) return;
        if (!searchRes.ok || !searchRes.songs?.length) continue;

        const candidates = searchRes.songs
          .filter(song => {
            const candidateName = normalize(song.name);
            return candidateName && (candidateName.includes(normalizedTitle) || normalizedTitle.includes(candidateName));
          })
          .slice(0, 3);

        for (const candidate of candidates) {
          const detailRes = await getSongDetail(candidate, source);
          if (requestId !== lyricRequestIdRef.current) return;
          if (detailRes.ok && detailRes.song?.lyrics?.length) {
            matchedSong = candidate;
            matchedLyrics = detailRes.song.lyrics;
            break;
          }
        }
        if (matchedLyrics) break;
      }

      if (matchedLyrics) {
        setCurrentSong(prev => ({ ...prev, lyrics: matchedLyrics }));
        setLyricMatchStatus({
          type: 'success',
          message: `已匹配：${matchedSong.name}${matchedSong.singer ? ` · ${matchedSong.singer}` : ''}`
        });
      } else {
        setLyricMatchStatus({ type: 'error', message: '未找到可信的自动匹配，请手动选择候选歌词' });
      }
    } catch (err) {
      console.warn("Auto lyric fetch notice:", err);
      if (requestId === lyricRequestIdRef.current) {
        setLyricMatchStatus({ type: 'error', message: err?.message || '自动匹配失败，请手动搜索' });
      }
    } finally {
      if (requestId === lyricRequestIdRef.current) setIsAutoSearching(false);
    }
  };

  // 选择在线整曲 (妖狐 API)
  const handleSelectSong = (song) => {
    lyricRequestIdRef.current += 1;
    replaceLocalObjectUrls([]);
    setCurrentSong(song);
    setIsPlaying(false);
    setIsMultiTrack(false);
    setIsMultiTrackOpen(false);
    setVocalTrackName('');
    setAccTrackName('');
    setCurrentTime(0);
    setDuration(0);
    setLyricOffset(0);
    setLyricMatchStatus({ type: 'success', message: '已载入在线音频与歌词' });
    if (song.url) {
      audioEngine.setMainTrack(song.url);
      startPlayback();
    }
  };

  // 保留当前音频，仅匹配在线歌词
  const handleImportLyricsOnly = (lyrics, matchedSong) => {
    lyricRequestIdRef.current += 1;
    setIsAutoSearching(false);
    setCurrentSong(prev => ({
      ...prev,
      lyrics
    }));
    setLyricOffset(0);
    setLyricMatchStatus({
      type: 'success',
      message: matchedSong?.name ? `已应用歌词：${matchedSong.name}` : '歌词已应用到当前音频'
    });
  };

  // 载入本地合并单轨
  const handleLoadSingleTrack = ({ name, singer, url, file }) => {
    lyricRequestIdRef.current += 1;
    replaceLocalObjectUrls([url]);
    setIsMultiTrack(false);
    setIsMultiTrackOpen(false);
    setVocalTrackName('');
    setAccTrackName('');
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
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
    audioEngine.setMasterVolume(volume, isMuted);
    startPlayback();

    if (file && file.name) {
      autoFetchLyricsForFileName(file.name);
    } else {
      autoFetchLyricsForFileName(name);
    }
  };

  // 载入本地分轨 (人声 + 伴奏)
  const handleLoadMultiTracks = ({ name, vocalUrl, accUrl, vocalName, accName, vocalVol: nextVocalVol, accVol: nextAccVol }) => {
    lyricRequestIdRef.current += 1;
    replaceLocalObjectUrls([vocalUrl, accUrl]);
    setIsMultiTrack(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVocalTrackName(vocalName);
    setAccTrackName(accName);
    setVocalVol(nextVocalVol);
    setAccVol(nextAccVol);
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
    audioEngine.setMasterVolume(volume, isMuted);
    audioEngine.setVocalVolume(nextVocalVol, false);
    audioEngine.setVocalReverb(vocalReverb);
    audioEngine.setAccVolume(nextAccVol, false);
    startPlayback();

    const targetName = vocalName || accName || name;
    autoFetchLyricsForFileName(targetName);
  };

  // 本地 LRC 歌词文件上传
  const handleUploadLrc = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      lyricRequestIdRef.current += 1;
      setIsAutoSearching(false);
      const buffer = evt.target.result;
      let text = '';
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      } catch {
        try {
          text = new TextDecoder('gb18030').decode(buffer);
        } catch {
          text = new TextDecoder().decode(buffer);
        }
      }
      const parsed = parseLrc(text);
      setCurrentSong(prev => ({
        ...prev,
        lyrics: parsed
      }));
      setLyricOffset(0);
      setLyricMatchStatus(parsed.length
        ? { type: 'success', message: `已导入本地歌词：${file.name}` }
        : { type: 'error', message: '没有从该文件解析出有效时间轴歌词' });
    };
    reader.onerror = () => {
      setLyricMatchStatus({ type: 'error', message: '无法读取该歌词文件' });
    };
    reader.readAsArrayBuffer(file);
  };

  // 上传分轨人声
  const handleUploadVocal = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const retainedAccUrl = isMultiTrack ? (localObjectUrlsRef.current[1] || null) : null;
    replaceLocalObjectUrls([url, retainedAccUrl]);
    setVocalTrackName(file.name);
    setIsMultiTrack(true);
    setIsPlaying(false);
    if (!isMultiTrack) {
      setCurrentSong({
        name: `[分轨] ${file.name.replace(/\.[^/.]+$/, '')}`,
        singer: '本地多轨道分轨',
        cover: '',
        url,
        lyrics: []
      });
    }
    audioEngine.updateMultiTrack('vocal', url);
    setPlaybackNotice('人声轨已更新，点击播放继续');
    autoFetchLyricsForFileName(file.name);
  };

  // 上传分轨伴奏
  const handleUploadAcc = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const retainedVocalUrl = isMultiTrack ? (localObjectUrlsRef.current[0] || null) : null;
    replaceLocalObjectUrls([retainedVocalUrl, url]);
    setAccTrackName(file.name);
    setIsMultiTrack(true);
    setIsPlaying(false);
    if (!isMultiTrack) {
      setCurrentSong({
        name: `[分轨] ${file.name.replace(/\.[^/.]+$/, '')}`,
        singer: '本地多轨道分轨',
        cover: '',
        url,
        lyrics: []
      });
    }
    audioEngine.updateMultiTrack('acc', url);
    setPlaybackNotice('伴奏轨已更新，点击播放继续');
    autoFetchLyricsForFileName(file.name);
  };

  const openSearch = () => {
    setSearchKeyword(current => current || cleanFileNameForSearch(currentSong?.name || ''));
    setIsSearchOpen(true);
  };

  const closeRecorderModal = () => {
    setIsRecorderModalOpen(false);
    setRecordedVideoUrl(null);
  };

  const currentModeInfo = VISUAL_MODES.find(m => m.id === currentMode) || VISUAL_MODES[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* Visualizer Canvas Layer */}
      <VisualizerCanvas
        mode={currentMode}
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
            title={isRecording ? '点击停止录制并保存' : '录制全网页音画片段（格式取决于浏览器支持）'}
          >
            {isRecording ? <Square className="w-3.5 h-3.5 fill-current text-red-500" /> : <Video className="w-3.5 h-3.5 text-red-400" />}
            <span>{isRecording ? `录制中 (${recordTime}s)` : '录制视频'}</span>
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
            onClick={openSearch}
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
          matchStatus={lyricMatchStatus}
          onOpenSearch={openSearch}
        />
      </main>

      {/* Multi-Track Panel Floating Overlay */}
      {isMultiTrackOpen && (
        <div className="fixed right-6 bottom-28 z-40 animate-fade-in">
          <MultiTrackPanel
            isMultiTrack={isMultiTrack}
            vocalVol={vocalVol}
            setVocalVol={setVocalVol}
            vocalMuted={vocalMuted}
            setVocalMuted={setVocalMuted}
            vocalReverb={vocalReverb}
            setVocalReverb={setVocalReverb}
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
          onOpenSearch={openSearch}
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
        onClose={closeRecorderModal}
        videoUrl={recordedVideoUrl}
        songName={currentSong?.name}
        mimeType={activeMimeType}
      />

      <LocalAudioModal
        isOpen={isLocalModalOpen}
        onClose={() => setIsLocalModalOpen(false)}
        onLoadSingleTrack={handleLoadSingleTrack}
        onLoadMultiTracks={handleLoadMultiTracks}
        onOpenSearch={openSearch}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectSong={handleSelectSong}
        onImportLyricsOnly={handleImportLyricsOnly}
        currentSong={currentSong}
        initialKeyword={searchKeyword}
      />

      <ModeSelector
        isOpen={isModeMenuOpen}
        onClose={() => setIsModeMenuOpen(false)}
        currentMode={currentMode}
        onSelectMode={(modeId) => setCurrentMode(modeId)}
      />

      {playbackNotice && (
        <div className="fixed left-1/2 bottom-28 z-[60] -translate-x-1/2 rounded-full border border-white/15 bg-black/80 px-4 py-2 text-xs text-white/80 backdrop-blur-xl">
          {playbackNotice}
        </div>
      )}

    </div>
  );
}
