<script setup>
import {computed} from 'vue'
import {useI18n} from '../utils/i18n.js'

const {t} = useI18n()

const props = defineProps({
  meta: {type: Object, default: null},
  filename: {type: String, default: ''},
  fileSize: {type: Number, default: 0},
  show: {type: Boolean, default: false},
  mode: {type: String, default: 'side'},
})
const emit = defineEmits(['close'])

const fmt = (v) => v ?? '—'

const fmtDuration = (sec) => {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`
}

const fmtSize = (bytes) => {
  if (!bytes) return '—'
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return bytes + ' B'
}

const fmtTrack = (num, total) => {
  if (!num) return '—'
  return total ? `${num} / ${total}` : num
}

const groups = computed(() => [
  {
    label: t('basic_info'),
    icon: '♩',
    rows: [
      {key: 'title', label: t('field_title')},
      {key: 'artist', label: t('field_artist')},
      {key: 'albumArtist', label: t('field_album_artist')},
      {key: 'album', label: t('field_album')},
      {key: 'year', label: t('field_year')},
      {key: 'genre', label: t('field_genre')},
      {key: 'composer', label: t('field_composer')},
      {key: 'comment', label: t('field_comment')},
    ],
  },
  {
    label: t('track_info'),
    icon: '⊞',
    rows: [
      {key: '_track', label: t('field_track')},
      {key: '_disc', label: t('field_disc')},
      {key: 'bpm', label: t('field_bpm')},
      {key: 'isrc', label: t('field_isrc')},
      {key: 'copyright', label: t('field_copyright')},
      {key: 'url', label: t('field_url')},
    ],
  },
  {
    label: t('technical'),
    icon: '⚙',
    rows: [
      {key: '_format', label: t('field_format')},
      {key: '_duration', label: t('field_duration')},
      {key: '_bitrate', label: t('field_bitrate')},
      {key: '_sample', label: t('field_sample')},
      {key: '_channels', label: t('field_channels')},
      {key: '_filesize', label: t('field_filesize')},
      {key: '_filename', label: t('field_filename')},
      {key: 'encoder', label: t('field_encoder')},
    ],
  },
])

const getCellValue = (key) => {
  const m = props.meta
  if (!m) return '—'
  switch (key) {
    case '_track':
      return fmtTrack(m.trackNumber, m.trackTotal)
    case '_disc':
      return fmtTrack(m.discNumber, m.discTotal)
    case '_format':
      return fmt(m.format)
    case '_duration':
      return fmtDuration(m.duration)
    case '_bitrate':
      return m.bitrate ? `${m.bitrate} kbps` : '—'
    case '_sample':
      return m.sampleRate ? `${m.sampleRate.toLocaleString()} Hz` : '—'
    case '_channels':
      return m.channels === 1 ? t('mono') : m.channels === 2 ? t('stereo') : fmt(m.channels)
    case '_filesize':
      return fmtSize(props.fileSize)
    case '_filename':
      return props.filename || '—'
    default:
      return fmt(m[key])
  }
}

const hasValue = (key) => getCellValue(key) !== '—'
const extraEntries = () => {
  if (!props.meta?.extra) return []
  return Object.entries(props.meta.extra).filter(([, v]) => v)
}
</script>

<template>
  <!-- ── Side panel (PC) ─────────────────────── -->
  <Transition name="meta-side" v-if="mode === 'side'">
    <div v-if="show" class="meta-side-panel">
      <div class="meta-header">
        <span class="meta-label">{{ t('tag_info') }}</span>
        <div class="meta-deco"></div>
        <button class="meta-close-btn" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="meta-scroll">
        <div v-if="meta?.cover" class="meta-cover-wrap">
          <img :src="meta.cover" class="meta-cover" alt="cover"/>
          <div class="meta-cover-mime">{{ meta.coverMime || 'image' }}</div>
        </div>
        <div v-else class="meta-cover-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="2"/>
          </svg>
          <span>{{ t('no_cover') }}</span>
        </div>
        <template v-for="grp in groups" :key="grp.label">
          <div class="meta-group-title">
            <span class="meta-grp-icon">{{ grp.icon }}</span>{{ grp.label }}
          </div>
          <div class="meta-table">
            <div v-for="row in grp.rows" :key="row.key"
                 class="meta-row" :class="{ dim: !hasValue(row.key) }">
              <span class="meta-row-key">{{ row.label }}</span>
              <span class="meta-row-val">{{ getCellValue(row.key) }}</span>
            </div>
          </div>
        </template>
        <template v-if="extraEntries().length > 0">
          <div class="meta-group-title"><span class="meta-grp-icon">＋</span>{{ t('custom_fields') }}</div>
          <div class="meta-table">
            <div v-for="[k,v] in extraEntries()" :key="k" class="meta-row">
              <span class="meta-row-key">{{ k }}</span>
              <span class="meta-row-val">{{ v }}</span>
            </div>
          </div>
        </template>
        <div v-if="!meta" class="meta-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4m0 4h.01"/>
          </svg>
          <p>{{ t('no_tag_info') }}</p>
          <span>{{ t('play_to_load') }}</span>
        </div>
      </div>
    </div>
  </Transition>

  <!-- ── Sheet (mobile) ─────────────────────── -->
  <Transition name="sheet-up" v-else>
    <div v-if="show" class="meta-sheet-overlay" @click.self="emit('close')">
      <div class="meta-sheet">
        <div class="meta-sheet-handle"></div>
        <div class="meta-header">
          <span class="meta-label">{{ t('tag_info') }}</span>
          <div class="meta-deco"></div>
          <button class="meta-close-btn" @click="emit('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="meta-scroll">
          <div class="meta-sheet-top">
            <div v-if="meta?.cover" class="meta-cover-wrap small">
              <img :src="meta.cover" class="meta-cover" alt="cover"/>
            </div>
            <div class="meta-sheet-basic" v-if="meta">
              <div class="msb-title">{{ meta.title || filename }}</div>
              <div class="msb-artist">{{ meta.artist || '—' }}</div>
              <div class="msb-album">{{ meta.album || '—' }}</div>
              <div class="msb-tags">
                <span v-if="meta.format" class="msb-tag">{{ meta.format }}</span>
                <span v-if="meta.year" class="msb-tag">{{ meta.year }}</span>
                <span v-if="meta.genre" class="msb-tag">{{ meta.genre }}</span>
                <span v-if="meta.sampleRate" class="msb-tag">{{ meta.sampleRate }}Hz</span>
              </div>
            </div>
          </div>
          <template v-for="grp in groups" :key="grp.label">
            <div class="meta-group-title">
              <span class="meta-grp-icon">{{ grp.icon }}</span>{{ grp.label }}
            </div>
            <div class="meta-table">
              <div v-for="row in grp.rows" :key="row.key"
                   class="meta-row" :class="{ dim: !hasValue(row.key) }">
                <span class="meta-row-key">{{ row.label }}</span>
                <span class="meta-row-val">{{ getCellValue(row.key) }}</span>
              </div>
            </div>
          </template>
          <template v-if="extraEntries().length > 0">
            <div class="meta-group-title"><span class="meta-grp-icon">＋</span>{{ t('custom_fields') }}</div>
            <div class="meta-table">
              <div v-for="[k,v] in extraEntries()" :key="k" class="meta-row">
                <span class="meta-row-key">{{ k }}</span>
                <span class="meta-row-val">{{ v }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
button {
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  font-family: inherit;
}

button:focus-visible {
  outline: 2px solid var(--t-accent1);
  outline-offset: 2px;
}

.meta-side-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(340px, 100vw);
  z-index: 110;
  background: color-mix(in srgb, var(--t-bg) 96%, white);
  border-left: 1px solid var(--t-border);
  display: flex;
  flex-direction: column;
  box-shadow: -16px 0 48px rgba(0, 0, 0, 0.35);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  overflow: hidden;
}

.meta-side-enter-active {
  animation: metaSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.meta-side-leave-active {
  animation: metaSlideIn 0.2s ease reverse;
}

@keyframes metaSlideIn {
  from {
    opacity: 0;
    transform: translateX(24px)
  }
  to {
    opacity: 1;
    transform: translateX(0)
  }
}

.meta-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.55);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-end;
}

.meta-sheet {
  width: 100%;
  max-height: 85vh;
  background: color-mix(in srgb, var(--t-bg) 96%, white);
  border-top: 1px solid var(--t-border);
  border-radius: 22px 22px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.meta-sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--t-text3);
  opacity: 0.4;
  margin: 10px auto 0;
  flex-shrink: 0;
}

.sheet-up-enter-active {
  animation: sheetUp .28s cubic-bezier(.16, 1, .3, 1);
}

.sheet-up-leave-active {
  animation: sheetUp .2s ease reverse;
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

.meta-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px 10px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--t-border);
}

.meta-label {
  font-family: 'Orbitron', monospace, sans-serif;
  font-size: 0.62rem;
  letter-spacing: 4px;
  color: var(--t-label-color);
  flex-shrink: 0;
}

.meta-deco {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--t-border), transparent);
}

.meta-close-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--t-text3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.meta-close-btn svg {
  width: 14px;
  height: 14px;
}

.meta-close-btn:hover {
  background: var(--t-overlay);
  color: var(--t-text);
}

.meta-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0 20px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--t-border) 60%, transparent) transparent;
}

.meta-scroll::-webkit-scrollbar {
  width: 4px;
}

.meta-scroll::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--t-border) 60%, transparent);
  border-radius: 2px;
}

.meta-cover-wrap {
  margin: 4px 16px 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  position: relative;
}

.meta-cover-wrap.small {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  margin: 0;
  border-radius: 10px;
}

.meta-cover {
  width: 100%;
  display: block;
}

.meta-cover-mime {
  position: absolute;
  bottom: 6px;
  right: 8px;
  font-size: 0.58rem;
  letter-spacing: 1px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Orbitron', monospace;
}

.meta-cover-empty {
  margin: 8px 16px 12px;
  height: 100px;
  border-radius: 12px;
  border: 1px dashed var(--t-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--t-text3);
}

.meta-cover-empty svg {
  width: 36px;
  height: 36px;
  opacity: 0.4;
}

.meta-cover-empty span {
  font-size: 0.75rem;
  opacity: 0.5;
}

.meta-sheet-top {
  display: flex;
  gap: 14px;
  padding: 12px 16px 4px;
  align-items: flex-start;
}

.meta-sheet-basic {
  flex: 1;
  min-width: 0;
}

.msb-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--t-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msb-artist {
  font-size: 0.82rem;
  color: var(--t-text2);
  margin-top: 3px;
}

.msb-album {
  font-size: 0.78rem;
  color: var(--t-text3);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msb-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.msb-tag {
  font-size: 0.6rem;
  padding: 2px 7px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--t-accent1) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--t-accent1) 25%, transparent);
  color: var(--t-accent1);
  font-family: 'Orbitron', monospace;
  letter-spacing: 0.5px;
}

.meta-group-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.62rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--t-label-color);
  padding: 12px 16px 5px;
  font-family: 'Orbitron', monospace, sans-serif;
}

.meta-grp-icon {
  font-size: 0.8rem;
  opacity: 0.7;
}

.meta-table {
  padding: 0 10px;
}

.meta-row {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background 0.15s;
  min-height: 32px;
  align-items: start;
}

.meta-row:hover {
  background: var(--t-overlay);
}

.meta-row.dim {
  opacity: 0.35;
}

.meta-row-key {
  font-size: 0.72rem;
  color: var(--t-text3);
  line-height: 1.4;
  padding-top: 1px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-row-val {
  font-size: 0.82rem;
  color: var(--t-text);
  line-height: 1.4;
  word-break: break-all;
  font-weight: 500;
}

.meta-row.dim .meta-row-val {
  color: var(--t-text3);
  font-weight: 400;
}

.meta-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
  color: var(--t-text3);
}

.meta-empty svg {
  width: 40px;
  height: 40px;
  opacity: 0.35;
}

.meta-empty p {
  font-size: 0.95rem;
}

.meta-empty span {
  font-size: 0.75rem;
  opacity: 0.6;
}
</style>