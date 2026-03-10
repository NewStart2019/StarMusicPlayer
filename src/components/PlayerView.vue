<script setup>
import {ref, watch} from 'vue'

const props = defineProps({
  displayTitle: {type: String, required: true},
  artistName: {type: String, required: true},
  isPlaying: {type: Boolean, required: true},
  albumRotation: {type: Number, required: true},
  currentTime: {type: Number, required: true},
  duration: {type: Number, required: true},
  progressPercent: {type: Number, required: true},
  volume: {type: Number, required: true},
  lyrics: {type: Array, required: true},
  currentLyricIndex: {type: Number, required: true},
  isFavorite: {type: Boolean, required: true},
  playlist: {type: Array, required: true},
  currentIndex: {type: Number, required: true},
})

const emit = defineEmits([
  'close', 'toggle-play', 'prev', 'next',
  'seek', 'drag-start', 'volume-change',
  'toggle-fav', 'load-index', 'lyric-seek',
  'remove-from-playlist',
])

const mobileTab = ref('player')
const progressBarRef = ref(null)
const mobileProgressRef = ref(null)
const lyricsContainerRef = ref(null)
const mobileLyricsRef = ref(null)
const showPlaylist = ref(false)
const playlistPanelRef = ref(null)

defineExpose({progressBarRef, mobileProgressRef, lyricsContainerRef, mobileLyricsRef})

// 点击面板外部关闭播放列表
const onDocClick = (e) => {
  if (playlistPanelRef.value && !playlistPanelRef.value.contains(e.target))
    showPlaylist.value = false
}
watch(showPlaylist, (v) => {
  v ? document.addEventListener('click', onDocClick, true)
      : document.removeEventListener('click', onDocClick, true)
})

const fmt = (sec) => {
  if (isNaN(sec) || sec < 0) return '00:00'
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const dotStart = (i) => Math.max(0, props.currentIndex - 3) + i
</script>

<template>
  <div class="player-modal">
    <div class="player-inner">

      <button class="btn-close" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <!-- ===== 桌面左侧 ===== -->
      <div class="player-left">
        <div class="song-info">
          <h1 class="song-title">{{ displayTitle }}</h1>
          <p class="song-artist">{{ artistName }}</p>
        </div>

        <div class="album-wrap">
          <div class="album-ring ring-outer"></div>
          <div class="album-ring ring-mid"></div>
          <div class="album-disc" :style="{ transform: `rotate(${albumRotation}deg)` }">
            <div class="disc-grooves">
              <div class="disc-groove" v-for="i in 8" :key="i"></div>
            </div>
            <div class="disc-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
          </div>
          <div class="album-glow" :class="{ active: isPlaying }"></div>
        </div>

        <div class="progress-section">
          <div class="time-display">
            <span>{{ fmt(currentTime) }}</span>
            <span>{{ fmt(duration) }}</span>
          </div>
          <div class="progress-bar" ref="progressBarRef"
               @click="emit('seek', $event)"
               @mousedown="emit('drag-start', $event)"
               @touchstart.prevent="emit('drag-start', $event)">
            <div class="progress-bg"></div>
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
          </div>
        </div>

        <!-- 主控制行：收藏 上一曲 播放/暂停 下一曲 播放列表 -->
        <div class="controls">
          <button class="ctrl-btn ctrl-fav" :class="{ active: isFavorite }" @click="emit('toggle-fav')">
            <svg viewBox="0 0 24 24" :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor"
                 stroke-width="2">
              <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button class="ctrl-btn ctrl-prev" @click="emit('prev')">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="19,20 9,12 19,4"/>
              <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          <button class="ctrl-btn ctrl-play" @click="emit('toggle-play')">
            <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </button>
          <button class="ctrl-btn ctrl-next" @click="emit('next')">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,4 15,12 5,20"/>
              <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>

          <!-- 播放列表按钮 + 弹出面板 -->
          <div class="pl-wrap" ref="playlistPanelRef">
            <button class="ctrl-btn ctrl-list" :class="{ active: showPlaylist }"
                    @click.stop="showPlaylist = !showPlaylist" title="播放列表">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </button>
            <Transition name="pl-anim">
              <div v-if="showPlaylist" class="pl-panel">
                <div class="pl-header">
                  <span class="pl-label">播放列表</span>
                  <span class="pl-count">{{ playlist.length }} 首</span>
                </div>
                <div class="pl-scroll">
                  <div v-if="playlist.length === 0" class="pl-empty">播放列表为空</div>
                  <div v-for="(song, i) in playlist" :key="song.name + i"
                       class="pl-item" :class="{ 'pl-cur': i === currentIndex }"
                       @click="emit('load-index', i)">
                    <span class="pl-num">{{ i + 1 }}</span>
                    <span class="pl-name">{{ song.name.replace(/\.[^.]+$/, '') }}</span>
                    <button class="pl-del" @click.stop="emit('remove-from-playlist', i)" title="移除">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- 音量行（独立一行） -->
        <div class="volume-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="vol-icon">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
          <input type="range" min="0" max="1" step="0.01" :value="volume" class="volume-slider"
                 @input="emit('volume-change', $event)"/>
        </div>

        <div class="playlist-dots">
          <span
              v-for="(_, i) in playlist.slice(Math.max(0,currentIndex-3), Math.min(playlist.length,currentIndex+4))"
              :key="i" class="dot" :class="{ active: dotStart(i) === currentIndex }"
              @click="emit('load-index', dotStart(i))"
          ></span>
        </div>
      </div>

      <!-- ===== 桌面右侧：歌词 ===== -->
      <div class="player-right desktop-lyrics">
        <div class="lyrics-header">
          <span class="lyrics-label">LYRICS</span>
          <div class="lyrics-deco"></div>
        </div>
        <div v-if="lyrics.length > 0" class="lyrics-container" ref="lyricsContainerRef">
          <div class="lyrics-spacer"></div>
          <div v-for="(line, i) in lyrics" :key="i"
               class="lyric-line"
               :class="{ active: i === currentLyricIndex, prev: i < currentLyricIndex, next: i > currentLyricIndex }"
               @click="emit('lyric-seek', line.time)"
          >{{ line.text || '♪' }}
          </div>
          <div class="lyrics-spacer"></div>
        </div>
        <div v-else class="no-lyrics">
          <div class="no-lyrics-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <p>暂无歌词</p>
          <span>将同名 .lrc 文件放在歌曲同目录下</span>
        </div>
      </div>

      <!-- ===== 手机端 Tab 布局 ===== -->
      <div class="mobile-player">
        <div class="mobile-tabs">
          <button class="m-tab" :class="{ active: mobileTab === 'player' }" @click="mobileTab = 'player'">播放</button>
          <button class="m-tab" :class="{ active: mobileTab === 'lyrics' }" @click="mobileTab = 'lyrics'">歌词</button>
        </div>

        <div v-show="mobileTab === 'player'" class="m-content">
          <div class="song-info">
            <h1 class="song-title m-title">{{ displayTitle }}</h1>
            <p class="song-artist">{{ artistName }}</p>
          </div>
          <div class="album-wrap m-album">
            <div class="album-ring ring-outer"></div>
            <div class="album-ring ring-mid"></div>
            <div class="album-disc" :style="{ transform: `rotate(${albumRotation}deg)` }">
              <div class="disc-grooves">
                <div class="disc-groove" v-for="i in 8" :key="i"></div>
              </div>
              <div class="disc-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
            </div>
            <div class="album-glow" :class="{ active: isPlaying }"></div>
          </div>
          <div class="progress-section">
            <div class="time-display">
              <span>{{ fmt(currentTime) }}</span><span>{{ fmt(duration) }}</span>
            </div>
            <div class="progress-bar" ref="mobileProgressRef"
                 @click="emit('seek', $event)"
                 @mousedown="emit('drag-start', $event)"
                 @touchstart.prevent="emit('drag-start', $event)">
              <div class="progress-bg"></div>
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
              <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
            </div>
          </div>

          <!-- 手机主控制行 -->
          <div class="controls m-controls">
            <button class="ctrl-btn ctrl-fav" :class="{ active: isFavorite }" @click="emit('toggle-fav')">
              <svg viewBox="0 0 24 24" :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor"
                   stroke-width="2">
                <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <button class="ctrl-btn ctrl-prev" @click="emit('prev')">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="19,20 9,12 19,4"/>
                <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </button>
            <button class="ctrl-btn ctrl-play" @click="emit('toggle-play')">
              <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            </button>
            <button class="ctrl-btn ctrl-next" @click="emit('next')">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,4 15,12 5,20"/>
                <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </button>
            <!-- 手机播放列表按钮 -->
            <button class="ctrl-btn ctrl-list" :class="{ active: showPlaylist }"
                    @click.stop="showPlaylist = !showPlaylist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </button>
          </div>

          <!-- 手机音量行 -->
          <div class="volume-row m-volume-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="vol-icon">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <input type="range" min="0" max="1" step="0.01" :value="volume" class="volume-slider"
                   @input="emit('volume-change', $event)"/>
          </div>
        </div>

        <!-- 手机歌词 tab -->
        <div v-show="mobileTab === 'lyrics'" class="m-content m-lyrics-content">
          <div class="lyrics-header">
            <span class="lyrics-label">LYRICS</span>
            <div class="lyrics-deco"></div>
          </div>
          <div v-if="lyrics.length > 0" class="lyrics-container m-lyrics-scroll" ref="mobileLyricsRef">
            <div class="lyrics-spacer"></div>
            <div v-for="(line, i) in lyrics" :key="i"
                 class="lyric-line"
                 :class="{ active: i === currentLyricIndex, prev: i < currentLyricIndex, next: i > currentLyricIndex }"
            >{{ line.text || '♪' }}
            </div>
            <div class="lyrics-spacer"></div>
          </div>
          <div v-else class="no-lyrics">
            <div class="no-lyrics-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <p>暂无歌词</p>
          </div>
        </div>

        <!-- 手机播放列表弹层（全屏遮罩） -->
        <Transition name="m-pl-anim">
          <div v-if="showPlaylist" class="m-pl-overlay" @click.self="showPlaylist = false">
            <div class="m-pl-sheet">
              <div class="pl-header">
                <span class="pl-label">播放列表</span>
                <span class="pl-count">{{ playlist.length }} 首</span>
                <button class="pl-close-btn" @click="showPlaylist = false">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div class="pl-scroll">
                <div v-if="playlist.length === 0" class="pl-empty">播放列表为空</div>
                <div v-for="(song, i) in playlist" :key="song.name + i"
                     class="pl-item" :class="{ 'pl-cur': i === currentIndex }"
                     @click="emit('load-index', i); showPlaylist = false">
                  <span class="pl-num">{{ i + 1 }}</span>
                  <span class="pl-name">{{ song.name.replace(/\.[^.]+$/, '') }}</span>
                  <button class="pl-del" @click.stop="emit('remove-from-playlist', i)" title="移除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>

    </div>
  </div>
</template>

<style scoped>
.player-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: stretch;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(18px);
}

.player-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  background: radial-gradient(ellipse at 20% 20%, color-mix(in srgb, var(--t-accent2) 8%, transparent) 0%, transparent 60%),
  radial-gradient(ellipse at 80% 80%, color-mix(in srgb, var(--t-accent4) 8%, transparent) 0%, transparent 60%),
  var(--t-bg-glass);
  overflow: hidden;
}

.btn-close {
  position: absolute;
  top: 20px;
  right: 22px;
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--t-overlay);
  border: 1px solid var(--t-border);
  color: var(--t-text2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s;
}

.btn-close svg {
  width: 16px;
  height: 16px;
}

.btn-close:hover {
  background: rgba(255, 60, 60, 0.18);
  border-color: rgba(255, 60, 60, 0.5);
  color: #ff5050;
  transform: rotate(90deg);
}

/* ── 左侧 ── */
.player-left {
  width: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 36px 44px;
  border-right: 1px solid var(--t-border);
  overflow-y: auto;
}

.song-info {
  text-align: center;
  width: 100%;
}

.song-title {
  font-family: 'Orbitron', monospace, sans-serif;
  font-size: clamp(0.95rem, 2.2vw, 1.7rem);
  font-weight: 700;
  background: var(--t-title-grad);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 6px;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  color: var(--t-text2);
  font-size: 0.88rem;
  letter-spacing: 2px;
}

/* ── 专辑封面 ── */
.album-wrap {
  position: relative;
  width: min(200px, 22vw);
  height: min(200px, 22vw);
  flex-shrink: 0;
}

.album-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--t-disc-border);
  animation: ringPulse 3s ease-in-out infinite;
}

.ring-outer {
  inset: -16px;
  animation-delay: 0s;
}

.ring-mid {
  inset: -5px;
  animation-delay: -1.5s;
}

@keyframes ringPulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1)
  }
  50% {
    opacity: 0.65;
    transform: scale(1.025)
  }
}

.album-disc {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--t-disc-bg);
  border: 2px solid var(--t-disc-border);
  overflow: hidden;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
}

.disc-grooves {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.disc-groove {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--t-overlay);
}

.disc-groove:nth-child(1) {
  width: 90%;
  height: 90%
}

.disc-groove:nth-child(2) {
  width: 78%;
  height: 78%
}

.disc-groove:nth-child(3) {
  width: 66%;
  height: 66%
}

.disc-groove:nth-child(4) {
  width: 54%;
  height: 54%
}

.disc-groove:nth-child(5) {
  width: 42%;
  height: 42%
}

.disc-groove:nth-child(6) {
  width: 30%;
  height: 30%
}

.disc-groove:nth-child(7) {
  width: 20%;
  height: 20%
}

.disc-groove:nth-child(8) {
  width: 10%;
  height: 10%
}

.disc-center {
  position: absolute;
  inset: 50%;
  transform: translate(-50%, -50%);
  width: 28%;
  height: 28%;
  border-radius: 50%;
  background: var(--t-disc-center);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px var(--t-disc-glow);
}

.disc-center svg {
  width: 40%;
  height: 40%;
  color: rgba(0, 0, 0, 0.7);
}

.album-glow {
  position: absolute;
  inset: -28px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--t-disc-glow), transparent 70%);
  opacity: 0;
  transition: opacity 1s;
  pointer-events: none;
  animation: glowPulse 2.5s ease-in-out infinite;
}

.album-glow.active {
  opacity: 1;
}

@keyframes glowPulse {
  0%, 100% {
    transform: scale(1)
  }
  50% {
    transform: scale(1.06)
  }
}

/* ── 进度条 ── */
.progress-section {
  width: 100%;
}

.time-display {
  display: flex;
  justify-content: space-between;
  color: var(--t-text3);
  font-size: 0.78rem;
  font-family: 'Orbitron', monospace;
  margin-bottom: 6px;
}

.progress-bar {
  position: relative;
  height: 4px;
  border-radius: 999px;
  cursor: pointer;
  padding: 8px 0;
  box-sizing: content-box;
}

.progress-bg {
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  bottom: 8px;
  background: var(--t-overlay2, rgba(255, 255, 255, 0.1));
  border-radius: 999px;
}

.progress-fill {
  position: absolute;
  top: 8px;
  left: 0;
  bottom: 8px;
  background: var(--t-progress);
  border-radius: 999px;
  transition: width 0.12s linear;
  box-shadow: 0 0 8px color-mix(in srgb, var(--t-accent1) 50%, transparent);
}

.progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 10px var(--t-accent1);
  transition: left 0.12s linear;
  cursor: grab;
}

.progress-thumb:active {
  cursor: grabbing;
}

.progress-bar:hover .progress-thumb {
  transform: translate(-50%, -50%) scale(1.25);
}

/* ── 主控制行 ── */
.controls {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  justify-content: center;
}

.ctrl-btn {
  background: none;
  border: none;
  color: var(--t-text2);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 0;
}

.ctrl-btn:hover {
  color: var(--t-text);
  transform: scale(1.12);
}

.ctrl-fav {
  width: 36px;
  height: 36px;
}

.ctrl-fav svg {
  width: 18px;
  height: 18px;
}

.ctrl-fav.active {
  color: var(--t-accent4);
  filter: drop-shadow(0 0 5px var(--t-accent4));
}

.ctrl-prev, .ctrl-next {
  width: 40px;
  height: 40px;
}

.ctrl-prev svg, .ctrl-next svg {
  width: 20px;
  height: 20px;
}

.ctrl-play {
  width: 60px;
  height: 60px;
  background: var(--t-play-bg);
  color: rgba(0, 0, 0, 0.8);
  border-radius: 50%;
  box-shadow: 0 0 26px color-mix(in srgb, var(--t-accent1) 40%, transparent);
  transition: all 0.2s;
}

.ctrl-play svg {
  width: 24px;
  height: 24px;
}

.ctrl-play:hover {
  transform: scale(1.08);
  box-shadow: 0 0 38px color-mix(in srgb, var(--t-accent1) 60%, transparent);
}

.ctrl-list {
  width: 36px;
  height: 36px;
}

.ctrl-list svg {
  width: 18px;
  height: 18px;
}

.ctrl-list.active {
  color: var(--t-accent1);
  filter: drop-shadow(0 0 5px var(--t-accent1));
}

/* ── 音量行（独立一行）── */
.volume-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 0 6px;
}

.vol-icon {
  width: 15px;
  height: 15px;
  color: var(--t-text2);
  flex-shrink: 0;
}

.volume-slider {
  -webkit-appearance: none;
  flex: 1;
  height: 3px;
  border-radius: 999px;
  background: var(--t-border);
  outline: none;
  cursor: pointer;
  min-width: 0;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--t-play-bg);
  box-shadow: 0 0 6px var(--t-disc-glow);
}

/* ── 播放列表圆点 ── */
.playlist-dots {
  display: flex;
  gap: 7px;
  align-items: center;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--t-overlay2, rgba(255, 255, 255, 0.18));
  cursor: pointer;
  transition: all 0.25s;
}

.dot.active {
  width: 18px;
  border-radius: 3px;
  background: var(--t-play-bg);
  box-shadow: 0 0 6px var(--t-disc-glow);
}

.dot:hover {
  background: var(--t-text3);
}

/* ── 播放列表弹出面板（桌面）── */
.pl-wrap {
  position: relative;
}

.pl-panel {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  width: 290px;
  max-height: 340px;
  background: color-mix(in srgb, var(--t-bg) 92%, white);
  border: 1px solid var(--t-border);
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(20px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 30;
}

.pl-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px 10px;
  border-bottom: 1px solid var(--t-border);
  flex-shrink: 0;
}

.pl-label {
  font-family: 'Orbitron', monospace;
  font-size: 0.68rem;
  letter-spacing: 3px;
  color: var(--t-label-color);
  flex: 1;
}

.pl-count {
  font-size: 0.75rem;
  color: var(--t-text3);
}

.pl-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--t-text3);
  padding: 2px;
  border-radius: 4px;
  display: flex;
  transition: color 0.2s;
}

.pl-close-btn svg {
  width: 14px;
  height: 14px;
}

.pl-close-btn:hover {
  color: var(--t-text);
}

.pl-scroll {
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: var(--t-border) transparent;
}

.pl-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.18s;
}

.pl-item:hover {
  background: var(--t-overlay);
}

.pl-cur {
  background: color-mix(in srgb, var(--t-accent1) 10%, transparent) !important;
}

.pl-num {
  font-size: 0.7rem;
  color: var(--t-text3);
  font-family: 'Orbitron', monospace;
  min-width: 20px;
  flex-shrink: 0;
}

.pl-cur .pl-num {
  color: var(--t-accent1);
}

.pl-name {
  flex: 1;
  font-size: 0.83rem;
  color: var(--t-text2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.pl-cur .pl-name {
  color: var(--t-accent1);
  font-weight: 600;
}

.pl-del {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--t-text3);
  opacity: 0;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  flex-shrink: 0;
  transition: all 0.15s;
}

.pl-del svg {
  width: 13px;
  height: 13px;
}

.pl-item:hover .pl-del {
  opacity: 1;
}

.pl-del:hover {
  color: #ff5555;
  background: rgba(255, 85, 85, 0.12);
  opacity: 1;
}

.pl-empty {
  padding: 28px;
  text-align: center;
  color: var(--t-text3);
  font-size: 0.85rem;
}

/* 弹出动画 */
.pl-anim-enter-active {
  animation: plPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.pl-anim-leave-active {
  animation: plPop 0.15s ease reverse;
}

@keyframes plPop {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.96)
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1)
  }
}

/* ── 右侧歌词 ── */
.player-right {
  width: 50%;
  display: flex;
  flex-direction: column;
  padding: 34px 30px 34px 42px;
  overflow: hidden;
}

.lyrics-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  flex-shrink: 0;
}

.lyrics-label {
  font-family: 'Orbitron', monospace;
  font-size: 0.66rem;
  letter-spacing: 4px;
  color: var(--t-label-color);
  flex-shrink: 0;
}

.lyrics-deco {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--t-border), transparent);
}

.lyrics-container {
  flex: 1;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.lyrics-container::-webkit-scrollbar {
  display: none;
}

.lyrics-spacer {
  height: 38vh;
  flex-shrink: 0;
}

.lyric-line {
  width: 100%;
  text-align: center;
  padding: 9px 12px;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 400;
  color: var(--t-text3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.36s cubic-bezier(0.4, 0, 0.2, 1);
  line-height: 1.55;
}

.lyric-line:hover {
  color: var(--t-text2);
  background: var(--t-overlay);
}

.lyric-line.active {
  color: var(--t-lyric-active);
  font-size: 1.15rem;
  font-weight: 600;
  text-shadow: 0 0 18px var(--t-lyric-glow);
  transform: scale(1.04);
  background: color-mix(in srgb, var(--t-lyric-active) 5%, transparent);
}

.lyric-line.prev {
  color: var(--t-text3);
  opacity: 0.65;
}

.lyric-line.next {
  color: color-mix(in srgb, var(--t-text2) 55%, transparent);
}

.no-lyrics {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--t-text3);
}

.no-lyrics-icon {
  width: 68px;
  height: 68px;
  opacity: 0.25;
}

.no-lyrics-icon svg {
  width: 100%;
  height: 100%;
}

.no-lyrics p {
  font-size: 1.1rem;
}

.no-lyrics span {
  font-size: 0.78rem;
  opacity: 0.6;
}

/* ── 手机端默认隐藏 ── */
.mobile-player {
  display: none;
}

/* ── 平板 ≤ 880px ── */
@media (max-width: 880px) {
  .player-left {
    width: 56%;
    padding: 26px 22px;
    gap: 13px;
  }

  .player-right {
    width: 44%;
    padding: 26px 18px;
  }

  .album-wrap {
    width: min(165px, 26vw);
    height: min(165px, 26vw);
  }
}

/* ── 手机 ≤ 600px ── */
@media (max-width: 600px) {
  .player-left {
    display: none;
  }

  .desktop-lyrics {
    display: none;
  }

  .mobile-player {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .mobile-tabs {
    display: flex;
    flex-shrink: 0;
    border-bottom: 1px solid var(--t-border);
    margin-top: 54px;
  }

  .m-tab {
    flex: 1;
    padding: 11px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--t-text3);
    font-family: inherit;
    font-size: 0.88rem;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: -1px;
    letter-spacing: 1px;
  }

  .m-tab.active {
    color: var(--t-accent1);
    border-bottom-color: var(--t-accent1);
    font-weight: 600;
  }

  .m-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 16px 20px 20px;
  }

  .m-lyrics-content {
    gap: 0;
    padding: 12px 14px;
  }

  .m-lyrics-scroll {
    flex: 1;
    width: 100%;
  }

  .m-album {
    width: min(155px, 42vw) !important;
    height: min(155px, 42vw) !important;
  }

  .m-album .ring-outer {
    inset: -12px;
  }

  .m-album .ring-mid {
    inset: -4px;
  }

  .m-content .song-info {
    width: 100%;
  }

  .m-title {
    font-size: clamp(0.9rem, 4.5vw, 1.25rem) !important;
    white-space: normal !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    text-align: center;
  }

  .m-content .song-artist {
    font-size: 0.82rem;
  }

  .m-content .progress-section {
    width: 100%;
  }

  .m-controls {
    gap: 8px;
  }

  .m-controls .ctrl-play {
    width: 54px;
    height: 54px;
  }

  .m-controls .ctrl-play svg {
    width: 22px;
    height: 22px;
  }

  .m-controls .ctrl-prev, .m-controls .ctrl-next {
    width: 36px;
    height: 36px;
  }

  .m-volume-row {
    width: 100%;
    padding: 0 6px;
  }

  /* 手机播放列表：底部弹起遮罩 */
  .m-pl-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: flex-end;
  }

  .m-pl-sheet {
    width: 100%;
    max-height: 70vh;
    background: color-mix(in srgb, var(--t-bg) 95%, white);
    border-top: 1px solid var(--t-border);
    border-radius: 20px 20px 0 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .m-pl-sheet .pl-scroll {
    max-height: calc(70vh - 54px);
  }

  .m-pl-anim-enter-active {
    animation: sheetUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .m-pl-anim-leave-active {
    animation: sheetUp 0.2s ease reverse;
  }

  @keyframes sheetUp {
    from {
      opacity: 0;
      transform: translateY(100%)
    }
    to {
      opacity: 1;
      transform: translateY(0)
    }
  }
}
</style>