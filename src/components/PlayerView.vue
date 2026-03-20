<script setup>
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import SleepTimer from './SleepTimer.vue'
import PlaylistPanel from './PlaylistPanel.vue'
import MetadataPanel from './MetadataPanel.vue'
import {useI18n} from '../utils/i18n.js'

const {t} = useI18n()

const props = defineProps({
  displayTitle: {type: String, required: true},
  artistName: {type: String, required: true},
  isPlaying: {type: Boolean, required: true},
  albumRotation: {type: Number, required: true},
  currentTime: {type: Number, required: true},
  duration: {type: Number, required: true},
  progressPercent: {type: Number, required: true},
  bufferPercent: {type: Number, default: 0},
  volume: {type: Number, required: true},
  lyrics: {type: Array, required: true},
  currentLyricIndex: {type: Number, required: true},
  isFavorite: {type: Boolean, required: true},
  playlist: {type: Array, required: true},
  currentIndex: {type: Number, required: true},
  playMode: {type: String, default: 'order'},
  sleepMinutes: {type: Number, default: 0},
  sleepEndTime: {type: Number, default: 0},
  audioMeta: {type: Object, default: null},
  fileSize: {type: Number, default: 0},
  currentFilename: {type: String, default: ''},
})
const emit = defineEmits([
  'close', 'toggle-play', 'prev', 'next',
  'seek', 'drag-start', 'volume-change',
  'toggle-fav', 'load-index', 'lyric-seek',
  'remove-from-playlist', 'cycle-play-mode',
  'set-sleep-timer', 'cancel-sleep-timer',
  'seek-by',
])

const progressBarRef = ref(null)
const mobileProgressRef = ref(null)
const lyricsContainerRef = ref(null)
const mobileLyricsRef = ref(null)
defineExpose({progressBarRef, mobileProgressRef, lyricsContainerRef, mobileLyricsRef})

const showPlaylist = ref(false)
const showLyrics = ref(false)
const showMeta = ref(false)
const hasCover = computed(() => !!props.audioMeta?.cover)
const coverSrc = computed(() => props.audioMeta?.cover || '')
const coverFace = ref(hasCover.value)
const previewCover = ref(false)
const edgeSwipeEnabled = true
const modalRef = ref(null)
let longPressTimer = null
let edgeGesture = null
let downGesture = null
let lyricSheetGesture = null

watch(hasCover, (v) => {
  coverFace.value = v;
  previewCover.value = false
})
watch(() => props.currentFilename, () => {
  coverFace.value = hasCover.value;
  previewCover.value = false
})

const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 600
}
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  document.addEventListener('keydown', onKeyDown)
  if (edgeSwipeEnabled) {
    history.pushState(null, '', location.href)
    const lockBack = () => history.pushState(null, '', location.href)
    window.addEventListener('popstate', lockBack)
    modalRef.value && (modalRef.value.__edgeLock = lockBack)
    window.addEventListener('touchstart', onEdgeTouchStart, {passive: true, capture: true})
    window.addEventListener('touchmove', onEdgeTouchMove, {passive: false, capture: true})
    window.addEventListener('touchend', onEdgeTouchEnd, {passive: true, capture: true})
    window.addEventListener('touchcancel', onEdgeTouchEnd, {passive: true, capture: true})
  }
})
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('keydown', onKeyDown)
  if (edgeSwipeEnabled) {
    const lockBack = modalRef.value?.__edgeLock
    if (lockBack) window.removeEventListener('popstate', lockBack)
    window.removeEventListener('touchstart', onEdgeTouchStart, {capture: true})
    window.removeEventListener('touchmove', onEdgeTouchMove, {capture: true})
    window.removeEventListener('touchend', onEdgeTouchEnd, {capture: true})
    window.removeEventListener('touchcancel', onEdgeTouchEnd, {capture: true})
  }
})

const onKeyDown = (e) => {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      emit('seek-by', 3);
      break
    case 'ArrowLeft':
      e.preventDefault();
      emit('seek-by', -3);
      break
    case ' ':
      e.preventDefault();
      emit('toggle-play');
      break
  }
}

const openCoverPreview = () => {
  if (hasCover.value) previewCover.value = true
}
const closeCoverPreview = () => {
  previewCover.value = false
}
const handleCoverTouchStart = () => {
  if (!hasCover.value) return;
  longPressTimer = setTimeout(openCoverPreview, 520)
}
const handleCoverTouchEnd = () => {
  if (longPressTimer) clearTimeout(longPressTimer);
  longPressTimer = null
}
const handleCoverMouseDown = () => {
  if (!hasCover.value) return;
  longPressTimer = setTimeout(openCoverPreview, 520)
}
const handleCoverMouseUp = () => handleCoverTouchEnd()
const handleCoverMouseLeave = () => handleCoverTouchEnd()

const onEdgeTouchStart = (e) => {
  if (!edgeSwipeEnabled || e.touches.length !== 1) return
  const {clientX: x, clientY: y} = e.touches[0]
  const w = window.innerWidth || document.documentElement.clientWidth
  const edge = 24
  if (x > edge && x < w - edge) {
    edgeGesture = null
  } else edgeGesture = {x, y, time: performance.now(), lastX: x, lastY: y, active: false}
  if (isMobile.value && y < 140) downGesture = {x, y, time: performance.now(), lastX: x, lastY: y, active: false}
  else downGesture = null
}
const onEdgeTouchMove = (e) => {
  if (!edgeGesture && !downGesture) return
  const {clientX: x, clientY: y} = e.touches[0]
  if (edgeGesture) {
    const dx = x - edgeGesture.x, dy = y - edgeGesture.y
    edgeGesture.lastX = x;
    edgeGesture.lastY = y
    if (!edgeGesture.active && Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 30) edgeGesture.active = true
  }
  if (downGesture) {
    const dx = x - downGesture.x, dy = y - downGesture.y
    downGesture.lastX = x;
    downGesture.lastY = y
    if (!downGesture.active && dy > 30 && dy > Math.abs(dx) * 1.2) downGesture.active = true
  }
  if ((edgeGesture && edgeGesture.active) || (downGesture && downGesture.active)) e.preventDefault()
}
const onEdgeTouchEnd = () => {
  const now = performance.now()
  if (edgeGesture) {
    const dx = (edgeGesture.lastX ?? edgeGesture.x) - edgeGesture.x
    const dt = now - edgeGesture.time
    if (edgeGesture.active && Math.abs(dx) > 70 && dt < 800) emit('close')
  }
  if (downGesture) {
    const dy = (downGesture.lastY ?? downGesture.y) - downGesture.y
    const dt = now - downGesture.time
    if (downGesture.active && dy > 90 && dt < 900) emit('close')
  }
  edgeGesture = null;
  downGesture = null
}

const onLyricTouchStart = (e) => {
  if (!showLyrics.value || e.touches.length !== 1) return
  const {clientX: x, clientY: y} = e.touches[0]
  lyricSheetGesture = {x, y, time: performance.now(), lastY: y, active: false}
}
const onLyricTouchMove = (e) => {
  if (!lyricSheetGesture) return
  const {clientX: x, clientY: y} = e.touches[0]
  const dy = y - lyricSheetGesture.y, dx = x - lyricSheetGesture.x
  lyricSheetGesture.lastY = y
  if (!lyricSheetGesture.active && dy > 25 && dy > Math.abs(dx) * 1.2) lyricSheetGesture.active = true
  if (lyricSheetGesture.active) e.preventDefault()
}
const onLyricTouchEnd = () => {
  if (!lyricSheetGesture) return
  const dy = (lyricSheetGesture.lastY ?? lyricSheetGesture.y) - lyricSheetGesture.y
  const dt = performance.now() - lyricSheetGesture.time
  if (lyricSheetGesture.active && dy > 80 && dt < 900) showLyrics.value = false
  lyricSheetGesture = null
}

const toggleAlbumFace = () => {
  if (!hasCover.value) return;
  coverFace.value = !coverFace.value
}

const discStyle = computed(() => ({transform: `rotate(${props.albumRotation}deg) scale(${coverFace.value && hasCover.value ? 0.9 : 1})`}))
const coverStyle = computed(() => ({
  transform: `rotate(${props.albumRotation}deg) scale(${coverFace.value ? 1 : 0.9})`,
  backgroundImage: coverSrc.value ? `url(${coverSrc.value})` : 'none'
}))

const fmt = (s) => {
  if (isNaN(s) || s < 0) return '00:00'
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}
const dotStart = (i) => Math.max(0, props.currentIndex - 3) + i
const playModeLabel = computed(() =>
    ({order: t('play_order'), shuffle: t('play_shuffle'), repeat: t('play_repeat')})[props.playMode])

// ── Lyric fill animation (DOM-based) ──────────────────────────────────────
const LYRIC_BASE_STYLE = [
  ['backgroundImage', 'linear-gradient(to right, var(--t-lyric-active), var(--t-lyric-active))'],
  ['backgroundRepeat', 'no-repeat'],
  ['webkitBackgroundClip', 'text'],
  ['backgroundClip', 'text'],
  ['webkitTextFillColor', 'transparent'],
]
const lastLyricState = ref({idx: -1, progress: 0})

const lyricProgress = (idx) => {
  if (idx < 0 || idx >= props.lyrics.length) return 0
  const cur = props.lyrics[idx], nxt = props.lyrics[idx + 1]
  const dur = nxt ? Math.max(0.3, nxt.time - cur.time) : 5
  const elapsed = Math.max(0, (props.currentTime ?? 0) - cur.time)
  return dur > 0 ? Math.min(1, elapsed / dur) : 0
}

const applyLyricStyles = (newIdx) => {
  const containers = [lyricsContainerRef.value, mobileLyricsRef.value]
  containers.forEach(container => {
    if (!container) return
    const lines = container.querySelectorAll('.lyric-line')
    lines.forEach((el, i) => {
      el.style.transition = 'none'
      if (i < newIdx) {
        LYRIC_BASE_STYLE.forEach(([k, v]) => el.style[k] = v)
        el.style.backgroundSize = '100% 100%'
      } else if (i === newIdx) {
        const p = lyricProgress(i)
        LYRIC_BASE_STYLE.forEach(([k, v]) => el.style[k] = v)
        el.style.backgroundSize = `${p * 100}% 100%`
        const cur = props.lyrics[i], nxt = props.lyrics[i + 1]
        const dur = nxt ? Math.max(0.3, nxt.time - cur.time) : 5
        const remain = Math.max(0.1, dur * (1 - p))
        void el.offsetWidth
        el.style.transition = `background-size ${remain}s linear`
        el.style.backgroundSize = '100% 100%'
      } else {
        el.style.backgroundImage = '';
        el.style.backgroundRepeat = '';
        el.style.backgroundSize = ''
        el.style.backgroundClip = '';
        el.style.webkitBackgroundClip = '';
        el.style.webkitTextFillColor = ''
      }
    })
  })
}

watch(() => props.currentLyricIndex, async (newIdx) => {
  await nextTick()
  applyLyricStyles(newIdx ?? -1)
  lastLyricState.value = {idx: newIdx ?? -1, progress: lyricProgress(newIdx ?? -1)}
})

watch(() => props.currentTime, () => {
  const idx = props.currentLyricIndex
  if (idx < 0) return
  const p = lyricProgress(idx)
  const {idx: lastIdx, progress: lastP} = lastLyricState.value
  if (idx !== lastIdx || Math.abs(p - lastP) > 0.25) applyLyricStyles(idx)
  lastLyricState.value = {idx, progress: p}
})

watch(showLyrics, async (v) => {
  if (!v) return
  await nextTick()
  const scrollToActive = (container) => {
    if (!container) return
    const el = container.querySelector('.lyric-line.active')
    if (el) container.scrollTo({top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2, behavior: 'auto'})
  }
  scrollToActive(mobileLyricsRef.value)
})

watch(() => props.lyrics, async () => {
  await nextTick()
  const containers = [lyricsContainerRef.value, mobileLyricsRef.value]
  containers.forEach(container => {
    if (!container) return
    container.querySelectorAll('.lyric-line').forEach(el => {
      el.style.transition = '';
      el.style.backgroundImage = '';
      el.style.backgroundRepeat = ''
      el.style.backgroundSize = '';
      el.style.backgroundClip = ''
      el.style.webkitBackgroundClip = '';
      el.style.webkitTextFillColor = ''
    })
  })
})
</script>

<template>
  <div class="player-modal" ref="modalRef">
    <div class="player-inner">

      <Transition name="cover-preview">
        <div v-if="previewCover" class="cover-preview" @click="closeCoverPreview">
          <img :src="coverSrc" alt="Cover Preview"/>
        </div>
      </Transition>

      <button v-if="!edgeSwipeEnabled || !isMobile" class="btn-close" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <!-- ══ Desktop Left ══ -->
      <div class="player-left">
        <div class="song-info">
          <h1 class="song-title">{{ displayTitle }}</h1>
          <p class="song-artist">{{ artistName }}</p>
        </div>
        <div class="album-wrap" :class="{ 'has-cover': hasCover, 'face-cover': coverFace }"
             :title="hasCover ? '' : ''"
             @click="hasCover && toggleAlbumFace()"
             @touchstart="handleCoverTouchStart" @touchend="handleCoverTouchEnd" @touchcancel="handleCoverTouchEnd"
             @mousedown="handleCoverMouseDown" @mouseup="handleCoverMouseUp" @mouseleave="handleCoverMouseLeave">
          <div class="album-ring ring-outer"></div>
          <div class="album-ring ring-mid"></div>
          <div class="album-face album-disc" :class="{ active: !coverFace || !hasCover }" :style="discStyle">
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
          <div v-if="hasCover" class="album-face album-cover" :class="{ active: coverFace }" :style="coverStyle">
            <div class="cover-hole"></div>
          </div>
          <div class="album-glow" :class="{ active: isPlaying }"></div>
        </div>
        <div class="progress-section">
          <div class="time-display"><span>{{ fmt(currentTime) }}</span><span>{{ fmt(duration) }}</span></div>
          <div class="progress-bar" ref="progressBarRef"
               @click="emit('seek',$event)" @mousedown="emit('drag-start',$event)"
               @touchstart.prevent="emit('drag-start',$event)">
            <div class="progress-bg"></div>
            <div class="progress-buffer" :style="{ width:bufferPercent+'%' }"></div>
            <div class="progress-fill" :style="{ width:progressPercent+'%' }"></div>
            <div class="progress-thumb" :style="{ left:progressPercent+'%' }"></div>
          </div>
        </div>
        <div class="controls">
          <button class="ctrl-btn ctrl-fav" :class="{ active:isFavorite }" @click="emit('toggle-fav')">
            <svg viewBox="0 0 24 24" :fill="isFavorite?'currentColor':'none'" stroke="currentColor" stroke-width="2">
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
          <button class="ctrl-btn ctrl-list" :class="{ active:showPlaylist }" @click.stop="showPlaylist=!showPlaylist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
          </button>
          <button class="ctrl-btn ctrl-info" :class="{ active:showMeta }" @click.stop="showMeta=!showMeta"
                  :title="t('tag_info')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="8" stroke-width="2.5"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
            </svg>
          </button>
        </div>
        <div class="secondary-row">
          <div class="volume-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="vol-icon">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <input type="range" min="0" max="1" step="0.01" :value="volume" class="volume-slider"
                   @input="emit('volume-change',$event)"/>
          </div>
          <button class="ctrl-btn ctrl-mode" @click="emit('cycle-play-mode')" :title="playModeLabel">
            <svg v-if="playMode==='order'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <svg v-else-if="playMode==='shuffle'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
          <div class="sleep-wrap">
            <SleepTimer variant="player" :sleep-minutes="sleepMinutes" :sleep-end-time="sleepEndTime"
                        @set-sleep-timer="emit('set-sleep-timer',$event)"
                        @cancel-sleep-timer="emit('cancel-sleep-timer')"/>
          </div>
        </div>
        <div class="playlist-dots">
          <span v-for="(_,i) in playlist.slice(Math.max(0,currentIndex-3),Math.min(playlist.length,currentIndex+4))"
                :key="i" class="dot" :class="{ active:dotStart(i)===currentIndex }"
                @click="emit('load-index',dotStart(i))"></span>
        </div>
      </div>

      <!-- Desktop metadata panel -->
      <MetadataPanel
          v-if="!isMobile"
          :show="showMeta" :meta="audioMeta" :filename="currentFilename" :file-size="fileSize"
          mode="side" @close="showMeta=false"/>

      <!-- ══ Desktop Lyrics ══ -->
      <div class="player-right desktop-lyrics">
        <div class="lyrics-header">
          <span class="lyrics-label">{{ t('lyrics_label') }}</span>
          <div class="lyrics-deco"></div>
        </div>
        <div v-if="lyrics.length>0" class="lyrics-container" ref="lyricsContainerRef">
          <div class="lyrics-spacer"></div>
          <div v-for="(line,i) in lyrics" :key="i" class="lyric-line"
               :class="{ active:i===currentLyricIndex, prev:i<currentLyricIndex, next:i>currentLyricIndex }"
               @click="emit('lyric-seek',line.time)">{{ line.text || '♪' }}
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
          <p>{{ t('no_lyrics') }}</p>
          <span>{{ t('lyrics_hint') }}</span>
        </div>
      </div>

      <!-- ══ Mobile ══ -->
      <div class="mobile-player">

        <div class="m-cover-zone">
          <div class="album-wrap m-album" :class="{ 'has-cover':hasCover, 'face-cover':coverFace }"
               @click="hasCover && toggleAlbumFace()"
               @touchstart="handleCoverTouchStart" @touchend="handleCoverTouchEnd" @touchcancel="handleCoverTouchEnd"
               @mousedown="handleCoverMouseDown" @mouseup="handleCoverMouseUp" @mouseleave="handleCoverMouseLeave">
            <div class="album-ring ring-outer"></div>
            <div class="album-ring ring-mid"></div>
            <div class="album-face album-disc" :class="{ active:!coverFace||!hasCover }" :style="discStyle">
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
            <div v-if="hasCover" class="album-face album-cover" :class="{ active:coverFace }" :style="coverStyle">
              <div class="cover-hole"></div>
            </div>
            <div class="album-glow" :class="{ active:isPlaying }"></div>
          </div>
        </div>

        <div class="m-meta-row">
          <div class="m-meta-text">
            <h1 class="song-title m-title">{{ displayTitle }}</h1>
            <p class="song-artist m-artist">{{ artistName }}</p>
          </div>
          <div class="m-meta-actions">
            <button class="ctrl-btn ctrl-fav" :class="{ active:isFavorite }" @click="emit('toggle-fav')">
              <svg viewBox="0 0 24 24" :fill="isFavorite?'currentColor':'none'" stroke="currentColor" stroke-width="2">
                <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <button class="ctrl-btn ctrl-mode" @click="emit('cycle-play-mode')" :title="playModeLabel">
              <svg v-if="playMode==='order'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="17 1 21 5 17 9"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
              <svg v-else-if="playMode==='shuffle'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
          </div>
        </div>

        <div class="progress-section m-prog">
          <div class="time-display"><span>{{ fmt(currentTime) }}</span><span>{{ fmt(duration) }}</span></div>
          <div class="progress-bar" ref="mobileProgressRef"
               @click="emit('seek',$event)" @mousedown="emit('drag-start',$event)"
               @touchstart.prevent="emit('drag-start',$event)">
            <div class="progress-bg"></div>
            <div class="progress-buffer" :style="{ width:bufferPercent+'%' }"></div>
            <div class="progress-fill" :style="{ width:progressPercent+'%' }"></div>
            <div class="progress-thumb" :style="{ left:progressPercent+'%' }"></div>
          </div>
        </div>

        <div class="m-controls-row">
          <button class="ctrl-btn m-seek-btn" @click="emit('seek-by',-3)" :title="t('seek_back')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2.5 12a9.5 9.5 0 1 1 1.4 5"/>
              <path d="M2.5 17V12h5" fill="currentColor" stroke="none"/>
              <text x="8" y="14.5" font-size="5" fill="currentColor" stroke="none" font-weight="bold"
                    font-family="sans-serif" text-anchor="middle">3
              </text>
            </svg>
          </button>
          <button class="ctrl-btn m-prev" @click="emit('prev')">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="19,20 9,12 19,4"/>
              <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          <button class="ctrl-btn ctrl-play m-play-btn" @click="emit('toggle-play')">
            <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </button>
          <button class="ctrl-btn m-next" @click="emit('next')">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,4 15,12 5,20"/>
              <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          <button class="ctrl-btn m-seek-btn" @click="emit('seek-by',3)" :title="t('seek_fwd')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 12a9.5 9.5 0 1 0-1.4 5"/>
              <path d="M21.5 17V12h-5" fill="currentColor" stroke="none"/>
              <text x="16" y="14.5" font-size="5" fill="currentColor" stroke="none" font-weight="bold"
                    font-family="sans-serif" text-anchor="middle">3
              </text>
            </svg>
          </button>
        </div>

        <div class="m-toolbar">
          <button class="m-tool" :class="{ active:showLyrics }" @click.stop="showLyrics=!showLyrics">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="15" y2="12"/>
              <line x1="3" y1="18" x2="18" y2="18"/>
            </svg>
            <span>{{ t('lyrics_btn') }}</span>
          </button>
          <button class="m-tool" :class="{ active:showMeta }" @click.stop="showMeta=!showMeta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="8" stroke-width="2.5"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
            </svg>
            <span>{{ t('info_btn') }}</span>
          </button>
          <div class="m-vol-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="m-vol-ico">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path v-if="volume>0.5" d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path v-if="volume>0" d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <line v-if="volume===0" x1="23" y1="9" x2="17" y2="15"/>
              <line v-if="volume===0" x1="17" y1="9" x2="23" y2="15"/>
            </svg>
            <input type="range" min="0" max="1" step="0.01" :value="volume"
                   class="volume-slider m-vol-slider-inline" @input="emit('volume-change',$event)"/>
          </div>
          <SleepTimer variant="player" :sleep-minutes="sleepMinutes" :sleep-end-time="sleepEndTime"
                      @set-sleep-timer="emit('set-sleep-timer',$event)"
                      @cancel-sleep-timer="emit('cancel-sleep-timer')"/>
          <button class="m-tool" :class="{ active:showPlaylist }" @click.stop="showPlaylist=!showPlaylist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
            <span>{{ t('playlist') }}</span>
          </button>
        </div>

        <!-- Lyrics sheet -->
        <Transition name="sheet-up">
          <div v-if="showLyrics" class="m-sheet-overlay" @click.self="showLyrics=false">
            <div class="m-sheet"
                 @touchstart="onLyricTouchStart" @touchmove="onLyricTouchMove"
                 @touchend="onLyricTouchEnd" @touchcancel="onLyricTouchEnd">
              <div class="m-sheet-head">
                <span class="lyrics-label">{{ t('lyrics_label') }}</span>
                <div class="lyrics-deco"></div>
                <button class="m-sheet-x" @click="showLyrics=false">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div v-if="lyrics.length>0" class="lyrics-container m-lyr-scroll" ref="mobileLyricsRef">
                <div class="lyrics-spacer"></div>
                <div v-for="(line,i) in lyrics" :key="i" class="lyric-line"
                     :class="{ active:i===currentLyricIndex, prev:i<currentLyricIndex, next:i>currentLyricIndex }"
                     @click="emit('lyric-seek',line.time)">{{ line.text || '♪' }}
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
                <p>{{ t('no_lyrics') }}</p>
              </div>
              <button class="m-sheet-close" @click="showLyrics=false">{{ t('close_lyrics') }}</button>
            </div>
          </div>
        </Transition>

        <!-- Mobile metadata panel -->
        <MetadataPanel
            v-if="isMobile"
            :show="showMeta" :meta="audioMeta" :filename="currentFilename" :file-size="fileSize"
            mode="sheet" @close="showMeta=false"/>

      </div>

      <!-- Desktop playlist -->
      <PlaylistPanel
          v-if="!isMobile"
          :show="showPlaylist" :playlist="playlist" :current-index="currentIndex"
          mode="side" :use-fixed="false"
          @close="showPlaylist=false"
          @load-index="emit('load-index',$event)"
          @remove-from-playlist="emit('remove-from-playlist',$event)"/>
      <!-- Mobile playlist -->
      <PlaylistPanel
          v-if="isMobile"
          :show="showPlaylist" :playlist="playlist" :current-index="currentIndex"
          mode="sheet"
          @close="showPlaylist=false"
          @load-index="emit('load-index',$event)"
          @remove-from-playlist="emit('remove-from-playlist',$event)"/>

    </div>
  </div>
</template>

<style scoped>
button {
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  font-family: inherit
}

button:focus-visible {
  outline: 2px solid var(--t-accent1);
  outline-offset: 2px
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  outline: none
}

input[type="range"]::-moz-range-track {
  height: 3px;
  border-radius: 999px;
  background: var(--t-border);
  border: none
}

.player-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at 20% 20%, color-mix(in srgb, var(--t-accent2) 8%, transparent) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, color-mix(in srgb, var(--t-accent4) 8%, transparent) 0%, transparent 60%), var(--t-bg-glass);
  overflow: hidden
}

.cover-preview {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px)
}

.cover-preview img {
  max-width: min(80vw, 480px);
  max-height: min(80vh, 480px);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
  border: 1px solid var(--t-border)
}

.cover-preview-enter-active {
  animation: coverFade 0.22s ease-out
}

.cover-preview-leave-active {
  animation: coverFade 0.18s ease-in reverse
}

@keyframes coverFade {
  from {
    opacity: 0;
    transform: scale(0.96)
  }
  to {
    opacity: 1;
    transform: scale(1)
  }
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
  transition: all .25s
}

.btn-close svg {
  width: 18px;
  height: 18px
}

.btn-close:hover {
  background: var(--t-border);
  color: var(--t-text);
  transform: translateX(-50%) translateY(2px)
}

.player-inner {
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
  overflow: hidden
}

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
  scrollbar-width: none
}

.player-left::-webkit-scrollbar {
  display: none
}

.song-info {
  text-align: center;
  width: 100%
}

.song-title {
  font-family: 'Orbitron', monospace;
  font-size: clamp(.95rem, 2.2vw, 1.7rem);
  font-weight: 700;
  background: var(--t-title-grad);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  background-clip: text;
  margin-bottom: 6px;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap
}

.song-artist {
  color: var(--t-text2);
  font-size: .88rem;
  letter-spacing: 2px
}

.album-wrap {
  position: relative;
  width: min(200px, 22vw);
  height: min(200px, 22vw);
  flex-shrink: 0
}

.album-wrap.has-cover {
  cursor: pointer
}

.album-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--t-disc-border);
  animation: ringPulse 3s ease-in-out infinite
}

.ring-outer {
  inset: -16px
}

.ring-mid {
  inset: -5px;
  animation-delay: -1.5s
}

@keyframes ringPulse {
  0%, 100% {
    opacity: .3;
    transform: scale(1)
  }
  50% {
    opacity: .65;
    transform: scale(1.025)
  }
}

.album-face {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0;
  transition: opacity .3s ease, transform .35s ease;
  pointer-events: none
}

.album-face.active {
  opacity: 1;
  pointer-events: auto
}

.album-disc {
  background: var(--t-disc-bg);
  border: 2px solid var(--t-disc-border);
  overflow: hidden;
  box-shadow: 0 0 40px rgba(0, 0, 0, .5)
}

.album-cover {
  background-size: cover;
  background-position: center;
  border: 2px solid var(--t-disc-border);
  box-shadow: 0 0 40px rgba(0, 0, 0, .5);
  overflow: hidden
}

.cover-hole {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 18%;
  height: 18%;
  border-radius: 50%;
  background: color-mix(in srgb, var(--t-disc-center) 65%, rgba(0, 0, 0, 0.65));
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.4)
}

.disc-grooves {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center
}

.disc-groove {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--t-overlay)
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
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 28%;
  height: 28%;
  border-radius: 50%;
  background: var(--t-disc-center);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px var(--t-disc-glow)
}

.disc-center svg {
  width: 40%;
  height: 40%;
  color: rgba(0, 0, 0, .7)
}

.album-glow {
  position: absolute;
  inset: -28px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--t-disc-glow), transparent 70%);
  opacity: 0;
  transition: opacity 1s;
  pointer-events: none;
  animation: glowPulse 2.5s ease-in-out infinite
}

.album-glow.active {
  opacity: 1
}

@keyframes glowPulse {
  0%, 100% {
    transform: scale(1)
  }
  50% {
    transform: scale(1.06)
  }
}

.progress-section {
  width: 100%
}

.time-display {
  display: flex;
  justify-content: space-between;
  color: var(--t-text3);
  font-size: .78rem;
  font-family: 'Orbitron', monospace;
  margin-bottom: 6px
}

.progress-bar {
  position: relative;
  height: 36px;
  display: flex;
  align-items: center;
  cursor: pointer
}

.progress-bg {
  position: absolute;
  inset: 0;
  margin: auto;
  height: 4px;
  border-radius: 999px;
  background: var(--t-overlay)
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 4px;
  border-radius: 999px;
  background: var(--t-progress);
  pointer-events: none
}

.progress-buffer {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 4px;
  border-radius: 999px;
  background: var(--t-progress);
  opacity: .35;
  pointer-events: none;
  transition: width .2s ease
}

.progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--t-accent1);
  box-shadow: 0 0 8px var(--t-accent1);
  pointer-events: none;
  transition: transform .1s
}

.progress-bar:hover .progress-thumb {
  transform: translate(-50%, -50%) scale(1.3)
}

.controls {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center
}

.ctrl-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--t-text2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .2s
}

.ctrl-btn:hover {
  color: var(--t-text);
  background: var(--t-overlay);
  transform: scale(1.1)
}

.ctrl-btn.active {
  color: var(--t-accent1)
}

.ctrl-fav {
  width: 34px;
  height: 34px
}

.ctrl-fav svg {
  width: 18px;
  height: 18px
}

.ctrl-fav.active {
  color: var(--t-accent3)
}

.ctrl-prev, .ctrl-next {
  width: 40px;
  height: 40px
}

.ctrl-prev svg, .ctrl-next svg {
  width: 20px;
  height: 20px
}

.ctrl-play {
  width: 56px;
  height: 56px;
  background: var(--t-play-bg) !important;
  color: #fff !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, .3)
}

.ctrl-play svg {
  width: 22px;
  height: 22px
}

.ctrl-play:hover {
  transform: scale(1.08) !important
}

.ctrl-list {
  width: 34px;
  height: 34px
}

.ctrl-list svg {
  width: 18px;
  height: 18px
}

.ctrl-mode {
  width: 34px;
  height: 34px
}

.ctrl-mode svg {
  width: 17px;
  height: 17px
}

.ctrl-mode:hover, .ctrl-mode.active {
  color: var(--t-accent2)
}

.ctrl-info {
  width: 34px;
  height: 34px
}

.ctrl-info svg {
  width: 18px;
  height: 18px
}

.ctrl-info:hover, .ctrl-info.active {
  color: var(--t-accent3)
}

.secondary-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%
}

.volume-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1
}

.vol-icon {
  width: 16px;
  height: 16px;
  color: var(--t-text3);
  flex-shrink: 0
}

.volume-slider {
  flex: 1;
  -webkit-appearance: none;
  height: 3px;
  border-radius: 999px;
  background: var(--t-border);
  outline: none;
  cursor: pointer
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--t-accent1);
  cursor: pointer;
  box-shadow: 0 0 6px var(--t-disc-glow)
}

.volume-slider::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--t-accent1);
  cursor: pointer;
  box-shadow: 0 0 6px var(--t-disc-glow)
}

.sleep-wrap {
  flex-shrink: 0
}

.playlist-dots {
  display: flex;
  gap: 5px;
  align-items: center;
  justify-content: center
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--t-text3);
  cursor: pointer;
  transition: all .2s
}

.dot.active {
  background: var(--t-accent1);
  transform: scale(1.5)
}

.dot:hover {
  background: var(--t-text2)
}

.player-right {
  width: 50%;
  display: flex;
  flex-direction: column;
  padding: 34px 30px 34px 42px;
  overflow: hidden
}

.lyrics-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  flex-shrink: 0
}

.lyrics-label {
  font-family: 'Orbitron', monospace;
  font-size: .66rem;
  letter-spacing: 4px;
  color: var(--t-label-color);
  flex-shrink: 0
}

.lyrics-deco {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--t-border), transparent)
}

.lyrics-container {
  flex: 1;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  scrollbar-width: none
}

.lyrics-container::-webkit-scrollbar {
  display: none
}

.lyrics-spacer {
  height: 38vh;
  flex-shrink: 0
}

.lyric-line {
  width: 100%;
  text-align: center;
  padding: 9px 12px;
  font-size: 1rem;
  color: var(--t-text3);
  border-radius: 8px;
  cursor: pointer;
  transition: color .36s, font-size .36s, transform .36s, filter .36s, opacity .36s, background-color .36s;
  line-height: 1.55
}

.lyric-line:hover {
  color: var(--t-text2);
  background: var(--t-overlay)
}

.lyric-line.active {
  color: var(--t-lyric-active);
  font-size: 1.15rem;
  font-weight: 700;
  filter: drop-shadow(0 0 8px var(--t-lyric-glow));
  transform: scale(1.04);
  background: color-mix(in srgb, var(--t-lyric-active) 5%, transparent)
}

.lyric-line.prev {
  color: var(--t-text3);
  opacity: .65
}

.lyric-line.next {
  color: color-mix(in srgb, var(--t-text2) 55%, transparent)
}

.no-lyrics {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--t-text3)
}

.no-lyrics-icon {
  width: 68px;
  height: 68px;
  opacity: .25
}

.no-lyrics-icon svg {
  width: 100%;
  height: 100%
}

.no-lyrics p {
  font-size: 1.1rem
}

.no-lyrics span {
  font-size: .78rem;
  opacity: .6
}

@media (max-width: 880px) {
  .player-left {
    width: 56%;
    padding: 52px 22px 26px;
    gap: 12px
  }

  .player-right {
    width: 44%;
    padding: 26px 18px
  }

  .album-wrap {
    width: min(165px, 26vw);
    height: min(165px, 26vw)
  }
}

.mobile-player {
  display: none
}

@media (max-width: 600px) {
  .player-left {
    display: none
  }

  .desktop-lyrics {
    display: none
  }

  .mobile-player {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 0 22px calc(20px + env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
    overflow: hidden
  }

  .btn-close {
    top: max(14px, env(safe-area-inset-top, 14px))
  }

  .m-cover-zone {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 60px
  }

  .m-album {
    width: min(210px, 54vw) !important;
    height: min(210px, 54vw) !important
  }

  .m-album .ring-outer {
    inset: -12px
  }

  .m-album .ring-mid {
    inset: -4px
  }

  .m-meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    padding: 14px 0 2px;
    gap: 10px
  }

  .m-meta-text {
    flex: 1;
    min-width: 0
  }

  .m-title {
    font-size: clamp(.95rem, 4.8vw, 1.3rem) !important;
    white-space: nowrap !important;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-text-fill-color: transparent;
    color: transparent
  }

  .m-artist {
    font-size: .78rem;
    letter-spacing: 1.5px;
    margin-top: 3px
  }

  .m-meta-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0
  }

  .m-meta-actions .ctrl-fav {
    width: 34px;
    height: 34px
  }

  .m-meta-actions .ctrl-fav svg {
    width: 17px;
    height: 17px
  }

  .m-meta-actions .ctrl-mode {
    width: 34px;
    height: 34px
  }

  .m-meta-actions .ctrl-mode svg {
    width: 16px;
    height: 16px
  }

  .m-prog {
    flex-shrink: 0;
    width: 100%;
    padding: 6px 0
  }

  .m-prog .time-display {
    font-size: .7rem
  }

  .m-controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    padding: 8px 4px 4px
  }

  .m-prev, .m-next {
    width: 46px;
    height: 46px
  }

  .m-prev svg, .m-next svg {
    width: 22px;
    height: 22px
  }

  .m-play-btn {
    width: 68px !important;
    height: 68px !important
  }

  .m-play-btn svg {
    width: 28px !important;
    height: 28px !important
  }

  .m-seek-btn {
    width: 40px;
    height: 40px;
    color: var(--t-text3)
  }

  .m-seek-btn svg {
    width: 22px;
    height: 22px
  }

  .m-seek-btn:hover {
    color: var(--t-accent1)
  }

  .m-toolbar {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: 8px 0 6px;
    border-top: 1px solid var(--t-border);
    gap: 0
  }

  .m-tool {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--t-text3);
    font-size: .58rem;
    font-family: inherit;
    letter-spacing: 1px;
    padding: 6px 10px;
    border-radius: 8px;
    transition: all .2s;
    flex-shrink: 0
  }

  .m-tool svg {
    width: 18px;
    height: 18px
  }

  .m-tool:hover, .m-tool.active {
    color: var(--t-accent1)
  }

  .m-vol-bar {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 6px
  }

  .m-vol-ico {
    width: 15px;
    height: 15px;
    color: var(--t-text3);
    flex-shrink: 0
  }

  .m-vol-slider-inline {
    flex: 1;
    min-width: 0;
    -webkit-appearance: none;
    height: 3px;
    border-radius: 999px;
    background: var(--t-border);
    outline: none;
    cursor: pointer
  }

  .m-vol-slider-inline::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--t-accent1);
    cursor: pointer;
    box-shadow: 0 0 6px var(--t-disc-glow)
  }

  .m-vol-slider-inline::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--t-accent1);
    cursor: pointer;
    box-shadow: 0 0 6px var(--t-disc-glow)
  }

  .m-sheet-overlay {
    position: fixed;
    inset: 0;
    z-index: 180;
    background: rgba(0, 0, 0, .55);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-end
  }

  .m-sheet {
    width: 100%;
    height: 100vh;
    background: color-mix(in srgb, var(--t-bg) 96%, white);
    border-top: 1px solid var(--t-border);
    border-radius: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden
  }

  .m-sheet-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--t-border);
    flex-shrink: 0
  }

  .m-sheet-x {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--t-text3);
    padding: 3px;
    border-radius: 5px;
    display: flex;
    margin-left: auto
  }

  .m-sheet-x svg {
    width: 16px;
    height: 16px
  }

  .m-sheet-close {
    width: 100%;
    padding: 14px 0;
    background: color-mix(in srgb, var(--t-bg-glass) 85%, var(--t-bg));
    color: var(--t-text);
    border: none;
    border-top: 1px solid var(--t-border);
    font-size: .95rem;
    letter-spacing: 1px;
    cursor: pointer
  }

  .m-lyr-scroll {
    flex: 1;
    overflow-y: scroll;
    display: flex;
    flex-direction: column;
    align-items: center;
    scrollbar-width: none
  }

  .m-lyr-scroll::-webkit-scrollbar {
    display: none
  }

  .sheet-up-enter-active {
    animation: sheetUp .28s cubic-bezier(.16, 1, .3, 1)
  }

  .sheet-up-leave-active {
    animation: sheetUp .2s ease reverse
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