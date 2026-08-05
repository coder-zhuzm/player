/**
 * Web Audio API 音频与频谱引擎
 */

export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.masterGain = null;
    this.streamDestination = null;

    // 单轨道元素与节点
    this.mainAudio = null;
    this.mainSource = null;
    this.mainGain = null;

    // 多轨道元素与节点
    this.vocalAudio = null;
    this.vocalSource = null;
    this.vocalGain = null;

    this.accAudio = null;
    this.accSource = null;
    this.accGain = null;

    this.isMultiTrack = false;
    this.initialized = false;
    this.listeners = new Map();
  }

  /**
   * 初始化 AudioContext 和 AnalyserNode
   */
  init() {
    if (this.initialized) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioCtx();

    // 频谱分析节点规格: fftSize: 512, smoothingTimeConstant: 0.88
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.88;

    // 创建录屏专用音频流目标节点
    this.streamDestination = this.audioContext.createMediaStreamDestination();
    this.masterGain = this.audioContext.createGain();

    // 创建 HTMLAudioElement 实例
    this.mainAudio = new Audio();
    this.mainAudio.crossOrigin = 'anonymous';

    this.vocalAudio = new Audio();
    this.vocalAudio.crossOrigin = 'anonymous';

    this.accAudio = new Audio();
    this.accAudio.crossOrigin = 'anonymous';

    // 创建 GainNode
    this.mainGain = this.audioContext.createGain();
    this.vocalGain = this.audioContext.createGain();
    this.accGain = this.audioContext.createGain();

    // 节点连接
    try {
      this.mainSource = this.audioContext.createMediaElementSource(this.mainAudio);
      this.mainSource.connect(this.mainGain);
      this.mainGain.connect(this.analyser);

      this.vocalSource = this.audioContext.createMediaElementSource(this.vocalAudio);
      this.vocalSource.connect(this.vocalGain);
      this.vocalGain.connect(this.analyser);

      this.accSource = this.audioContext.createMediaElementSource(this.accAudio);
      this.accSource.connect(this.accGain);
      this.accGain.connect(this.analyser);

      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.connect(this.streamDestination);
    } catch (e) {
      console.warn("AudioContext source setup notice:", e);
    }

    const emitMetadata = () => this.emit('metadata', { duration: this.getDuration() });
    const emitError = () => this.emit('error', { message: '音频加载或播放失败' });
    [this.mainAudio, this.vocalAudio, this.accAudio].forEach(audio => {
      audio.addEventListener('loadedmetadata', emitMetadata);
      audio.addEventListener('durationchange', emitMetadata);
      audio.addEventListener('error', emitError);
      audio.addEventListener('ended', () => {
        if (this.hasEnded()) this.emit('ended');
      });
    });

    this.initialized = true;
  }

  on(eventName, listener) {
    if (!this.listeners.has(eventName)) this.listeners.set(eventName, new Set());
    this.listeners.get(eventName).add(listener);
    return () => this.listeners.get(eventName)?.delete(listener);
  }

  emit(eventName, payload) {
    this.listeners.get(eventName)?.forEach(listener => listener(payload));
  }

  clearAudio(audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  pauseAll() {
    [this.mainAudio, this.vocalAudio, this.accAudio].forEach(audio => audio?.pause());
  }

  async resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * 获取录屏专用的 AudioTrack
   */
  getAudioStreamTrack() {
    if (this.streamDestination && this.streamDestination.stream) {
      return this.streamDestination.stream.getAudioTracks()[0] || null;
    }
    return null;
  }

  /**
   * 设置主轨道音频源
   */
  setMainTrack(src) {
    this.init();
    this.pauseAll();
    this.clearAudio(this.vocalAudio);
    this.clearAudio(this.accAudio);
    this.isMultiTrack = false;
    this.mainAudio.src = src;
    this.mainAudio.load();
  }

  /**
   * 设置分轨音频源
   */
  setMultiTracks(vocalSrc, accSrc) {
    this.init();
    this.pauseAll();
    this.clearAudio(this.mainAudio);
    this.clearAudio(this.vocalAudio);
    this.clearAudio(this.accAudio);
    this.isMultiTrack = true;
    if (vocalSrc) {
      this.vocalAudio.src = vocalSrc;
      this.vocalAudio.load();
    }
    if (accSrc) {
      this.accAudio.src = accSrc;
      this.accAudio.load();
    }
  }

  updateMultiTrack(track, src) {
    this.init();
    this.pauseAll();
    this.clearAudio(this.mainAudio);
    this.isMultiTrack = true;
    const audio = track === 'vocal' ? this.vocalAudio : this.accAudio;
    this.clearAudio(audio);
    if (src) {
      audio.src = src;
      audio.load();
    }
  }

  async play() {
    await this.resumeContext();
    if (this.isMultiTrack) {
      const activeTracks = [this.vocalAudio, this.accAudio].filter(audio => audio.src);
      if (activeTracks.length === 0) throw new Error('请先选择至少一个分轨音频文件');
      if (activeTracks.every(audio => audio.ended)) this.seek(0);
      const playableTracks = activeTracks.filter(audio => !audio.ended);
      const referenceTime = Math.min(...playableTracks.map(audio => audio.currentTime || 0));
      playableTracks.forEach(audio => {
        if (Math.abs((audio.currentTime || 0) - referenceTime) > 0.08) {
          audio.currentTime = referenceTime;
        }
      });
      try {
        return await Promise.all(playableTracks.map(audio => audio.play()));
      } catch (error) {
        this.pauseAll();
        throw error;
      }
    } else {
      if (!this.mainAudio.src) throw new Error('请先选择音频文件');
      return this.mainAudio.play();
    }
  }

  pause() {
    if (this.isMultiTrack) {
      this.vocalAudio.pause();
      this.accAudio.pause();
    } else {
      this.mainAudio.pause();
    }
  }

  seek(time) {
    const duration = this.getDuration();
    const safeTime = Math.max(0, Math.min(Number.isFinite(duration) && duration > 0 ? duration : Number.MAX_SAFE_INTEGER, Number(time) || 0));
    if (this.isMultiTrack) {
      if (this.vocalAudio.src) this.vocalAudio.currentTime = safeTime;
      if (this.accAudio.src) this.accAudio.currentTime = safeTime;
    } else {
      this.mainAudio.currentTime = safeTime;
    }
    return safeTime;
  }

  setMasterVolume(vol, isMuted = false) {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(isMuted ? 0 : vol, this.audioContext.currentTime);
    }
  }

  setMainVolume(vol, isMuted = false) {
    if (this.mainGain) {
      this.mainGain.gain.setValueAtTime(isMuted ? 0 : vol, this.audioContext.currentTime);
    }
  }

  setVocalVolume(vol, isMuted = false) {
    if (this.vocalGain) {
      this.vocalGain.gain.setValueAtTime(isMuted ? 0 : vol, this.audioContext.currentTime);
    }
  }

  setAccVolume(vol, isMuted = false) {
    if (this.accGain) {
      this.accGain.gain.setValueAtTime(isMuted ? 0 : vol, this.audioContext.currentTime);
    }
  }

  getCurrentTime() {
    if (this.isMultiTrack) {
      return this.vocalAudio.currentTime || this.accAudio.currentTime || 0;
    }
    return this.mainAudio.currentTime || 0;
  }

  getDuration() {
    if (this.isMultiTrack) {
      return Math.max(this.vocalAudio.duration || 0, this.accAudio.duration || 0);
    }
    return this.mainAudio.duration || 0;
  }

  hasEnded() {
    if (!this.initialized) return false;
    if (!this.isMultiTrack) return Boolean(this.mainAudio.src && this.mainAudio.ended);
    const activeTracks = [this.vocalAudio, this.accAudio].filter(audio => audio.src);
    return activeTracks.length > 0 && activeTracks.every(audio => audio.ended);
  }

  getMode() {
    return this.isMultiTrack ? 'multi' : 'single';
  }

  getFrequencyData(array) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array);
    }
  }

  getTimeDomainData(array) {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(array);
    }
  }
}

export const audioEngine = new AudioEngine();
