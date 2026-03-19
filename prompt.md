# StarMusicPlayer — 完整项目 Prompt

## 项目概述

基于 Vue 3 + Vite 构建的本地/在线音乐播放器，配套零依赖 Node.js 服务端（server.js）提供文件扫描与流媒体接口。支持 PC 端和手机端，纯前端解析音频元数据，无需任何第三方元数据库。

## 技术栈

- 前端：Vue 3 (Composition API) + Vite 8
- 后端：Node.js 18+ 原生 http 模块，零依赖
- 无 TypeScript，无 CSS 框架，纯 CSS 变量主题系统
- 依赖：仅 vue^3.5、@vitejs/plugin-vue、vite

---

## 目录结构

```
├── index.html
├── package.json
├── vite.config.js              # Vite 配置，/api/* 代理到 localhost:8080
├── server.js                   # Node.js 音乐服务端（ES Module）
└── src/
    ├── main.js
    ├── App.vue                 # 根组件，仅挂载 MusicPlayer
    ├── style.css               # 全局空样式
    ├── utils/
    │   ├── audioMetadata.js    # 全格式音频元数据解析器（730行）
    │   ├── lrcParser.js        # LRC 歌词解析器
    │   └── m4aMetadata.js      # M4A 简版解析 + parsePlainLyrics
    └── components/
        ├── MusicPlayer.vue     # 主控制器（1188行）
        ├── FileBrowser.vue     # 文件浏览器（605行）
        ├── PlayerView.vue      # 播放页面（683行）
        ├── MiniBar.vue         # 底部迷你播放条（274行）
        ├── PlaylistPanel.vue   # 播放列表面板（219行）
        ├── MetadataPanel.vue   # 标签信息面板—Kid3风格（396行）
        └── SleepTimer.vue      # 定时停止组件（232行）
```

---

## server.js 规格

### 启动参数

```bash
node server.js --root /your/music --port 8080 --host 0.0.0.0
```

### API 接口（全部带 /api 前缀）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | /api/files?dir=&flat=0/1 | 递归扫描目录，返回文件树 JSON |
| GET  | /api/download?path=      | 流式播放/下载，支持 HTTP Range |
| GET  | /api/metadata?path=      | 读取文件元数据（服务端解析）|
| GET  | /api/favorite/data       | 获取收藏列表 |
| POST | /api/favorite/add        | 添加收藏 |
| POST | /api/favorite/remove     | 删除收藏 |

### 关键逻辑

- 所有文件 URL 使用**相对路径** `/api/download?path=...`（不含域名端口）
- 白名单扩展名：mp3 / flac / wav / aac / ogg / m4a / opus / wma / ape / alac / lrc / txt
- 路径穿越防护：所有路径验证在 ROOT_DIR 内
- CORS：响应头 `Access-Control-Allow-Origin: *`
- m4a/aac：禁用 Range（moov 可能在末尾），返回完整 200 响应
- 收藏数据持久化到 `data/favorite.json`

---

## vite.config.js

```js
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

---

## MusicPlayer.vue — 主控制器

### 状态管理（全部 ref/computed）

- `playlist` / `currentIndex` — 当前播放队列
- `isPlaying` / `currentTime` / `duration` — 播放状态
- `volume`：初始值从 `localStorage.getItem('sm-volume') ?? '0.8'` 读取，变更时写入
- `lyrics` / `currentLyricIndex` — 歌词数组与当前行索引
- `audioMeta` (AudioMeta | null) — 当前曲目完整元数据
- `audioFileSize` (Number) — 文件字节数
- `showPlayer` — 播放页是否打开
- `sourceMode`：'local' | 'server'
- `playMode`：'order' | 'shuffle' | 'repeat'
- `sleepMinutes` / `sleepEndTime` — 定时停止
- `currentThemeId`：从 `localStorage.getItem('sm-theme') || 'daylight'` 读取

### 主题系统

6 个内置主题，全部通过 CSS 变量注入到 `document.body`：

- daylight（白日晴空）
- cyber（赛博霓虹）
- sakura（樱花物语）
- forest（翡翠森林）
- aurora（极光幻境）
- ember（烈焰余烬）

CSS 变量前缀 `--t-`，包含：

```
--t-bg, --t-bg-card, --t-bg-glass
--t-accent1, --t-accent2, --t-accent3, --t-accent4
--t-text, --t-text2, --t-text3
--t-border, --t-overlay, --t-shadow
--t-play-bg, --t-progress
--t-lyric-active, --t-lyric-glow
--t-disc-bg, --t-disc-border, --t-disc-center, --t-disc-glow
--t-folder-bg, --t-folder-clr
--t-audio-bg, --t-audio-clr
--t-title-grad, --t-label-color
```

`--minibar-h`：有歌曲且未打开播放器时 = `calc(100px + env(safe-area-inset-bottom, 0px))`，否则 `0px`

### 音频缓存（Cache API）

- Cache Name: `sm-audio-v1`，最多缓存 25 首
- 内存 Blob 缓存：最多 12 首（避免重复 fetch）
- m4a/aac/mp4：**必须完整下载到 Blob 再赋值 audio.src**（moov 在末尾问题）
- 其他格式：直接赋值 URL，后台异步缓存

### loadAndPlay 关键逻辑

```
1. _loadToken++，防重入（await 期间若有新调用则丢弃结果）
2. 移动端解锁：audio.play() 立刻 pause()（解决 iOS autoplay policy）
3. await _playPromise（防止 AbortError）
4. 获取 src：server 走 resolveAudioSrc / local 走 createObjectURL
5. token 检查，若令牌不匹配则释放已创建的 blob URL 并 return
6. 释放旧 blob URL（revoke 时机在确认使用新 src 之后，避免浏览器仍在读取时提前释放）
7. audio.src = src → audio.play()
8. await loadLyrics(song)
```

### loadLyrics 优先级

1. 外部 .lrc 文件（同目录同名）
2. song.metaLyrics（服务端注入字段）
3. 全格式解析 ArrayBuffer → `parseAudioMetadata` → 读取内嵌歌词

### connectServer

默认 URL = `window.location.origin`（无需用户输入），支持 `url` 参数覆盖。

---

## FileBrowser.vue — 文件浏览器

### 模式

- **本地模式**：`<input webkitdirectory>` 选择文件夹，构建虚拟 FS 树
- **服务器模式**：GET /api/files 拉取文件树，自动连接当前域名

### 欢迎页两个按钮

- 「本地文件」：触发文件夹选择
- 「聆听音乐」：直接调用 connectServer()，无需输入地址

### 文件列表

- 文件夹 + 音频文件混合展示（文件夹在前，各自按名称排序）
- 每行：图标 + 文件名 + 格式 badge + 收藏按钮 + "下一首播放"按钮
- 播放中的文件显示音波动画（3 根柱）

### 全局搜索

Enter 触发 `handleSearchAll`，在整棵文件树中按文件名过滤，面包屑显示"搜索结果（N 首）"

### 底部间距

文件列表 `padding-bottom: 28px`，欢迎页 `padding-bottom: calc(20px + var(--minibar-h, 0px))`

---

## PlayerView.vue — 播放页

### PC 端布局

- 左侧 50%：旋转黑胶碟 + 歌曲信息 + 进度条 + 控制按钮 + 音量滑条 + 播放模式 + 定时停止
- 右侧 50%：歌词面板（自动滚动高亮 + 点击跳转）
- 左侧控制按钮行：收藏 ♥ / 上一首 / 播放暂停 / 下一首 / 播放列表 / ℹ 标签信息

### 手机端布局（≤600px，左右两列隐藏）

- 封面区（弹性占满剩余高度，padding-top 60px 为关闭按钮让位）
- 信息行：歌名 + 收藏按钮 + 播放模式切换
- 进度条（含时间显示）
- 主控制行：后退3s / 上一首 / 播放暂停（68px）/ 下一首 / 快进3s
- 工具栏：歌词 / 信息 / 音量滑条 / 定时 / 播放列表
- 歌词全屏抽屉（Sheet，支持下滑关闭手势）

### 标签信息面板

- 桌面：MetadataPanel mode="side"，右侧滑入覆盖歌词区
- 手机：MetadataPanel mode="sheet"，底部弹出

### 键盘快捷键（非输入框状态）

| 按键 | 功能 |
|------|------|
| `←`  | 后退 3 秒 |
| `→`  | 快进 3 秒 |
| `Space` | 播放/暂停 |

### 手势操作（移动端）

| 手势 | 功能 |
|------|------|
| 左右边缘滑动（前 24px 区域）| 关闭播放页 |
| 顶部区域下滑（y < 140px）| 关闭播放页 |
| 歌词抽屉内下滑 | 关闭歌词 |

---

## MiniBar.vue — 底部迷你播放条

### 高度

- PC 端（> 640px）：84px + safe-area
- 手机端（≤ 640px）：68px

### 布局（三栏 flex）

**左侧（280px）**：旋转碟片（52px 方形圆角，播放中旋转）+ 歌名 + 艺术家，整体可点击打开播放页

**中间（flex:1）**：收藏 ♥ / 播放模式 / 上一首 / 播放暂停（48px 圆形渐变按钮）/ 下一首

**右侧（280px）**：音量滑条（90px，渐变填充）+ 定时按钮（SleepTimer）+ 播放列表按钮（含数量 badge）

顶部 3px 进度条，带发光效果。

### 手机端隐藏

`@media (max-width: 640px)` 隐藏：音量滑条 / 播放模式按钮 / 收藏按钮

### 播放列表

- PC：PlaylistPanel mode="side" useFixed=true offsetBottom="84px"（fixed 右侧侧栏）
- 手机：PlaylistPanel mode="sheet"（底部弹出）

---

## PlaylistPanel.vue — 播放列表面板

**Props：** `show`, `playlist`, `currentIndex`, `mode`('side'|'sheet'), `offsetBottom`, `useFixed`

- **side 模式**：Teleport to body，position fixed 右侧，宽度 min(340px, 100vw)，滑入动画
- **sheet 模式**：Teleport to body + 半透明遮罩 + 上滑动画 + 把手条 + 支持下滑关闭手势
- 当前播放行高亮（accent1 色背景）
- 每行右侧 ✕ 删除按钮（hover 显示，点击从队列移除）
- padding-bottom: `calc(16px + env(safe-area-inset-bottom, 0px))`

---

## MetadataPanel.vue — 标签信息面板（Kid3 风格）

### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `meta` | Object\|null | AudioMeta 对象 |
| `filename` | String | 文件名（无标题时显示）|
| `fileSize` | Number | 文件字节数 |
| `show` | Boolean | 是否显示 |
| `mode` | 'side'\|'sheet' | 展示模式 |

### 字段分组（对标 Kid3）

**基本信息（♩）**：Title / Artist / Album Artist / Album / Year / Genre / Composer / Comment

**曲目信息（⊞）**：Track（曲目/总数）/ Disc（碟号/总数）/ BPM / ISRC / Copyright / URL

**技术参数（⚙）**：Format / Duration / Bitrate / Sample Rate / Channels / File Size / File Name / Encoder

无值字段灰显（opacity 0.35），`extra{}` 中的自定义字段单独一组展示。

### 封面展示

- 有封面：全宽图片 + 右下角 MIME 类型角标（JPEG/PNG）
- 无封面：虚线占位框 + "无封面"文字

### 手机模式额外展示

顶部横排：封面缩略图（88×88px 圆角）+ 标题/艺术家/专辑 + 格式/年份/采样率 tag

### 显示模式

- **side**：绝对定位叠加播放页右侧，min(340px, 100vw)，从右滑入（translateX 动画）
- **sheet**：Teleport to body，底部弹出，max-height 85vh，顶部把手条

---

## audioMetadata.js — 全格式元数据解析器

### 支持格式与解析方式

| 格式 | 解析方式 | 关键字段来源 |
|------|---------|------------|
| .mp3 / .wma | ID3v2.2/2.3/2.4 全帧 + ID3v1 fallback | TIT2/TPE1/TPE2/TALB/TRCK/TPOS/TCON/TDRC/APIC/USLT/COMM/TXXX… |
| .m4a / .aac / .mp4 | MP4 box 树（moov/udta/meta/ilst 或 moov/meta/ilst）| ©nam/©ART/aART/©alb/©day/©lyr/covr/trkn/disk/tmpo/©too… |
| .flac / .alac | STREAMINFO（技术参数）+ Vorbis Comment + PICTURE block | 全部 Vorbis 标签 |
| .ogg / .opus | Ogg page header → Vorbis Comment / OpusTags | 全部 Vorbis 标签 |
| .wav | fmt chunk（技术参数）+ LIST INFO chunk + 内嵌 ID3 | INAM/IART/IPRD/ICRD/IGNR/ICMT/ISRC… |

### 返回 AudioMeta 结构

```js
{
  // 基本标签
  title: string|null,
  artist: string|null,
  albumArtist: string|null,
  album: string|null,
  year: string|null,          // 4位年份字符串
  trackNumber: string|null,
  trackTotal: string|null,
  discNumber: string|null,
  discTotal: string|null,
  genre: string|null,
  composer: string|null,
  comment: string|null,
  bpm: string|null,
  lyrics: string|null,        // 内嵌歌词原文（可能是 LRC 或纯文本）

  // 封面
  cover: string|null,         // base64 data URL
  coverMime: string|null,     // 'image/jpeg' | 'image/png'

  // 技术参数
  format: string|null,        // 'MP3'|'M4A'|'FLAC'|'OGG'|'OPUS'|'WAV'
  bitrate: number|null,       // kbps
  sampleRate: number|null,    // Hz
  channels: number|null,      // 1|2|...
  duration: number|null,      // 秒

  // 其他
  encoder: string|null,
  copyright: string|null,
  url: string|null,
  isrc: string|null,
  extra: {}                   // 非标准/自定义字段键值对
}
```

---

## SleepTimer.vue — 定时停止组件

**Props：** `sleepMinutes`（0=未设置，-1=本曲结束后），`sleepEndTime`（时间戳 ms），`variant`('player'|'minibar')

**Emits：** `set-sleep-timer(minutes)`, `cancel-sleep-timer`

### 预设选项

15 / 30 / 45 / 60 / 90 分钟 + "本曲结束后" + 自定义分钟数输入框（1-999）

### 显示

- **PC 端**：Transition 浮窗（底部弹出，右对齐，点外部关闭）
- **手机端**：Teleport to body + 底部 Sheet（遮罩 + 上滑动画）

激活时按钮旁显示倒计时徽标（Orbitron 字体），面板内显示大号倒计时数字。

---

## lrcParser.js

```js
// 解析 LRC 文本，返回按时间排序的歌词数组
parseLRC(lrcText: string): Array<{time: number, text: string}>

// 根据当前播放时间找到对应歌词行索引
findCurrentLyricIndex(lyrics: Array, currentTime: number): number
```

支持 `[mm:ss.xx]` / `[mm:ss.xxx]` 格式，一行可有多个时间标签。

---

## CSS 兼容性规范

### 每个组件 `<style scoped>` 开头必须包含

```css
/* ── 跨浏览器重置 ── */
button {
  -webkit-appearance: none; -moz-appearance: none; appearance: none;
  outline: none; font-family: inherit;
}
button:focus-visible { outline: 2px solid var(--t-accent1); outline-offset: 2px; }
input[type="range"] {
  -webkit-appearance: none; -moz-appearance: none; appearance: none; outline: none;
}
input[type="range"]::-moz-range-track {
  height: 3px; border-radius: 999px; background: var(--t-border); border: none;
}
```

### 强制配对规则

| 属性 | 要求 |
|------|------|
| `backdrop-filter` | 必须同时有 `-webkit-backdrop-filter`（两者成对，顺序：webkit 在前）|
| `-webkit-background-clip: text` | 必须同时有标准 `background-clip: text` |
| `-webkit-text-fill-color: transparent` | 必须补 `color: transparent`（Firefox 不识别 text-fill-color）|
| `::-webkit-slider-thumb` | 必须配对 `::-moz-range-thumb`（去掉 -webkit-appearance）|
| `scrollbar-width: none` | 必须配对 `::-webkit-scrollbar { display: none }` |

---

## 启动方式

```bash
# 1. 安装依赖
npm install

# 2. 启动音乐文件服务（默认端口 8080）
node server.js --root /your/music/path --port 8080 --host 0.0.0.0

# 3. 启动前端开发服务（/api/* 自动代理到 8080）
npm run dev

# 4. 浏览器访问
# http://localhost:5173
# 手机同局域网访问：http://<本机IP>:5173

# 点击「聆听音乐」自动连接当前域名的 API 服务，无需输入地址
```

### 生产构建

```bash
npm run build
# dist/ 目录部署到与 server.js 同域名下
# server.js 同时提供 /api/* 接口和静态文件服务（需自行配置 nginx 或扩展 server.js）
```