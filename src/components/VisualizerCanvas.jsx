import React, { useRef, useEffect } from 'react';
import { audioEngine } from '../lib/audioEngine';

export const VISUAL_MODES = [
  { id: 'classic-dream', name: '经典梦幻', color: '#c084fc', icon: '🟣', desc: '80粒子光晕 + 湖面倒影 + 粉紫渐变' },
  { id: 'neon-matrix', name: '霓虹矩阵', color: '#00ff41', icon: '🟢', desc: '120列日文代码雨 + 绿色黑客条' },
  { id: 'starry-cosmos', name: '星空宇宙', color: '#4facfe', icon: '🔵', desc: '200星星 + 旋转星轨 + 放射中心' },
  { id: 'liquid-fluid', name: '液态流体', color: '#ff6b9d', icon: '🩷', desc: '30上升泡泡 + 正弦正弦波浪叠加' },
  { id: 'cyberpunk', name: '赛博朋克', color: '#ff00ff', icon: '💜', desc: '透视网格 + 扫描线 + RGB故障' },
  { id: 'minimal-record', name: '极简录制', color: '#888888', icon: '⬜', desc: '极简纯粹 + 底部单色波纹线条' },
];

export default function VisualizerCanvas({ mode = 'classic-dream', isPlaying = false, onCanvasClick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    // 频域与时域缓存 (fftSize: 512 => 256 frequency bins)
    const frequencyData = new Uint8Array(256);
    const timeDomainData = new Uint8Array(256);

    // Resize handler
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const width = () => window.innerWidth;
    const height = () => window.innerHeight;

    // --- State Initialization for Canvas Effects ---

    // 1. 经典梦幻: 80 粒子 + 5 浮光
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * width(),
      y: Math.random() * height(),
      radius: Math.random() * 3 + 1,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.8 + 0.2,
    }));

    const glows = Array.from({ length: 5 }, () => ({
      x: Math.random() * width(),
      y: Math.random() * height(),
      radius: Math.random() * 150 + 100,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    }));

    // 2. 霓虹矩阵: 120 列代码雨
    const chars = '0123456789アカサタナハマヤラワガザダバパイキシチニヒミリヰギジヂビピウクスツヌフムユルグズブヅプ';
    const matrixColumns = 120;
    const matrixDrops = Array.from({ length: matrixColumns }, () => Math.floor(Math.random() * -100));

    // 3. 星空宇宙: 200 星星 + 流星
    const stars = Array.from({ length: 200 }, () => ({
      x: (Math.random() - 0.5) * width() * 2,
      y: (Math.random() - 0.5) * height() * 2,
      z: Math.random() * width(),
      size: Math.random() * 1.5 + 0.5,
    }));

    const meteors = Array.from({ length: 3 }, () => ({
      x: Math.random() * width(),
      y: Math.random() * height() * 0.5,
      len: Math.random() * 80 + 40,
      speed: Math.random() * 8 + 4,
      alpha: Math.random() * 0.8 + 0.2,
    }));

    let starRotation = 0;

    // 4. 液态流体: 30 气泡
    const bubbles = Array.from({ length: 30 }, () => ({
      x: Math.random() * width(),
      y: height() + Math.random() * 100,
      radius: Math.random() * 12 + 4,
      speed: Math.random() * 1.5 + 0.5,
      wobble: Math.random() * Math.PI * 2,
    }));

    let waveOffset = 0;

    // 5. 赛博朋克: 3D 网格 & 故障
    let gridOffset = 0;

    // Render loop
    const render = () => {
      audioEngine.getFrequencyData(frequencyData);
      audioEngine.getTimeDomainData(timeDomainData);

      // 计算平均音量能量 (0 - 255)
      const avgEnergy = frequencyData.reduce((acc, val) => acc + val, 0) / frequencyData.length;

      const w = width();
      const h = height();

      ctx.clearRect(0, 0, w, h);

      switch (mode) {
        case 'classic-dream':
          renderClassicDream(ctx, w, h, frequencyData, avgEnergy, particles, glows);
          break;
        case 'neon-matrix':
          renderNeonMatrix(ctx, w, h, frequencyData, chars, matrixDrops);
          break;
        case 'starry-cosmos':
          starRotation += 0.002 + (avgEnergy / 255) * 0.005;
          renderStarryCosmos(ctx, w, h, frequencyData, stars, meteors, starRotation, avgEnergy);
          break;
        case 'liquid-fluid':
          waveOffset += 0.02 + (avgEnergy / 255) * 0.03;
          renderLiquidFluid(ctx, w, h, frequencyData, bubbles, waveOffset, avgEnergy);
          break;
        case 'cyberpunk':
          gridOffset = (gridOffset + 1 + (avgEnergy / 255) * 3) % 40;
          renderCyberpunk(ctx, w, h, frequencyData, timeDomainData, gridOffset, avgEnergy);
          break;
        case 'minimal-record':
        default:
          renderMinimalRecord(ctx, w, h, frequencyData, timeDomainData);
          break;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [mode, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      onClick={onCanvasClick}
      className="fixed inset-0 w-full h-full object-cover cursor-pointer z-0"
    />
  );
}

/* =========================================================================
   1. 经典梦幻 模式 (Classic Dream)
   ========================================================================= */
function renderClassicDream(ctx, w, h, freq, avgEnergy, particles, glows) {
  // 暗深紫夜色背景
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#0d0714');
  bgGrad.addColorStop(0.6, '#180b2b');
  bgGrad.addColorStop(1, '#08030f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 渲染浮光云团
  glows.forEach((g) => {
    g.x += g.vx;
    g.y += g.vy;
    if (g.x < 0 || g.x > w) g.vx *= -1;
    if (g.y < 0 || g.y > h) g.vy *= -1;

    const radGrad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius);
    radGrad.addColorStop(0, `rgba(192, 132, 252, ${0.12 + (avgEnergy / 255) * 0.1})`);
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // 渲染 80 浮动光晕粒子
  particles.forEach((p) => {
    p.x += p.vx * (1 + avgEnergy / 100);
    p.y += p.vy * (1 + avgEnergy / 100);
    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h;
    if (p.y > h) p.y = 0;

    ctx.fillStyle = `rgba(244, 114, 182, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + (avgEnergy / 255) * 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 对称瀑布 + HSL 渐变频谱
  const bars = 64;
  const barWidth = w / bars;
  const centerY = h * 0.65;

  ctx.save();
  for (let i = 0; i < bars; i++) {
    const val = freq[i * 2] || 0;
    const barHeight = (val / 255) * (h * 0.35);

    // HSL 映射 (280° - 360° 粉紫)
    const hue = 280 + (val / 255) * 80;
    const saturation = 70 + (val / 255) * 20;
    const lightness = 60 + (val / 255) * 25;
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    ctx.fillStyle = color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;

    // 上半部分频谱柱
    const x = i * barWidth;
    ctx.fillRect(x + 2, centerY - barHeight, barWidth - 4, barHeight);

    // 湖面上半面倒影 (透明度递减)
    ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.25)`;
    ctx.fillRect(x + 2, centerY, barWidth - 4, barHeight * 0.4);
  }
  ctx.restore();
}

/* =========================================================================
   2. 霓虹矩阵 模式 (Neon Matrix)
   ========================================================================= */
function renderNeonMatrix(ctx, w, h, freq, chars, drops) {
  // 极黑半透明覆盖留余晖
  ctx.fillStyle = 'rgba(0, 5, 0, 0.2)';
  ctx.fillRect(0, 0, w, h);

  ctx.shadowBlur = 8;
  ctx.shadowColor = '#00ff41';

  // 120 列代码雨
  const colWidth = w / drops.length;
  ctx.font = '14px "Share Tech Mono", monospace';

  drops.forEach((y, i) => {
    const char = chars[Math.floor(Math.random() * chars.length)];
    const x = i * colWidth;
    const freqVal = freq[i % 64] || 0;

    ctx.fillStyle = y % 5 === 0 ? '#ffffff' : '#00ff41';
    ctx.fillText(char, x, y * 16);

    if (y * 16 > h && Math.random() > 0.96) {
      drops[i] = 0;
    } else {
      drops[i] += 1 + (freqVal / 255) * 1.5;
    }
  });

  // 底部垂直绿条频谱
  const barCount = 48;
  const barW = w / barCount;
  ctx.fillStyle = '#00ff41';

  for (let i = 0; i < barCount; i++) {
    const v = freq[i * 4] || 0;
    const barH = (v / 255) * (h * 0.3);
    const x = i * barW;

    ctx.fillStyle = `rgba(0, 255, 65, ${0.4 + (v / 255) * 0.6})`;
    ctx.fillRect(x + 3, h - barH, barW - 6, barH);

    // 数字装饰刻度
    ctx.fillStyle = '#a3ffb8';
    ctx.fillText(v.toString().padStart(3, '0'), x + 4, h - barH - 8);
  }
  ctx.shadowBlur = 0;
}

/* =========================================================================
   3. 星空宇宙 模式 (Starry Cosmos)
   ========================================================================= */
function renderStarryCosmos(ctx, w, h, freq, stars, meteors, rotation, avgEnergy) {
  ctx.fillStyle = '#02020a';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // 旋转星轨
  stars.forEach((s) => {
    const scale = 300 / (300 + s.z);
    const x = s.x * scale;
    const y = s.y * scale;
    const size = s.size * scale * (1 + avgEnergy / 100);

    ctx.fillStyle = `rgba(164, 215, 254, ${Math.min(1, 0.3 + (255 - s.z) / 255)})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // 渲染流星
  meteors.forEach((m) => {
    m.x += m.speed;
    m.y += m.speed * 0.5;
    if (m.x > w || m.y > h) {
      m.x = Math.random() * w * 0.5;
      m.y = 0;
    }
    const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.len, m.y - m.len * 0.5);
    grad.addColorStop(0, `rgba(79, 172, 254, ${m.alpha})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x - m.len, m.y - m.len * 0.5);
    ctx.stroke();
  });

  // 放射状从中心扩散的中心环形频谱
  ctx.save();
  ctx.translate(cx, cy);
  const numPoints = 80;
  const baseRadius = Math.min(w, h) * 0.18 + (avgEnergy / 255) * 20;

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const val = freq[i * 3] || 0;
    const barLen = (val / 255) * 140;

    const x1 = Math.cos(angle) * baseRadius;
    const y1 = Math.sin(angle) * baseRadius;
    const x2 = Math.cos(angle) * (baseRadius + barLen);
    const y2 = Math.sin(angle) * (baseRadius + barLen);

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, '#00f2fe');
    grad.addColorStop(1, '#4facfe');

    ctx.strokeStyle = grad;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#4facfe';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

/* =========================================================================
   4. 液态流体 模式 (Liquid Fluid)
   ========================================================================= */
function renderLiquidFluid(ctx, w, h, freq, bubbles, waveOffset, avgEnergy) {
  // 深粉紫海浪色
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#1a0922');
  bgGrad.addColorStop(1, '#2c0c30');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 30 上升气泡
  bubbles.forEach((b) => {
    b.y -= b.speed + (avgEnergy / 255) * 2;
    b.wobble += 0.05;
    const bx = b.x + Math.sin(b.wobble) * 15;
    if (b.y < -20) {
      b.y = h + 20;
      b.x = Math.random() * w;
    }

    ctx.fillStyle = 'rgba(255, 107, 157, 0.35)';
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, b.y, b.radius + (avgEnergy / 255) * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // 3 层正弦波浪叠加
  const layers = [
    { color: 'rgba(255, 107, 157, 0.4)', speed: 1.0, heightMult: 0.25 },
    { color: 'rgba(192, 132, 252, 0.5)', speed: 1.5, heightMult: 0.2 },
    { color: 'rgba(244, 114, 182, 0.7)', speed: 2.0, heightMult: 0.15 },
  ];

  layers.forEach((layer, idx) => {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let x = 0; x <= w; x += 10) {
      const freqIdx = Math.floor((x / w) * 64);
      const audioBoost = (freq[freqIdx] || 0) * layer.heightMult;
      const y = h * 0.7 - Math.sin((x * 0.008) + waveOffset * layer.speed + idx) * 35 - audioBoost;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  });
}

/* =========================================================================
   5. 赛博朋克 模式 (Cyberpunk)
   ========================================================================= */
function renderCyberpunk(ctx, w, h, freq, timeDomain, gridOffset, avgEnergy) {
  ctx.fillStyle = '#090014';
  ctx.fillRect(0, 0, w, h);

  // 3D 透视网格 (Perspective Grid)
  const horizon = h * 0.55;
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#ff007f';

  // 纵向透视线
  const vpX = w / 2;
  for (let x = -w; x <= w * 2; x += 60) {
    ctx.beginPath();
    ctx.moveTo(vpX, horizon);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // 横向移动线
  for (let y = horizon; y <= h; y += 15) {
    const effectiveY = y + (gridOffset % 15);
    if (effectiveY > h) continue;
    ctx.beginPath();
    ctx.moveTo(0, effectiveY);
    ctx.lineTo(w, effectiveY);
    ctx.stroke();
  }

  // 霓虹故障偏移柱状图 (Magenta & Cyan)
  const barCount = 40;
  const barW = w / barCount;

  for (let i = 0; i < barCount; i++) {
    const val = freq[i * 5] || 0;
    const barH = (val / 255) * (h * 0.4);
    const x = i * barW;

    // RGB Glitch Offset
    const glitchX = (avgEnergy > 160 && Math.random() > 0.8) ? (Math.random() - 0.5) * 12 : 0;

    // 青色背景柱
    ctx.fillStyle = 'rgba(0, 243, 255, 0.8)';
    ctx.fillRect(x + glitchX, horizon - barH, barW - 8, barH);

    // 洋红叠加柱
    ctx.fillStyle = 'rgba(255, 0, 127, 0.9)';
    ctx.fillRect(x + 3 - glitchX, horizon - barH + 4, barW - 14, barH * 0.8);
  }

  // 扫描线 (Scanlines)
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 2);
  }
}

/* =========================================================================
   6. 极简录制 模式 (Minimal Record)
   ========================================================================= */
function renderMinimalRecord(ctx, w, h, freq, timeDomain) {
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, w, h);

  // 底部灰色极简波纹线条
  ctx.strokeStyle = '#44444e';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const sliceWidth = w / timeDomain.length;
  let x = 0;

  for (let i = 0; i < timeDomain.length; i++) {
    const v = timeDomain[i] / 128.0;
    const y = (v * h) / 2 + h * 0.25;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  ctx.stroke();

  // 底部精细灰度频谱
  const barCount = 80;
  const barW = w / barCount;
  ctx.fillStyle = '#666673';

  for (let i = 0; i < barCount; i++) {
    const val = freq[i * 3] || 0;
    const barH = (val / 255) * 80;
    ctx.fillRect(i * barW + 1, h - barH - 20, barW - 2, barH);
  }
}
