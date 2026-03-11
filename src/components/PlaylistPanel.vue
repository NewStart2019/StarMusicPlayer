<script setup>
/**
 * PlaylistPanel — 通用播放列表组件
 *
 * Props:
 *   show         Boolean  是否显示
 *   playlist     Array    歌曲列表
 *   currentIndex Number   当前播放索引
 *   mode         String   'side'  = PC右侧固定侧栏（absolute/fixed）
 *                         'sheet' = 手机底部弹出（Teleport to body）
 *   offsetBottom String   side 模式 fixed 时距底部高度，默认 '0px'
 *   useFixed     Boolean  side 模式下使用 position:fixed（MiniBar场景）
 *
 * Emits:
 *   close
 *   load-index(i)
 *   remove-from-playlist(i)
 */
const props = defineProps({
  show: {type: Boolean, required: true},
  playlist: {type: Array, required: true},
  currentIndex: {type: Number, required: true},
  mode: {type: String, default: 'side'},   // 'side' | 'sheet'
  offsetBottom: {type: String, default: '0px'},
  useFixed: {type: Boolean, default: false},
})
const emit = defineEmits(['close', 'load-index', 'remove-from-playlist'])
</script>

<template>
  <!-- ══ SHEET 模式：手机底部弹出 ══ -->
  <Teleport to="body" v-if="mode === 'sheet'">
    <Transition name="sheet-up">
      <div v-if="show" class="pl-sheet-overlay" @click.self="emit('close')">
        <div class="pl-sheet-panel">
          <div class="pl-sheet-handle"></div>
          <div class="pl-panel-header">
            <span class="pl-panel-title">播放列表</span>
            <span class="pl-panel-count">{{ playlist.length }} 首</span>
            <button class="pl-panel-close" @click="emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="pl-panel-scroll">
            <div v-if="playlist.length === 0" class="pl-panel-empty">播放列表为空</div>
            <div v-for="(song, i) in playlist" :key="song.name + i"
                 class="pl-panel-item" :class="{ 'pl-panel-cur': i === currentIndex }"
                 @click="emit('load-index', i); emit('close')">
              <span class="pl-panel-num">{{ i + 1 }}</span>
              <span class="pl-panel-name">{{ song.name.replace(/\.[^.]+$/, '') }}</span>
              <button class="pl-panel-del" @click.stop="emit('remove-from-playlist', i)">
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
  </Teleport>

  <!-- ══ SIDE 模式：PC右侧滑入 ══ -->
  <Teleport to="body" v-else>
    <Transition name="pl-panel-slide">
      <div v-if="show"
           class="pl-side-panel"
           :style="useFixed ? { position:'fixed', top:0, right:0, bottom: offsetBottom } : {}"
           :class="{ 'pl-side-absolute': !useFixed, 'pl-side-fixed': useFixed }">
        <div class="pl-panel-header">
          <span class="pl-panel-title">播放列表</span>
          <span class="pl-panel-count">{{ playlist.length }} 首</span>
          <button class="pl-panel-close" @click="emit('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="pl-panel-scroll">
          <div v-if="playlist.length === 0" class="pl-panel-empty">播放列表为空</div>
          <div v-for="(song, i) in playlist" :key="song.name + i"
               class="pl-panel-item" :class="{ 'pl-panel-cur': i === currentIndex }"
               @click="emit('load-index', i); emit('close')">
            <span class="pl-panel-num">{{ i + 1 }}</span>
            <span class="pl-panel-name">{{ song.name.replace(/\.[^.]+$/, '') }}</span>
            <button class="pl-panel-del" @click.stop="emit('remove-from-playlist', i)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── 共用列表样式 ───────────────────────────── */
.pl-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--t-border);
  flex-shrink: 0;
}

.pl-panel-title {
  font-family: 'Orbitron', monospace;
  font-size: 0.72rem;
  letter-spacing: 3px;
  color: var(--t-label-color);
  flex: 1;
}

.pl-panel-count {
  font-size: 0.75rem;
  color: var(--t-text3);
}

.pl-panel-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--t-text3);
  padding: 4px;
  border-radius: 6px;
  display: flex;
  transition: color 0.2s, background 0.2s;
}

.pl-panel-close svg {
  width: 16px;
  height: 16px;
}

.pl-panel-close:hover {
  color: var(--t-text);
  background: rgba(255, 255, 255, 0.08);
}

.pl-panel-scroll {
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
}

.pl-panel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 18px;
  cursor: pointer;
  transition: background 0.18s;
}

.pl-panel-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.pl-panel-cur {
  background: color-mix(in srgb, var(--t-accent1) 10%, transparent) !important;
}

.pl-panel-num {
  font-size: 0.7rem;
  color: var(--t-text3);
  font-family: 'Orbitron', monospace;
  min-width: 22px;
  flex-shrink: 0;
}

.pl-panel-cur .pl-panel-num {
  color: var(--t-accent1);
}

.pl-panel-name {
  flex: 1;
  font-size: 0.85rem;
  color: var(--t-text2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.pl-panel-cur .pl-panel-name {
  color: var(--t-accent1);
  font-weight: 600;
}

.pl-panel-del {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--t-text3);
  padding: 4px;
  border-radius: 4px;
  opacity: 0;
  display: flex;
  flex-shrink: 0;
  transition: all 0.15s;
}

.pl-panel-del svg {
  width: 13px;
  height: 13px;
}

.pl-panel-item:hover .pl-panel-del {
  opacity: 1;
}

.pl-panel-del:hover {
  color: #ff5555;
  background: rgba(255, 85, 85, 0.12);
  opacity: 1;
}

.pl-panel-empty {
  padding: 32px 20px;
  text-align: center;
  color: var(--t-text3);
  font-size: 0.85rem;
}

/* ── SHEET 模式（手机底部）───────────────────── */
.pl-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-end;
}

.pl-sheet-panel {
  width: 100%;
  max-height: 75vh;
  background: color-mix(in srgb, var(--t-bg) 96%, white);
  border-top: 1px solid var(--t-border);
  border-radius: 22px 22px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.pl-sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--t-border);
  margin: 10px auto 2px;
  flex-shrink: 0;
}

.sheet-up-enter-active {
  animation: sheetUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.sheet-up-leave-active {
  animation: sheetUp 0.22s ease reverse;
}

@keyframes sheetUp {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── SIDE 模式（PC右侧）────────────────────── */
.pl-side-panel {
  z-index: 200;
  background: color-mix(in srgb, var(--t-bg) 94%, white);
  border-left: 1px solid var(--t-border);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.4);
  width: min(340px, 100vw);
}

.pl-side-absolute {
  /* absolute 模式由 PlayerView 自身 position:relative 容器决定位置 */
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
}

.pl-side-fixed {
  position: fixed;
  top: 0;
  right: 0;
  /* bottom 由 inline style 控制 */
}

.pl-panel-slide-enter-active {
  animation: plSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.pl-panel-slide-leave-active {
  animation: plSlide 0.22s ease reverse;
}

@keyframes plSlide {
  from {
    opacity: 0;
    transform: translateX(40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>