<script setup>
import {ref, watch} from 'vue'

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
})

const emit = defineEmits([
  'open-player', 'toggle-play', 'prev', 'next',
  'toggle-fav', 'volume-change', 'cycle-play-mode',
  'load-index', 'remove-from-playlist',
])

const showPlaylist = ref(false)
const playlistRef = ref(null)

const onDocClick = (e) => {
  if (playlistRef.value && !playlistRef.value.contains(e.target))
    showPlaylist.value = false
}
watch(showPlaylist, (v) => {
  v ? document.addEventListener('click', onDocClick, true)
      : document.removeEventListener('click', onDocClick, true)
})

const playModeIcon = {order: 'order', shuffle: 'shuffle', repeat: 'repeat'}
</script>

<template>
  <div class="minibar">
    <!-- 进度条（顶部细条） -->
    <div class="minibar-progress">
      <div class="minibar-fill" :style="{ width: progressPercent + '%' }"></div>
    </div>

    <div class="minibar-inner">
      <!-- 专辑图 + 歌曲信息 -->
      <div class="minibar-left" @click="emit('open-player')" title="打开播放页">
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

      <!-- 中间控制区 -->
      <div class="minibar-center">
        <!-- 收藏 -->
        <button class="mb-btn mb-fav" :class="{ active: isFavorite }" @click="emit('toggle-fav')" title="收藏">
          <svg viewBox="0 0 24 24" :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
            <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>

        <!-- 播放模式 -->
        <button class="mb-btn mb-mode" @click="emit('cycle-play-mode')"
                :title="{ order:'顺序播放', shuffle:'随机播放', repeat:'单曲循环' }[playMode]">
          <!-- 顺序 -->
          <svg v-if="playMode === 'order'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
          <!-- 随机 -->
          <svg v-else-if="playMode === 'shuffle'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2">
            <polyline points="16 3 21 3 21 8"/>
            <line x1="4" y1="20" x2="21" y2="3"/>
            <polyline points="21 16 21 21 16 21"/>
            <line x1="15" y1="15" x2="21" y2="21"/>
            <line x1="4" y1="4" x2="9" y2="9"/>
          </svg>
          <!-- 单曲循环 -->
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            <text x="9.5" y="14.5" font-size="6" fill="currentColor" stroke="none" font-weight="bold">1</text>
          </svg>
        </button>

        <!-- 上一曲 -->
        <button class="mb-btn mb-prev" @click="emit('prev')" title="上一曲">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="19,20 9,12 19,4"/>
            <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>

        <!-- 播放/暂停（大按钮） -->
        <button class="mb-btn mb-play" @click="emit('toggle-play')">
          <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </button>

        <!-- 下一曲 -->
        <button class="mb-btn mb-next" @click="emit('next')" title="下一曲">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,4 15,12 5,20"/>
            <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>
      </div>

      <!-- 右侧：音量 + 播放列表 -->
      <div class="minibar-right">
        <!-- 音量 -->
        <div class="mini-volume">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="vol-ico">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
          <input type="range" min="0" max="1" step="0.01" :value="volume" class="mini-vol-slider"
                 @input="emit('volume-change', $event)"/>
        </div>

        <!-- 播放列表 -->
        <div class="mini-pl-wrap" ref="playlistRef">
          <button class="mb-btn mb-list" :class="{ active: showPlaylist }"
                  @click.stop="showPlaylist = !showPlaylist" title="播放列表">
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

          <Transition name="pl-up">
            <div v-if="showPlaylist" class="mini-pl-panel">
              <div class="mini-pl-header">
                <span>播放列表</span>
                <span class="mini-pl-count">{{ playlist.length }} 首</span>
              </div>
              <div class="mini-pl-scroll">
                <div v-if="playlist.length === 0" class="mini-pl-empty">播放列表为空</div>
                <div v-for="(song, i) in playlist" :key="song.name + i"
                     class="mini-pl-item" :class="{ 'pl-cur': i === currentIndex }"
                     @click="emit('load-index', i); showPlaylist = false">
                  <span class="mini-pl-num">{{ i + 1 }}</span>
                  <span class="mini-pl-name">{{ song.name.replace(/\.[^.]+$/, '') }}</span>
                  <button class="mini-pl-del" @click.stop="emit('remove-from-playlist', i)">
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
    </div>
  </div>
</template>

<style scoped>
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

/* 顶部进度细条 */
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

/* 左侧：专辑 + 信息 */
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
  background: var(--t-disc-bg);
  border: 2px solid var(--t-disc-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--t-audio-clr);
  flex-shrink: 0;
  box-shadow: 0 0 14px var(--t-disc-glow);
  transition: box-shadow 0.3s;
}

.mini-disc svg {
  width: 18px;
  height: 18px;
}

.mini-disc.spinning {
  animation: discSpin 4s linear infinite;
}

@keyframes discSpin {
  to {
    transform: rotate(360deg);
  }
}

.minibar-left:hover .mini-disc {
  box-shadow: 0 0 22px var(--t-disc-glow);
}

.mini-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mini-title {
  font-size: 0.87rem;
  font-weight: 600;
  color: var(--t-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}

.minibar-left:hover .mini-title {
  color: var(--t-accent1);
}

.mini-artist {
  font-size: 0.72rem;
  color: var(--t-text3);
  letter-spacing: 1px;
}

/* 中间控制 */
.minibar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.mb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--t-text2);
  border-radius: 50%;
  transition: all 0.2s;
}

.mb-btn svg {
  width: 18px;
  height: 18px;
}

.mb-btn:hover {
  color: var(--t-text);
  transform: scale(1.1);
}

.mb-fav {
  padding: 6px;
}

.mb-fav.active {
  color: #f953c6;
}

.mb-fav.active:hover {
  color: #f953c6;
}

.mb-mode {
  padding: 6px;
}

.mb-mode:hover {
  color: var(--t-accent2);
}

.mb-prev, .mb-next {
  padding: 7px;
}

.mb-prev:hover, .mb-next:hover {
  color: var(--t-accent1);
}

.mb-play {
  width: 44px;
  height: 44px;
  background: var(--t-play-bg);
  color: white;
  border-radius: 50%;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--t-accent1) 35%, transparent);
  transition: all 0.2s;
  flex-shrink: 0;
}

.mb-play svg {
  width: 20px;
  height: 20px;
}

.mb-play:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--t-accent1) 50%, transparent);
}

/* 右侧：音量 + 播放列表 */
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

/* 播放列表 */
.mini-pl-wrap {
  position: relative;
}

.mb-list {
  padding: 7px;
  position: relative;
}

.mb-list.active {
  color: var(--t-accent1);
}

.mb-list:hover {
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

.mini-pl-panel {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  width: 280px;
  max-height: 320px;
  background: color-mix(in srgb, var(--t-bg) 96%, white);
  border: 1px solid var(--t-border);
  border-radius: 14px;
  box-shadow: 0 -16px 48px var(--t-shadow, rgba(0, 0, 0, 0.4));
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mini-pl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
  font-size: 0.72rem;
  letter-spacing: 2px;
  color: var(--t-label-color);
  font-family: 'Orbitron', monospace;
  border-bottom: 1px solid var(--t-border);
}

.mini-pl-count {
  font-size: 0.72rem;
  color: var(--t-text3);
  font-family: inherit;
}

.mini-pl-scroll {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--t-border) transparent;
  flex: 1;
}

.mini-pl-empty {
  padding: 20px;
  text-align: center;
  color: var(--t-text3);
  font-size: 0.82rem;
}

.mini-pl-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.mini-pl-item:hover {
  background: var(--t-overlay);
}

.mini-pl-item.pl-cur {
  background: color-mix(in srgb, var(--t-accent1) 8%, transparent);
}

.mini-pl-item.pl-cur .mini-pl-name {
  color: var(--t-accent1);
  font-weight: 600;
}

.mini-pl-num {
  font-size: 0.7rem;
  color: var(--t-text3);
  width: 18px;
  flex-shrink: 0;
  text-align: right;
}

.mini-pl-name {
  flex: 1;
  font-size: 0.82rem;
  color: var(--t-text2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-pl-del {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--t-text3);
  padding: 2px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.15s;
  display: flex;
}

.mini-pl-del svg {
  width: 12px;
  height: 12px;
}

.mini-pl-item:hover .mini-pl-del {
  opacity: 1;
}

.mini-pl-del:hover {
  color: #ff5050;
  background: rgba(255, 80, 80, 0.12);
}

/* 弹出动画 */
.pl-up-enter-active {
  animation: plUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.pl-up-leave-active {
  animation: plUp 0.16s ease reverse;
}

@keyframes plUp {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.97)
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1)
  }
}

/* 响应式：小屏收起音量和播放模式 */
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