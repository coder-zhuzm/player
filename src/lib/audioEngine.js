/**
 * Web Audio API 音频与频谱引擎
 */

class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
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

      this.analyser.connect(this.audioContext.destination);
      this.analyser.connect(this.streamDestination);
    } catch (e) {
      console.warn("AudioContext source setup notice:", e);
    }

    this.initialized = true;
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
    this.isMultiTrack = false;
    this.mainAudio.src = src;
    this.mainAudio.load();
  }

  /**
   * 设置分轨音频源
   */
  setMultiTracks(vocalSrc, accSrc) {
    this.init();
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

  play() {
    this.resumeContext();
    if (this.isMultiTrack) {
      const p1 = this.vocalAudio.src ? this.vocalAudio.play() : Promise.resolve();
      const p2 = this.accAudio.src ? this.accAudio.play() : Promise.resolve();
      return Promise.all([p1, p2]);
    } else {
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
    if (this.isMultiTrack) {
      if (this.vocalAudio.src) this.vocalAudio.currentTime = time;
      if (this.accAudio.src) this.accAudio.currentTime = time;
    } else {
      this.mainAudio.currentTime = time;
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
