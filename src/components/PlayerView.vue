<script setup>
import {computed, onUnmounted, ref, watch} from 'vue'

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
  playMode: {type: String, default: 'order'},
  sleepMinutes: {type: Number, default: 0},
  sleepEndTime: {type: Number, default: 0},
})

const emit = defineEmits([
  'close', 'toggle-play', 'prev', 'next',
  'seek', 'drag-start', 'volume-change',
  'toggle-fav', 'load-index', 'lyric-seek',
  'remove-from-playlist', 'cycle-play-mode',
  'set-sleep-timer', 'cancel-sleep-timer',
])

const mobileTab = ref('player')
const progressBarRef = ref(null)
const mobileProgressRef = ref(null)
const lyricsContainerRef = ref(null)
const mobileLyricsRef = ref(null)
const showPlaylist = ref(false)
const playlistPanelRef = ref(null)
const showSleepPanel = ref(false)
const sleepPanelRef = ref(null)

const sleepCountdown = ref('')
let countdownTimer = null
const updateCountdown = () => {
  if (!props.sleepEndTime) {
    sleepCountdown.value = '';
    return
  }
  const diff = Math.max(0, props.sleepEndTime - Date.now())
  const m = Math.floor(diff / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  sleepCountdown.value = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
watch(() => props.sleepEndTime, (v) => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (v) {
    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 1000)
  } else {
    sleepCountdown.value = ''
  }
}, {immediate: true})
onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

defineExpose({progressBarRef, mobileProgressRef, lyricsContainerRef, mobileLyricsRef})

const onDocClick = (e) => {
  if (playlistPanelRef.value && !playlistPanelRef.value.contains(e.target)) showPlaylist.value = false
  if (sleepPanelRef.value && !sleepPanelRef.value.contains(e.target)) showSleepPanel.value = false
}
watch([showPlaylist, showSleepPanel], ([pl, sl]) => {
  if (pl || sl) document.addEventListener('click', onDocClick, true)
  else document.removeEventListener('click', onDocClick, true)
})

const fmt = (sec) => {
  if (isNaN(sec) || sec < 0) return '00:00'
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const dotStart = (i) => Math.max(0, props.currentIndex - 3) + i
const sleepOptions = [15, 30, 45, 60, 90]
const playModeLabel = computed(() => ({order: '顺序播放', shuffle: '随机播放', repeat: '单曲循环'})[props.playMode])
</script>

<template>
  <div class="player-modal">
    <div class="player-inner">

      <button class="btn-close" @click="emit('close')" title="收起">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"/>
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

        <!-- 主控制行 -->
        <div class="controls">
          <button class="ctrl-btn ctrl-fav" :class="{ active: isFavorite }" @click="emit('toggle-fav')" title="收藏">
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
          <div class="pl-wrap" ref="playlistPanelRef">
            <button class="ctrl-btn ctrl-list" :class="{ active: showPlaylist }"
                    @click.stop="showPlaylist = !showPlaylist; showSleepPanel = false" title="播放列表">
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
                    <button class="pl-del" @click.stop="emit('remove-from-playlist', i)">
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

        <!-- 第二行：音量 / 播放模式 / 睡眠定时 -->
        <div class="secondary-row">
          <div class="volume-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="vol-icon">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <input type="range" min="0" max="1" step="0.01" :value="volume" class="volume-slider"
                   @input="emit('volume-change', $event)"/>
          </div>

          <button class="ctrl-btn ctrl-mode" @click="emit('cycle-play-mode')" :title="playModeLabel">
            <svg v-if="playMode === 'order'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <svg v-else-if="playMode === 'shuffle'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2">
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
              <text x="10" y="14.5" font-size="5.5" fill="currentColor" stroke="none" font-weight="bold"
                    font-family="sans-serif">1
              </text>
            </svg>
          </button>

          <div class="sleep-wrap" ref="sleepPanelRef">
            <button class="ctrl-btn ctrl-sleep" :class="{ active: sleepMinutes > 0 }"
                    @click.stop="showSleepPanel = !showSleepPanel; showPlaylist = false"
                    :title="sleepMinutes > 0 ? `定时停止：${sleepCountdown}` : '定时停止'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span v-if="sleepMinutes > 0" class="sleep-badge">{{ sleepCountdown }}</span>
            </button>
            <Transition name="pl-anim">
              <div v-if="showSleepPanel" class="sleep-panel">
                <div class="sleep-header">
                  <span class="sleep-title">定时停止播放</span>
                  <button v-if="sleepMinutes > 0" class="sleep-cancel"
                          @click="emit('cancel-sleep-timer'); showSleepPanel = false">取消
                  </button>
                </div>
                <div v-if="sleepMinutes > 0" class="sleep-active">
                  <div class="sleep-countdown">{{ sleepCountdown }}</div>
                  <div class="sleep-hint">将在此时间后停止播放</div>
                </div>
                <div class="sleep-options">
                  <button v-for="min in sleepOptions" :key="min"
                          class="sleep-opt" :class="{ active: sleepMinutes === min }"
                          @click="emit('set-sleep-timer', min); showSleepPanel = false">
                    {{ min }} 分钟
                  </button>
                  <button class="sleep-opt sleep-opt-end" :class="{ active: sleepMinutes === -1 }"
                          @click="emit('set-sleep-timer', -1); showSleepPanel = false">
                    本曲结束后
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="playlist-dots">
          <span v-for="(_, i) in playlist.slice(Math.max(0,currentIndex-3), Math.min(playlist.length,currentIndex+4))"
                :key="i" class="dot" :class="{ active: dotStart(i) === currentIndex }"
                @click="emit('load-index', dotStart(i))"></span>
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

      <!-- ===== 手机 ===== -->
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
            <div class="time-display"><span>{{ fmt(currentTime) }}</span><span>{{ fmt(duration) }}</span></div>
            <div class="progress-bar" ref="mobileProgressRef"
                 @click="emit('seek', $event)" @mousedown="emit('drag-start', $event)"
                 @touchstart.prevent="emit('drag-start', $event)">
              <div class="progress-bg"></div>
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
              <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
            </div>
          </div>
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
          <div class="m-secondary-row">
            <div class="volume-row m-volume-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="vol-icon">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              <input type="range" min="0" max="1" step="0.01" :value="volume" class="volume-slider"
                     @input="emit('volume-change', $event)"/>
            </div>
            <button class="ctrl-btn ctrl-mode" @click="emit('cycle-play-mode')" :title="playModeLabel">
              <svg v-if="playMode === 'order'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="17 1 21 5 17 9"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
              <svg v-else-if="playMode === 'shuffle'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2">
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
                <text x="10" y="14.5" font-size="5.5" fill="currentColor" stroke="none" font-weight="bold"
                      font-family="sans-serif">1
                </text>
              </svg>
            </button>
            <button class="ctrl-btn ctrl-sleep" :class="{ active: sleepMinutes > 0 }"
                    @click.stop="showSleepPanel = !showSleepPanel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </button>
          </div>
        </div>
        <div v-show="mobileTab === 'lyrics'" class="m-content m-lyrics-content">
          <div class="lyrics-header"><span class="lyrics-label">LYRICS</span>
            <div class="lyrics-deco"></div>
          </div>
          <div v-if="lyrics.length > 0" class="lyrics-container m-lyrics-scroll" ref="mobileLyricsRef">
            <div class="lyrics-spacer"></div>
            <div v-for="(line, i) in lyrics" :key="i" class="lyric-line"
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
        <Transition name="m-pl-anim">
          <div v-if="showPlaylist" class="m-pl-overlay" @click.self="showPlaylist = false">
            <div class="m-pl-sheet">
              <div class="pl-header">
                <span class="pl-label">播放列表</span><span class="pl-count">{{ playlist.length }} 首</span>
                <button class="pl-close-btn" @click="showPlaylist = false">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div class="pl-scroll">
                <div v-if="playlist.length === 0" class="pl-empty">播放列表为空</div>
                <div v-for="(song, i) in playlist" :key="song.name + i" class="pl-item"
                     :class="{ 'pl-cur': i === currentIndex }"
                     @click="emit('load-index', i); showPlaylist = false">
                  <span class="pl-num">{{ i + 1 }}</span>
                  <span class="pl-name">{{ song.name.replace(/\.[^.]+$/, '') }}</span>
                  <button class="pl-del" @click.stop="emit('remove-from-playlist', i)">
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
        <Transition name="m-pl-anim">
          <div v-if="showSleepPanel" class="m-pl-overlay" @click.self="showSleepPanel = false">
            <div class="m-sleep-sheet">
              <div class="pl-header">
                <span class="pl-label">定时停止播放</span>
                <button class="pl-close-btn" @click="showSleepPanel = false">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div v-if="sleepMinutes > 0" class="m-sleep-active">
                <div class="sleep-countdown">{{ sleepCountdown }}</div>
                <div class="sleep-hint">将在此时间后停止播放</div>
                <button class="sleep-cancel-btn" @click="emit('cancel-sleep-timer'); showSleepPanel = false">取消定时
                </button>
              </div>
              <div class="m-sleep-options">
                <button v-for="min in sleepOptions" :key="min" class="sleep-opt"
                        :class="{ active: sleepMinutes === min }"
                        @click="emit('set-sleep-timer', min); showSleepPanel = false">{{ min }} 分钟
                </button>
                <button class="sleep-opt sleep-opt-end" :class="{ active: sleepMinutes === -1 }"
                        @click="emit('set-sleep-timer', -1); showSleepPanel = false">本曲结束后
                </button>
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
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(20px);
}

.player-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  background: radial-gradient(ellipse at 20% 20%, color-mix(in srgb, var(--t-accent2) 8%, transparent) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, color-mix(in srgb, var(--t-accent4) 8%, transparent) 0%, transparent 60%), var(--t-bg-glass);
  overflow: hidden;
}

.btn-close {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: 36px;
  height: 36px;
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
  width: 18px;
  height: 18px;
}

.btn-close:hover {
  background: var(--t-border);
  color: var(--t-text);
  transform: translateX(-50%) translateY(2px);
}

/* LEFT */
.player-left {
  width: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 52px 44px 30px;
  border-right: 1px solid var(--t-border);
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.player-left::-webkit-scrollbar {
  display: none;
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

/* ALBUM */
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
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
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

/* PROGRESS */
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

/* CONTROLS */
.controls {
  display: flex;
  align-items: center;
  gap: 10px;
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
  color: #f953c6;
  filter: drop-shadow(0 0 5px #f953c6);
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
  color: rgba(0, 0, 0, 0.85);
  border-radius: 50%;
  box-shadow: 0 0 26px color-mix(in srgb, var(--t-accent1) 40%, transparent);
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
}

/* SECONDARY ROW */
.secondary-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.volume-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.vol-icon {
  width: 14px;
  height: 14px;
  color: var(--t-text3);
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
  cursor: pointer;
  box-shadow: 0 0 6px var(--t-disc-glow);
}

.ctrl-mode {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
}

.ctrl-mode svg {
  width: 17px;
  height: 17px;
}

.ctrl-mode:hover {
  color: var(--t-accent2);
}

.ctrl-sleep {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  position: relative;
}

.ctrl-sleep svg {
  width: 17px;
  height: 17px;
}

.ctrl-sleep.active {
  color: var(--t-accent3);
}

.sleep-badge {
  position: absolute;
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.48rem;
  color: var(--t-accent3);
  font-family: 'Orbitron', monospace;
  white-space: nowrap;
  pointer-events: none;
}

/* SLEEP PANEL */
.sleep-wrap {
  position: relative;
}

.sleep-panel {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  width: 226px;
  background: color-mix(in srgb, var(--t-bg) 94%, white);
  border: 1px solid var(--t-border);
  border-radius: 14px;
  box-shadow: 0 20px 60px var(--t-shadow, rgba(0, 0, 0, 0.5));
  backdrop-filter: blur(20px);
  z-index: 30;
  overflow: hidden;
}

.sleep-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px 9px;
  border-bottom: 1px solid var(--t-border);
}

.sleep-title {
  font-family: 'Orbitron', monospace;
  font-size: 0.62rem;
  letter-spacing: 2px;
  color: var(--t-label-color);
}

.sleep-cancel {
  background: none;
  border: none;
  color: #ff5555;
  font-size: 0.72rem;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 6px;
  font-family: inherit;
  transition: background 0.2s;
}

.sleep-cancel:hover {
  background: rgba(255, 85, 85, 0.1);
}

.sleep-active {
  text-align: center;
  padding: 12px 14px 4px;
}

.sleep-countdown {
  font-family: 'Orbitron', monospace;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--t-accent3);
  letter-spacing: 3px;
}

.sleep-hint {
  font-size: 0.68rem;
  color: var(--t-text3);
  margin-top: 3px;
}

.sleep-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 10px 12px 12px;
}

.sleep-opt {
  padding: 8px 4px;
  border-radius: 8px;
  border: 1px solid var(--t-border);
  background: var(--t-overlay);
  color: var(--t-text2);
  font-family: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.18s;
  text-align: center;
}

.sleep-opt:hover {
  border-color: var(--t-accent3);
  color: var(--t-accent3);
  background: color-mix(in srgb, var(--t-accent3) 8%, transparent);
}

.sleep-opt.active {
  border-color: var(--t-accent3);
  color: var(--t-accent3);
  background: color-mix(in srgb, var(--t-accent3) 12%, transparent);
  font-weight: 600;
}

.sleep-opt-end {
  grid-column: 1 / -1;
}

/* DOTS */
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

/* PLAYLIST PANEL */
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
  box-shadow: 0 20px 60px var(--t-shadow, rgba(0, 0, 0, 0.65));
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

/* RIGHT LYRICS */
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

/* MOBILE HIDDEN */
.mobile-player {
  display: none;
}

@media (max-width: 880px) {
  .player-left {
    width: 56%;
    padding: 52px 22px 26px;
    gap: 12px;
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

  .m-secondary-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .m-volume-row {
    flex: 1;
  }

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

  .m-sleep-sheet {
    width: 100%;
    background: color-mix(in srgb, var(--t-bg) 95%, white);
    border-top: 1px solid var(--t-border);
    border-radius: 20px 20px 0 0;
    overflow: hidden;
  }

  .m-sleep-active {
    text-align: center;
    padding: 16px 20px 8px;
  }

  .m-sleep-active .sleep-countdown {
    font-family: 'Orbitron', monospace;
    font-size: 2.2rem;
    font-weight: 700;
    color: var(--t-accent3);
    letter-spacing: 3px;
  }

  .m-sleep-active .sleep-hint {
    font-size: 0.75rem;
    color: var(--t-text3);
    margin-top: 4px;
  }

  .sleep-cancel-btn {
    margin-top: 12px;
    padding: 8px 28px;
    border-radius: 20px;
    border: 1px solid #ff5555;
    background: rgba(255, 85, 85, 0.08);
    color: #ff5555;
    font-family: inherit;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .sleep-cancel-btn:hover {
    background: rgba(255, 85, 85, 0.18);
  }

  .m-sleep-options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 12px 16px 24px;
  }

  .m-sleep-options .sleep-opt {
    padding: 10px 4px;
    border-radius: 10px;
    border: 1px solid var(--t-border);
    background: var(--t-overlay);
    color: var(--t-text2);
    font-family: inherit;
    font-size: 0.82rem;
    cursor: pointer;
    transition: all 0.18s;
    text-align: center;
  }

  .m-sleep-options .sleep-opt:hover, .m-sleep-options .sleep-opt.active {
    border-color: var(--t-accent3);
    color: var(--t-accent3);
    background: color-mix(in srgb, var(--t-accent3) 10%, transparent);
  }

  .m-sleep-options .sleep-opt.active {
    font-weight: 600;
  }

  .m-sleep-options .sleep-opt-end {
    grid-column: 1 / -1;
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