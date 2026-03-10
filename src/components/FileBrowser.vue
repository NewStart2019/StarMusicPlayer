<script setup>
import {computed, ref, watch} from 'vue'

const props = defineProps({
  hasFolder: {type: Boolean, required: true},
  sourceMode: {type: String, required: true},
  pathStack: {type: Array, required: true},
  currentEntries: {type: Array, required: true},
  currentSong: {type: Object, default: null},
  isPlaying: {type: Boolean, required: true},
  errorMsg: {type: String, default: ''},
  themes: {type: Array, required: true},
  currentThemeId: {type: String, required: true},
  serverMode: {type: Boolean, default: false},
  searchResults: {type: Array, default: null},
  isSearchMode: {type: Boolean, default: false},
})

const emit = defineEmits([
  'play-audio', 'enter-folder', 'go-back', 'go-root', 'breadcrumb-nav',
  'folder-select', 'connect-server', 'disconnect', 'refresh-server', 'apply-theme',
  'show-favorites', 'search-all', 'clear-search',
])

/* ── 本地 UI 状态 ─────────────────────────── */
const searchQuery = ref('')
const showThemePicker = ref(false)
const showServerPanel = ref(false)
const serverUrl = ref('http://192.168.31.235:8080/')
const serverLoading = ref(false)
const serverError = ref('')
const fileInputRef = ref(null)
const themeWrapRef = ref(null)

/* 供父组件写入加载 / 错误状态 */
const setServerLoading = (v) => {
  serverLoading.value = v
}
const setServerError = (v) => {
  serverError.value = v
}
const clearSearch = () => {
  searchQuery.value = '';
  emit('clear-search')
}
defineExpose({setServerLoading, setServerError, clearSearch})

/* ── Enter 触发全局搜索 ────────────────────── */
const handleSearchEnter = () => {
  const q = searchQuery.value.trim()
  if (!q) {
    emit('clear-search');
    return
  }
  emit('search-all', q)
}

/* ── 当前展示列表 ──────────────────────────── */
const filteredEntries = computed(() => {
  if (props.isSearchMode && props.searchResults) return props.searchResults
  return props.currentEntries
})


/* ── 主题选择器点外部关闭 ─────────────────── */
const onDocClick = (e) => {
  if (themeWrapRef.value && !themeWrapRef.value.contains(e.target))
    showThemePicker.value = false
}
watch(showThemePicker, (v) => {
  v ? document.addEventListener('click', onDocClick, true)
      : document.removeEventListener('click', onDocClick, true)
})

/* ── 动作 ─────────────────────────────────── */
const handleConnect = () => {
  serverError.value = ''
  emit('connect-server', {url: serverUrl.value})
}
const handleFolderSelect = (e) => {
  showServerPanel.value = false
  emit('folder-select', e)
}
const applyTheme = (id) => {
  showThemePicker.value = false
  emit('apply-theme', id)
}
const handleDisconnect = () => {
  showServerPanel.value = false
  emit('disconnect')
}
</script>

<template>
  <div class="browser-container">

    <!-- ===== Header ===== -->
    <header class="header">
      <div class="logo-area">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 19V6l12-3v13"/>
            <circle cx="6" cy="19" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
        <span class="logo-text">STAR<span class="logo-accent">MUSIC</span></span>
      </div>

      <div class="header-right">
        <div class="search-wrap" v-if="hasFolder">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input v-model="searchQuery" class="search-input" type="text" placeholder="搜索歌曲，按 Enter"
                 @keydown.enter="handleSearchEnter"/>
        </div>

        <div v-if="hasFolder" class="source-badge" :class="sourceMode">
          <svg v-if="sourceMode === 'server'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="8" rx="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/>
            <line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span>{{ sourceMode === 'server' ? '服务器' : '本地' }}</span>
          <button class="badge-close" @click="handleDisconnect" title="断开">✕</button>
        </div>

        <div class="theme-wrap" ref="themeWrapRef">
          <button class="btn-theme" @click="showThemePicker = !showThemePicker">
            <span class="theme-icon">{{ themes.find(t => t.id === currentThemeId)?.icon }}</span>
            <span class="theme-label">主题</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 class="theme-chevron" :class="{ open: showThemePicker }">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          <Transition name="dropdown">
            <div v-if="showThemePicker" class="theme-dropdown">
              <div class="dropdown-title">选择主题</div>
              <div v-for="t in themes" :key="t.id"
                   class="theme-opt" :class="{ active: t.id === currentThemeId }"
                   @click="applyTheme(t.id)">
                <span>{{ t.icon }}</span>
                <span class="opt-name">{{ t.name }}</span>
                <svg v-if="t.id === currentThemeId" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.5" class="opt-check">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <!-- ===== 欢迎页 ===== -->
    <div v-if="!hasFolder" class="welcome-screen">
      <div class="welcome-inner">
        <div class="vinyl-disc">
          <div class="vinyl-groove" v-for="i in 5" :key="i"></div>
          <div class="vinyl-center"></div>
        </div>
        <h1 class="welcome-title">开始你的音乐之旅</h1>
        <p class="welcome-sub">选择本地文件夹，或连接音乐服务器</p>

        <div class="welcome-btns">
          <button class="btn-select" @click="fileInputRef.click()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            本地文件夹
          </button>
          <button class="btn-server" @click="showServerPanel = !showServerPanel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2"/>
              <rect x="2" y="14" width="20" height="8" rx="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/>
              <line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>
            连接服务器
          </button>
        </div>

        <div v-if="showServerPanel" class="server-panel">
          <div class="sp-title">服务器地址</div>
          <div class="sp-row">
            <input v-model="serverUrl" class="sp-input" placeholder="http://localhost:3000"
                   @keydown.enter="handleConnect"/>
            <button class="sp-btn" :disabled="serverLoading" @click="handleConnect">
              <span v-if="serverLoading" class="sp-loading"></span>
              <span v-else>连接</span>
            </button>
          </div>
          <p v-if="serverError" class="sp-error">{{ serverError }}</p>
          <p class="sp-hint">启动服务器：<code>node server.js --root /your/music</code></p>
        </div>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </div>
    </div>

    <!-- ===== 文件浏览器 ===== -->
    <div v-else class="file-browser">
      <nav class="breadcrumb">
        <span class="crumb crumb-root" @click="emit('go-root')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          根目录
        </span>
        <!-- 普通目录导航 -->
        <template v-if="!isSearchMode">
          <template v-for="(item, i) in pathStack" :key="i">
            <span class="crumb-sep">›</span>
            <span class="crumb" :class="{ 'crumb-active': i === pathStack.length - 1 }"
                  @click="emit('breadcrumb-nav', item)">{{ item.name }}</span>
          </template>
        </template>
        <!-- 搜索模式面包屑 -->
        <template v-else>
          <span class="crumb-sep">›</span>
          <span class="crumb crumb-search crumb-active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            搜索结果（{{ filteredEntries.length }} 首）
          </span>
          <button class="crumb-clear-btn" @click="emit('clear-search')" title="退出搜索">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            退出搜索
          </button>
        </template>
      </nav>

      <div class="toolbar">
        <button v-if="pathStack.length > 0 && !isSearchMode" class="btn-toolbar" @click="emit('go-back')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          返回
        </button>
        <button v-if="sourceMode === 'local'" class="btn-toolbar" @click="fileInputRef.click()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="btn-text">更换文件夹</span>
        </button>
        <button v-else class="btn-toolbar" @click="emit('refresh-server')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-.18-5.3"/>
          </svg>
          <span class="btn-text">刷新</span>
        </button>
        <span class="item-count">{{ filteredEntries.length }} 个项目</span>
        <!-- 我的收藏按钮（仅服务器模式显示） -->
        <button v-if="serverMode" class="btn-toolbar btn-fav-entry" @click="emit('show-favorites')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span class="btn-text">我的收藏</span>
        </button>
      </div>

      <div class="file-grid" v-if="filteredEntries.length > 0">
        <div v-for="entry in filteredEntries" :key="entry.name"
             class="file-card" :class="entry.type === 'folder' ? 'folder-card' : 'audio-card'"
             @click="entry.type === 'folder' ? emit('enter-folder', entry) : emit('play-audio', { entry, visibleList: filteredEntries })">
          <div v-if="entry.type === 'folder'" class="card-icon folder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div v-else class="card-icon audio-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <div v-if="currentSong && currentSong.name === entry.name && isPlaying" class="playing-waves">
              <span></span><span></span><span></span>
            </div>
          </div>
          <div class="card-name">{{ entry.name }}</div>
          <div v-if="entry.type !== 'folder'" class="card-ext">{{ entry.name.split('.').pop().toUpperCase() }}</div>
        </div>
      </div>
      <div v-else class="empty-hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 15s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
        <p>{{ isSearchMode ? '没有找到匹配的歌曲' : '此目录没有音频文件' }}</p>
      </div>
    </div>

    <input ref="fileInputRef" type="file" webkitdirectory multiple style="display:none"
           @change="handleFolderSelect"/>
  </div>
</template>

<style scoped>
.browser-container {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  height: 62px;
  min-height: 62px;
  border-bottom: 1px solid var(--t-border);
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  flex-shrink: 0;
  gap: 16px;
  transition: border-color 0.4s;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.logo-icon {
  width: 28px;
  height: 28px;
  color: var(--t-accent1);
  filter: drop-shadow(0 0 6px var(--t-accent1));
  transition: color 0.4s, filter 0.4s;
}

.logo-text {
  font-family: 'Orbitron', monospace, sans-serif;
  font-size: 1.12rem;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--t-text);
}

.logo-accent {
  color: var(--t-accent1);
  transition: color 0.4s;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

/* 搜索框 */
.search-wrap {
  position: relative;
  width: min(260px, 32vw);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: var(--t-text3);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 14px 8px 36px;
  background: var(--t-overlay);
  border: 1px solid var(--t-border);
  border-radius: 999px;
  color: var(--t-text);
  font-family: inherit;
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.search-input::placeholder {
  color: var(--t-text3);
}

.search-input:focus {
  border-color: var(--t-accent1);
  box-shadow: 0 0 16px color-mix(in srgb, var(--t-accent1) 20%, transparent);
}

/* 数据源徽标 */
.source-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 1px;
  border: 1px solid var(--t-border);
  background: var(--t-bg-card);
  color: var(--t-text2);
}

.source-badge svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.source-badge.server {
  border-color: var(--t-accent2);
  color: var(--t-accent2);
}

.source-badge.local {
  border-color: var(--t-accent1);
  color: var(--t-accent1);
}

.badge-close {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  padding: 0 0 0 4px;
  font-size: 0.75rem;
  line-height: 1;
  transition: opacity 0.2s;
}

.badge-close:hover {
  opacity: 1;
}

/* 主题切换 */
.theme-wrap {
  position: relative;
}

.btn-theme {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 20px;
  background: var(--t-overlay);
  border: 1px solid var(--t-border);
  color: var(--t-text2);
  font-family: inherit;
  font-size: 0.87rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.25s;
}

.btn-theme:hover {
  border-color: var(--t-accent1);
  color: var(--t-text);
}

.theme-icon {
  font-size: 1rem;
}

.theme-label {
  font-weight: 500;
}

.theme-chevron {
  width: 14px;
  height: 14px;
  transition: transform 0.25s;
}

.theme-chevron.open {
  transform: rotate(180deg);
}

.theme-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 175px;
  z-index: 300;
  background: color-mix(in srgb, var(--t-bg) 92%, white);
  border: 1px solid var(--t-border);
  border-radius: 14px;
  padding: 8px;
  box-shadow: 0 20px 60px var(--t-shadow, rgba(0, 0, 0, 0.5));
  backdrop-filter: blur(20px);
}

.dropdown-title {
  font-size: 0.65rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--t-text3);
  padding: 4px 10px 8px;
  font-family: 'Orbitron', monospace;
}

.theme-opt {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--t-text2);
  font-size: 0.9rem;
  transition: background 0.2s;
}

.theme-opt:hover {
  background: var(--t-overlay);
  color: var(--t-text);
}

.theme-opt.active {
  background: color-mix(in srgb, var(--t-accent1) 12%, transparent);
  color: var(--t-accent1);
}

.opt-name {
  flex: 1;
  font-weight: 500;
}

.opt-check {
  width: 13px;
  height: 13px;
  color: var(--t-accent1);
}

.dropdown-enter-active {
  animation: dropDown 0.2s ease;
}

.dropdown-leave-active {
  animation: dropDown 0.15s ease reverse;
}

@keyframes dropDown {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.96)
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1)
  }
}

/* 欢迎页 */
.welcome-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.welcome-inner {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: 400px;
}

.vinyl-disc {
  width: min(180px, 40vw);
  height: min(180px, 40vw);
  border-radius: 50%;
  background: radial-gradient(circle, #1a1a2e 30%, #0a0a15 60%, #1a1a2e 100%);
  border: 2px solid var(--t-border);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: vinylSpin 8s linear infinite;
  box-shadow: 0 0 50px color-mix(in srgb, var(--t-accent2) 20%, transparent);
}

@keyframes vinylSpin {
  from {
    transform: rotate(0deg)
  }
  to {
    transform: rotate(360deg)
  }
}

.vinyl-groove {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.vinyl-groove:nth-child(1) {
  width: 86%;
  height: 86%
}

.vinyl-groove:nth-child(2) {
  width: 72%;
  height: 72%
}

.vinyl-groove:nth-child(3) {
  width: 57%;
  height: 57%
}

.vinyl-groove:nth-child(4) {
  width: 40%;
  height: 40%
}

.vinyl-groove:nth-child(5) {
  width: 24%;
  height: 24%
}

.vinyl-center {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--t-play-bg);
  box-shadow: 0 0 14px var(--t-disc-glow);
  z-index: 1;
}

.welcome-title {
  font-family: 'Orbitron', monospace, sans-serif;
  font-size: clamp(1.2rem, 4vw, 2rem);
  font-weight: 700;
  background: var(--t-title-grad);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-sub {
  color: var(--t-text2);
  font-size: 0.93rem;
}

.welcome-btns {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 4px;
}

.btn-select {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 30px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--t-accent1) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--t-accent1) 50%, transparent);
  color: var(--t-accent1);
  font-family: 'Orbitron', monospace, sans-serif;
  font-size: 0.78rem;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 0 20px color-mix(in srgb, var(--t-accent1) 10%, transparent);
}

.btn-select svg {
  width: 16px;
  height: 16px;
}

.btn-select:hover {
  background: color-mix(in srgb, var(--t-accent1) 24%, transparent);
  border-color: var(--t-accent1);
  box-shadow: 0 0 38px color-mix(in srgb, var(--t-accent1) 25%, transparent);
  transform: scale(1.03);
}

.btn-server {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 14px;
  border: 1.5px solid var(--t-border);
  background: var(--t-bg-card);
  color: var(--t-accent2);
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s;
}

.btn-server svg {
  width: 20px;
  height: 20px;
}

.btn-server:hover {
  border-color: var(--t-accent2);
  background: var(--t-overlay);
  transform: translateY(-2px);
}

.error-msg {
  color: #ff5555;
  font-size: 0.85rem;
}

/* 服务器面板 */
.server-panel {
  margin-top: 20px;
  padding: 20px 22px;
  border-radius: 14px;
  border: 1px solid var(--t-border);
  background: var(--t-bg-card);
  width: min(400px, 90vw);
  text-align: left;
}

.sp-title {
  font-size: 0.75rem;
  letter-spacing: 3px;
  color: var(--t-label-color);
  margin-bottom: 10px;
  font-family: 'Orbitron', monospace;
}

.sp-row {
  display: flex;
  gap: 8px;
}

.sp-input {
  flex: 1;
  padding: 9px 14px;
  border-radius: 8px;
  border: 1px solid var(--t-border);
  background: var(--t-overlay);
  color: var(--t-text);
  font-size: 0.88rem;
  font-family: inherit;
  outline: none;
}

.sp-input:focus {
  border-color: var(--t-accent1);
}

.sp-btn {
  padding: 9px 18px;
  border-radius: 8px;
  border: none;
  background: var(--t-play-bg);
  color: rgba(0, 0, 0, 0.8);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  font-size: 0.88rem;
  transition: opacity 0.2s;
  white-space: nowrap;
  min-width: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sp-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sp-loading {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.3);
  border-top-color: rgba(0, 0, 0, 0.8);
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg)
  }
}

.sp-error {
  color: #ff6b6b;
  font-size: 0.8rem;
  margin: 8px 0 0;
}

.sp-hint {
  color: var(--t-text3);
  font-size: 0.75rem;
  margin: 10px 0 0;
}

.sp-hint code {
  color: var(--t-accent2);
  background: var(--t-overlay2, rgba(255, 255, 255, 0.06));
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.72rem;
}

/* 文件浏览器 */
.file-browser {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 22px;
  min-height: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 12px 0 6px;
  flex-shrink: 0;
}

.crumb {
  color: var(--t-text2);
  font-size: 0.84rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.2s;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crumb:hover {
  color: var(--t-accent1);
}

.crumb-active {
  color: var(--t-accent1);
  cursor: default;
}

.crumb-search {
  max-width: 220px;
  color: var(--t-accent2);
}

.crumb-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 4px;
  padding: 2px 10px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--t-accent2) 35%, transparent);
  background: color-mix(in srgb, var(--t-accent2) 8%, transparent);
  color: var(--t-accent2);
  font-family: inherit;
  font-size: 0.74rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.crumb-clear-btn:hover {
  background: color-mix(in srgb, var(--t-accent2) 18%, transparent);
  border-color: var(--t-accent2);
}

.crumb-sep {
  color: var(--t-text3);
  font-size: 1rem;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0 12px;
  flex-shrink: 0;
}

.btn-toolbar {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  background: var(--t-overlay);
  border: 1px solid var(--t-border);
  border-radius: 8px;
  color: var(--t-text2);
  font-family: inherit;
  font-size: 0.87rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.btn-toolbar svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.btn-toolbar:hover {
  border-color: var(--t-accent1);
  color: var(--t-accent1);
  background: color-mix(in srgb, var(--t-accent1) 8%, transparent);
}

.btn-fav-entry {
  border-color: color-mix(in srgb, var(--t-accent4) 40%, transparent);
  color: var(--t-accent4);
}

.btn-fav-entry:hover {
  border-color: var(--t-accent4);
  color: var(--t-accent4);
  background: color-mix(in srgb, var(--t-accent4) 8%, transparent);
}

.item-count {
  margin-left: auto;
  color: var(--t-text3);
  font-size: 0.82rem;
}

.file-grid {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 12px;
  padding-bottom: 20px;
  align-content: start;
}

.file-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 15px 10px 11px;
  background: var(--t-bg-card);
  border: 1px solid var(--t-border);
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  transition: all 0.22s;
}

.file-card:hover {
  background: color-mix(in srgb, var(--t-accent1) 6%, transparent);
  border-color: color-mix(in srgb, var(--t-accent1) 35%, transparent);
  transform: translateY(-2px);
  box-shadow: 0 6px 22px color-mix(in srgb, var(--t-accent1) 10%, transparent);
}

.card-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  position: relative;
  flex-shrink: 0;
}

.folder-icon {
  background: var(--t-folder-bg);
  color: var(--t-folder-clr);
}

.audio-icon {
  background: var(--t-audio-bg);
  color: var(--t-audio-clr);
}

.card-icon svg {
  width: 22px;
  height: 22px;
}

.card-name {
  color: var(--t-text2);
  font-size: 0.74rem;
  font-weight: 500;
  line-height: 1.3;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  width: 100%;
}

.card-ext {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.57rem;
  padding: 1px 4px;
  background: var(--t-audio-bg);
  border-radius: 3px;
  color: var(--t-audio-clr);
  font-family: 'Orbitron', monospace;
}

.playing-waves {
  position: absolute;
  bottom: -5px;
  right: -5px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 13px;
}

.playing-waves span {
  width: 3px;
  background: var(--t-accent3);
  border-radius: 2px;
  animation: waveAnim 0.8s ease-in-out infinite;
}

.playing-waves span:nth-child(2) {
  animation-delay: 0.15s;
}

.playing-waves span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes waveAnim {
  0%, 100% {
    height: 3px
  }
  50% {
    height: 11px
  }
}

.empty-hint {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--t-text3);
}

.empty-hint svg {
  width: 42px;
  height: 42px;
}

/* 响应式 */
@media (max-width: 880px) {
  .file-grid {
    grid-template-columns: repeat(auto-fill, minmax(98px, 1fr));
    gap: 10px;
  }

  .search-wrap {
    width: min(200px, 26vw);
  }
}

@media (max-width: 600px) {
  .header {
    padding: 0 14px;
    height: 54px;
    min-height: 54px;
  }

  .logo-text {
    font-size: 0.92rem;
    letter-spacing: 2px;
  }

  .logo-icon {
    width: 22px;
    height: 22px;
  }

  .search-wrap {
    width: min(150px, calc(100vw - 195px));
  }

  .search-input {
    font-size: 0.8rem;
    padding: 6px 10px 6px 32px;
  }

  .btn-theme {
    padding: 5px 10px;
  }

  .theme-label {
    display: none;
  }

  .file-browser {
    padding: 0 12px;
  }

  .file-grid {
    grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
    gap: 8px;
  }

  .file-card {
    padding: 12px 8px 9px;
    gap: 6px;
  }

  .card-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
  }

  .card-icon svg {
    width: 19px;
    height: 19px;
  }

  .card-name {
    font-size: 0.68rem;
  }

  .btn-text {
    display: none;
  }

  .breadcrumb {
    padding: 10px 0 4px;
  }
}

@media (max-width: 375px) {
  .logo-text {
    display: none;
  }

  .search-wrap {
    width: calc(100vw - 165px);
  }

  .file-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>