<script setup>
import {onMounted, onUnmounted, ref} from 'vue'
import SleepTimer from './SleepTimer.vue'
import PlaylistPanel from './PlaylistPanel.vue'

const props = defineProps({
  displayTitle: {type: String, required: true},
  artistName: {type: String, required: true},
  isPlaying: {type: Boolean, required: true},
  isFavorite: {type: Boolean, required: true},
  volume: {type: Number, required: true},
  playMode: {type: String, required: true},
  playlist: {type: Array, required: true},
  currentIndex: {type: Number, required: true},
  progressPercent: {type: Number, required: true},
  sleepMinutes: {type: Number, default: 0},
  sleepEndTime: {type: Number, default: 0},
})
const emit = defineEmits([
  'open-player', 'toggle-play', 'prev', 'next',
  'toggle-fav', 'volume-change', 'cycle-play-mode',
  'load-index', 'remove-from-playlist',
  'set-sleep-timer', 'cancel-sleep-timer',
])

const showPlaylist = ref(false)
const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 640
}
onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => window.removeEventListener('resize', checkMobile))
</script>

<template>
  <div class="minibar">
    <!-- 顶部进度细条 -->
    <div class="minibar-progress">
      <div class="minibar-fill" :style="{ width: progressPercent + '%' }"></div>
    </div>

    <div class="minibar-inner">
      <!-- 左：专辑 + 信息 -->
      <div class="minibar-left" @click="emit('open-player')">
        <div class="mini-disc" :class="{ spinning: isPlaying }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
        <div class="mini-info">
          <span class="mini-title">{{ displayTitle }}</span>
          <span class="mini-artist">{{ artistName }}</span>
        </div>
      </div>

      <!-- 中：控制 -->
      <div class="minibar-center">
        <button class="mb-btn mb-fav" :class="{ active: isFavorite }" @click="emit('toggle-fav')">
          <svg viewBox="0 0 24 24" :fill="isFavorite?'currentColor':'none'" stroke="currentColor" stroke-width="2">
            <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <button class="mb-btn mb-mode" @click="emit('cycle-play-mode')">
          <svg v-if="playMode==='order'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
          <svg v-else-if="playMode==='shuffle'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 3 21 3 21 8"/>
            <line x1="4" y1="20" x2="21" y2="3"/>
            <polyline points="21 16 21 21 16 21"/>
            <line x1="15" y1="15" x2="21" y2="21"/>
            <line x1="4" y1="4" x2="9" y2="9"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            <text x="9.5" y="14.5" font-size="6" fill="currentColor" stroke="none" font-weight="bold">1</text>
          </svg>
        </button>
        <button class="mb-btn mb-prev" @click="emit('prev')">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="19,20 9,12 19,4"/>
            <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>
        <button class="mb-btn mb-play" @click="emit('toggle-play')">
          <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </button>
        <button class="mb-btn mb-next" @click="emit('next')">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,4 15,12 5,20"/>
            <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>
      </div>

      <!-- 右：音量 + 定时 + 列表 -->
      <div class="minibar-right">
        <div class="mini-volume">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="vol-ico">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
          <input type="range" min="0" max="1" step="0.01" :value="volume" class="mini-vol-slider"
                 @input="emit('volume-change', $event)"/>
        </div>
        <SleepTimer variant="minibar" :sleep-minutes="sleepMinutes" :sleep-end-time="sleepEndTime"
                    @set-sleep-timer="emit('set-sleep-timer', $event)"
                    @cancel-sleep-timer="emit('cancel-sleep-timer')"/>
        <button class="mb-btn mb-list" :class="{ active: showPlaylist }"
                @click.stop="showPlaylist = !showPlaylist">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
          <span class="pl-badge" v-if="playlist.length">{{ playlist.length }}</span>
        </button>
      </div>
    </div>
  </div>

  <!-- PC端：右侧固定侧栏 -->
  <PlaylistPanel
      v-if="!isMobile"
      :show="showPlaylist"
      :playlist="playlist"
      :current-index="currentIndex"
      mode="side"
      :use-fixed="true"
      offset-bottom="68px"
      @close="showPlaylist = false"
      @load-index="emit('load-index', $event)"
      @remove-from-playlist="emit('remove-from-playlist', $event)"
  />

  <!-- 手机端：底部弹出 -->
  <PlaylistPanel
      v-if="isMobile"
      :show="showPlaylist"
      :playlist="playlist"
      :current-index="currentIndex"
      mode="sheet"
      @close="showPlaylist = false"
      @load-index="emit('load-index', $event)"
      @remove-from-playlist="emit('remove-from-playlist', $event)"
  />
</template>

<style scoped>
/* ── 主体 ───────────────────────────────────── */
.minibar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 90;
  background: color-mix(in srgb, var(--t-bg) 88%, transparent);
  backdrop-filter: blur(24px) saturate(1.4);
  border-top: 1px solid var(--t-border);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.18);
}

.minibar-progress {
  height: 2px;
  background: var(--t-overlay);
  position: relative;
}

.minibar-fill {
  position: absolute;
  inset: 0;
  right: auto;
  background: var(--t-progress);
  transition: width 0.4s linear;
  border-radius: 999px;
}

.minibar-inner {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 68px;
  gap: 0;
}

/* ── 左侧 ───────────────────────────────────── */
.minibar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 260px;
  min-width: 0;
  cursor: pointer;
  flex-shrink: 0;
}

.mini-disc {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--t-disc-bg);
  border: 1px solid var(--t-disc-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--t-text3);
  transition: box-shadow 0.4s;
}

.mini-disc.spinning {
  animation: discSpin 6s linear infinite;
  box-shadow: 0 0 14px var(--t-disc-glow);
}

@keyframes discSpin {
  to {
    transform: rotate(360deg);
  }
}

.mini-disc svg {
  width: 18px;
  height: 18px;
}

.mini-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mini-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--t-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.mini-artist {
  font-size: 0.72rem;
  color: var(--t-text3);
  letter-spacing: 1px;
}

/* ── 中间控制 ───────────────────────────────── */
.minibar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.mb-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--t-text2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  width: 34px;
  height: 34px;
}

.mb-btn svg {
  width: 16px;
  height: 16px;
}

.mb-btn:hover {
  color: var(--t-text);
  background: var(--t-overlay);
  transform: scale(1.1);
}

.mb-btn.active {
  color: var(--t-accent1);
}

.mb-fav.active {
  color: var(--t-accent3);
}

.mb-play {
  width: 44px;
  height: 44px;
  background: var(--t-play-bg) !important;
  color: #fff !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.mb-play svg {
  width: 20px;
  height: 20px;
}

.mb-play:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--t-accent1) 50%, transparent);
}

.mb-list {
  position: relative;
}

.mb-list.active {
  color: var(--t-accent1);
}

.pl-badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: var(--t-accent1);
  color: white;
  font-size: 0.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  pointer-events: none;
}

/* ── 右侧 ───────────────────────────────────── */
.minibar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 260px;
  justify-content: flex-end;
  flex-shrink: 0;
}

.mini-volume {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vol-ico {
  width: 15px;
  height: 15px;
  color: var(--t-text3);
  flex-shrink: 0;
}

.mini-vol-slider {
  -webkit-appearance: none;
  width: 88px;
  height: 3px;
  border-radius: 999px;
  background: var(--t-border);
  outline: none;
  cursor: pointer;
}

.mini-vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--t-accent1);
  cursor: pointer;
  box-shadow: 0 0 6px var(--t-disc-glow);
}

/* ── 响应式 ─────────────────────────────────── */
@media (max-width: 640px) {
  .minibar-left {
    width: auto;
    flex: 1;
  }

  .minibar-right {
    width: auto;
  }

  .mini-volume {
    display: none;
  }

  .mb-mode {
    display: none;
  }

  .mb-fav {
    display: none;
  }
}
</style>