# 🎵 梦幻旋律音乐播放器 (Dream Melody Music Player)

> 结合 **Web Audio API 实时频谱分析**、**6 种 Canvas 超维动效**、**多轨道人声/伴奏独立分轨调音**、**Apple Music 级沉浸式歌词丝滑扫亮** 以及 **妖狐 API 在线曲库与自动歌词匹配** 的高奢 Web 音乐可视化播放器。

---

## ✨ 核心特性

### 🎨 1. 6 种超维 Canvas 动效模式
- 🟣 **经典梦幻 (Classic Dream)**: 80 粒子光晕 + 5 浮光云团 + HSL 渐变瀑布频谱 + 湖面倒影。
- 🟢 **霓虹矩阵 (Neon Matrix)**: 120 列日文/数字代码雨 + 绿色黑客条 + 实时数字刻度。
- 🔵 **星空宇宙 (Starry Cosmos)**: 200 颗恒星 + 3 层旋转星轨 + 动态流星 + 360° 中心放射状扩散频谱。
- 🩷 **液态流体 (Liquid Fluid)**: 30 上升透明气泡 + 3 层正弦波浪叠加，结合音量波幅抖动。
- 💜 **赛博朋克 (Cyberpunk)**: 3D 透视移动网格 + 扫描线 + 青/洋红双色 RGB Glitch 故障偏移。
- ⬜ **极简录制 (Minimal Record)**: 暗黑极简静音风格 + 底部单色波形线条与灰度柱图。

---

### 🎙️ 2. 多轨道 (Multi-Track) 分轨调音
- **本地合并轨 / 分轨自由选择**：支持单曲 MP3/WAV 上传，或独立选择**人声轨道 (Vocal)** 与 **伴奏轨道 (Accompaniment)**。
- **独立增益控音**：提供人声轨与伴奏轨独立的 0%-100% 音量调节滑块与一键 Mute 静音控制，实现完美的双轨并行同步播放。

---

### 🌸 3. 沉浸式歌词与 Karaoke 丝滑扫光高亮
- **Apple Music 极简高奢字体**：抛弃笨重框体，采用超大粗体悬浮文字，结合 `backdrop-blur-[10px]` 柔光星云蒙版。
- **逐字/逐句羽化渐变扫亮 (Karaoke Sweep)**：根据音频播放毫秒进度，实现从左至右的彩光羽化渐变填充，彻底告别生硬像素切割感。
- **歌词时间轴微调工具**：支持 `[-0.5s]` 提前 / `[+0.5s]` 延后 / `[重置 0s]` 时间轴校准。
- **双视图自由切换**：支持【单句沉浸焦点】卡片与【全文长卷平铺】平滑列表模式。

---

### 🔍 4. 本地文件名智能清洗与妖狐 API 自动匹配
- **自动文件名清洗**：自动剔除 `.mp3/.wav` 拓展名与 `_vocal` / `_acc` / `(伴奏)` / `(人声)` 等干扰字符。
- **后台无感匹配**：选中本地音频后，自动发起网易云/QQ/酷我 API 歌词检索并自动绑定。
- **妖狐 API 支持**：内置 100ms 请求限流器，支持 URL 自动追链与 `localStorage` Key 本地加密持久化。

---

### 📌 5. 交互控制与常亮锁定
- **控制栏常亮锁定 (Pin Lock)**：支持一键固定 UI 栏，防止 3 秒无操作自动淡出隐藏。
- **键盘快捷键**: `Space` 键控制播放/暂停，`Enter` 键提交搜索与 API Key 保存。

---

## 🛠️ 技术栈

- **框架与构建**: React 18 + Vite + `@vitejs/plugin-react-swc` (SWC 极速编译器)
- **样式与动画**: Tailwind CSS v4 + Framer Motion
- **音频引擎**: Web Audio API (`AudioContext`, `AnalyserNode`, `GainNode`, `MediaElementAudioSourceNode`)
- **图标库**: Lucide React

---

## 📁 项目结构

```
player/
├── src/
│   ├── components/
│   │   ├── VisualizerCanvas.jsx   # 6 种 Canvas 动效渲染引擎
│   │   ├── LyricView.jsx          # 歌词渲染、微调工具与扫高亮组件
│   │   ├── PlayerControls.jsx     # 底部悬浮控制栏与 UI 锁
│   │   ├── LocalAudioModal.jsx    # 本地单轨/分轨文件选择弹窗
│   │   ├── SearchModal.jsx        # 妖狐 API 在线搜索与歌词匹配弹窗
│   │   ├── MultiTrackPanel.jsx    # 多轨道分轨调音面板
│   │   └── ModeSelector.jsx       # 6 种动效模式选择弹窗
│   ├── lib/
│   │   ├── audioEngine.js         # Web Audio API 统一节点连接管理
│   │   ├── lrcParser.js           # 超包容 LRC 歌词解析器与时间轴算法
│   │   ├── yaohuApi.js            # 妖狐 API 在线请求与 3 层追链解析
│   │   └── utils.js               # 文件名清洗与格式化工具
│   ├── App.jsx                    # 主应用入口与状态调度
│   ├── main.jsx                   # React 挂载入口
│   └── index.css                  # Tailwind CSS 与全局黑夜样式
├── index.html
├── vite.config.js
└── package.json
```

---

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动本地开发服务
```bash
npm run dev
```
服务启动后访问: `http://localhost:3000`

### 3. 构建生产打包
```bash
npm run build
```

---

## 🔑 妖狐 API Key 配置

在线搜索全网歌曲与在线匹配 LRC 歌词需要配置 **妖狐 API Key**：
1. 点击界面右上角的 **`【匹配歌词】`** 按钮；
2. 在弹窗顶部的输入框中填入您的 **妖狐 API Key** 并点击 **保存 Key**；
3. Key 将安全地存放在您本地浏览器的 `localStorage` 中，后续操作将自动读取调用。

*(注：即使不配置 API Key，您依然可以**完整体验本地 MP3 播放、本地分轨播放、本地 LRC 歌词导入以及 6 种 Canvas 音频动效**！)*

---

## 📄 开源协议

MIT License
