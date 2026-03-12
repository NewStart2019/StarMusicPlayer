<script setup>
import {computed, nextTick, onUnmounted, ref, watch} from 'vue'
import {findCurrentLyricIndex, parseLRC} from '../utils/lrcParser.js'
import FileBrowser from './FileBrowser.vue'
import PlayerView from './PlayerView.vue'
import MiniBar from './MiniBar.vue'

// =============================================
// 主题
// =============================================
const THEMES = [
  {
    id: 'daylight', name: '白日晴空', icon: '☀️', vars: {
      '--t-bg': '#f5f7fa',
      '--t-bg-card': 'rgba(255,255,255,0.85)',
      '--t-bg-glass': 'rgba(245,247,250,0.92)',
      '--t-accent1': '#3b82f6',
      '--t-accent2': '#6366f1',
      '--t-accent3': '#06b6d4',
      '--t-accent4': '#f59e0b',
      '--t-text': '#111827',
      '--t-text2': 'rgba(30,41,59,0.65)',
      '--t-text3': 'rgba(30,41,59,0.35)',
      '--t-border': 'rgba(59,130,246,0.18)',
      '--t-orb1': '#93c5fd',
      '--t-orb2': '#a5b4fc',
      '--t-orb3': '#67e8f9',
      '--t-grid': 'rgba(59,130,246,0.06)',
      '--t-play-bg': 'linear-gradient(135deg,#3b82f6,#6366f1)',
      '--t-lyric-active': '#3b82f6',
      '--t-lyric-glow': 'rgba(59,130,246,0.35)',
      '--t-progress': 'linear-gradient(90deg,#3b82f6,#6366f1)',
      '--t-disc-bg': 'radial-gradient(circle at 30% 30%,#dbeafe,#ede9fe 70%)',
      '--t-disc-border': 'rgba(99,102,241,0.25)',
      '--t-disc-center': 'linear-gradient(135deg,#3b82f6,#6366f1)',
      '--t-disc-glow': 'rgba(99,102,241,0.2)',
      '--t-label-color': 'rgba(59,130,246,0.7)',
      '--t-folder-bg': 'rgba(245,158,11,0.1)',
      '--t-folder-clr': '#d97706',
      '--t-audio-bg': 'rgba(59,130,246,0.1)',
      '--t-audio-clr': '#3b82f6',
      '--t-title-grad': 'linear-gradient(90deg,#111827 0%,#3b82f6 100%)',
      '--t-overlay': 'rgba(0,0,0,0.05)',
      '--t-overlay2': 'rgba(0,0,0,0.04)',
      '--t-shadow': 'rgba(0,0,0,0.15)',
      '--t-header-bg': 'rgba(245,247,250,0.92)'
    }
  },
  {
    id: 'cyber', name: '赛博霓虹', icon: '⚡', vars: {
      '--t-bg': '#050810',
      '--t-bg-card': 'rgba(255,255,255,0.04)',
      '--t-bg-glass': 'rgba(10,15,35,0.85)',
      '--t-accent1': '#00f2fe',
      '--t-accent2': '#4facfe',
      '--t-accent3': '#00f260',
      '--t-accent4': '#f953c6',
      '--t-text': '#ffffff',
      '--t-text2': 'rgba(255,255,255,0.55)',
      '--t-text3': 'rgba(255,255,255,0.28)',
      '--t-border': 'rgba(0,242,254,0.18)',
      '--t-orb1': '#4facfe',
      '--t-orb2': '#f953c6',
      '--t-orb3': '#00f260',
      '--t-grid': 'rgba(0,242,254,0.04)',
      '--t-play-bg': 'linear-gradient(135deg,#00f2fe,#4facfe)',
      '--t-lyric-active': '#00f260',
      '--t-lyric-glow': 'rgba(0,242,96,0.45)',
      '--t-progress': 'linear-gradient(90deg,#00f2fe,#4facfe)',
      '--t-disc-bg': 'radial-gradient(circle at 30% 30%,#1e2a4a,#050810 70%)',
      '--t-disc-border': 'rgba(0,242,254,0.2)',
      '--t-disc-center': 'linear-gradient(135deg,#00f2fe,#4facfe)',
      '--t-disc-glow': 'rgba(0,242,254,0.15)',
      '--t-label-color': 'rgba(0,242,254,0.6)',
      '--t-folder-bg': 'rgba(255,185,0,0.1)',
      '--t-folder-clr': '#ffb900',
      '--t-audio-bg': 'rgba(0,242,254,0.1)',
      '--t-audio-clr': '#00f2fe',
      '--t-title-grad': 'linear-gradient(90deg,#fff 0%,rgba(0,242,254,0.9) 100%)',
      '--t-overlay': 'rgba(255,255,255,0.05)',
      '--t-overlay2': 'rgba(255,255,255,0.04)',
      '--t-shadow': 'rgba(0,0,0,0.5)'
    }
  },
  {
    id: 'sakura', name: '樱花物语', icon: '🌸', vars: {
      '--t-bg': '#0f0810',
      '--t-bg-card': 'rgba(255,220,240,0.04)',
      '--t-bg-glass': 'rgba(20,8,20,0.88)',
      '--t-accent1': '#ff85b3',
      '--t-accent2': '#ffb3d1',
      '--t-accent3': '#ff4d8d',
      '--t-accent4': '#ffe066',
      '--t-text': '#fff0f5',
      '--t-text2': 'rgba(255,200,220,0.6)',
      '--t-text3': 'rgba(255,200,220,0.28)',
      '--t-border': 'rgba(255,133,179,0.2)',
      '--t-orb1': '#ff85b3',
      '--t-orb2': '#b060ff',
      '--t-orb3': '#ffe066',
      '--t-grid': 'rgba(255,133,179,0.04)',
      '--t-play-bg': 'linear-gradient(135deg,#ff4d8d,#ffb3d1)',
      '--t-lyric-active': '#ffe066',
      '--t-lyric-glow': 'rgba(255,224,102,0.45)',
      '--t-progress': 'linear-gradient(90deg,#ff4d8d,#ffb3d1)',
      '--t-disc-bg': 'radial-gradient(circle at 30% 30%,#2d1020,#0f0810 70%)',
      '--t-disc-border': 'rgba(255,133,179,0.25)',
      '--t-disc-center': 'linear-gradient(135deg,#ff85b3,#ffb3d1)',
      '--t-disc-glow': 'rgba(255,133,179,0.18)',
      '--t-label-color': 'rgba(255,133,179,0.7)',
      '--t-folder-bg': 'rgba(255,224,102,0.1)',
      '--t-folder-clr': '#ffe066',
      '--t-audio-bg': 'rgba(255,133,179,0.1)',
      '--t-audio-clr': '#ff85b3',
      '--t-title-grad': 'linear-gradient(90deg,#fff0f5 0%,rgba(255,133,179,0.9) 100%)',
      '--t-overlay': 'rgba(255,255,255,0.05)',
      '--t-overlay2': 'rgba(255,255,255,0.04)',
      '--t-shadow': 'rgba(0,0,0,0.5)'
    }
  },
  {
    id: 'forest', name: '翡翠森林', icon: '🌿', vars: {
      '--t-bg': '#060e08',
      '--t-bg-card': 'rgba(180,255,180,0.03)',
      '--t-bg-glass': 'rgba(6,18,8,0.9)',
      '--t-accent1': '#39d98a',
      '--t-accent2': '#88f0b8',
      '--t-accent3': '#00e5a0',
      '--t-accent4': '#ffd166',
      '--t-text': '#f0fff4',
      '--t-text2': 'rgba(180,255,210,0.55)',
      '--t-text3': 'rgba(180,255,210,0.28)',
      '--t-border': 'rgba(57,217,138,0.18)',
      '--t-orb1': '#39d98a',
      '--t-orb2': '#00b8ff',
      '--t-orb3': '#ffd166',
      '--t-grid': 'rgba(57,217,138,0.04)',
      '--t-play-bg': 'linear-gradient(135deg,#39d98a,#88f0b8)',
      '--t-lyric-active': '#ffd166',
      '--t-lyric-glow': 'rgba(255,209,102,0.4)',
      '--t-progress': 'linear-gradient(90deg,#39d98a,#88f0b8)',
      '--t-disc-bg': 'radial-gradient(circle at 30% 30%,#0d2516,#060e08 70%)',
      '--t-disc-border': 'rgba(57,217,138,0.22)',
      '--t-disc-center': 'linear-gradient(135deg,#39d98a,#88f0b8)',
      '--t-disc-glow': 'rgba(57,217,138,0.15)',
      '--t-label-color': 'rgba(57,217,138,0.65)',
      '--t-folder-bg': 'rgba(255,209,102,0.1)',
      '--t-folder-clr': '#ffd166',
      '--t-audio-bg': 'rgba(57,217,138,0.1)',
      '--t-audio-clr': '#39d98a',
      '--t-title-grad': 'linear-gradient(90deg,#f0fff4 0%,rgba(57,217,138,0.9) 100%)',
      '--t-overlay': 'rgba(255,255,255,0.05)',
      '--t-overlay2': 'rgba(255,255,255,0.04)',
      '--t-shadow': 'rgba(0,0,0,0.5)'
    }
  },
  {
    id: 'aurora', name: '极光幻境', icon: '🌌', vars: {
      '--t-bg': '#04080f',
      '--t-bg-card': 'rgba(120,200,255,0.04)',
      '--t-bg-glass': 'rgba(4,10,20,0.9)',
      '--t-accent1': '#7b61ff',
      '--t-accent2': '#00d4ff',
      '--t-accent3': '#ff6b6b',
      '--t-accent4': '#ffd60a',
      '--t-text': '#f0f4ff',
      '--t-text2': 'rgba(180,190,255,0.6)',
      '--t-text3': 'rgba(180,190,255,0.28)',
      '--t-border': 'rgba(123,97,255,0.2)',
      '--t-orb1': '#7b61ff',
      '--t-orb2': '#00d4ff',
      '--t-orb3': '#ff6b6b',
      '--t-grid': 'rgba(123,97,255,0.04)',
      '--t-play-bg': 'linear-gradient(135deg,#7b61ff,#00d4ff)',
      '--t-lyric-active': '#ffd60a',
      '--t-lyric-glow': 'rgba(255,214,10,0.45)',
      '--t-progress': 'linear-gradient(90deg,#7b61ff,#00d4ff)',
      '--t-disc-bg': 'radial-gradient(circle at 30% 30%,#1a1040,#04080f 70%)',
      '--t-disc-border': 'rgba(123,97,255,0.25)',
      '--t-disc-center': 'linear-gradient(135deg,#7b61ff,#00d4ff)',
      '--t-disc-glow': 'rgba(123,97,255,0.18)',
      '--t-label-color': 'rgba(123,97,255,0.7)',
      '--t-folder-bg': 'rgba(255,214,10,0.1)',
      '--t-folder-clr': '#ffd60a',
      '--t-audio-bg': 'rgba(123,97,255,0.1)',
      '--t-audio-clr': '#7b61ff',
      '--t-title-grad': 'linear-gradient(90deg,#f0f4ff 0%,rgba(123,97,255,0.9) 100%)',
      '--t-overlay': 'rgba(255,255,255,0.05)',
      '--t-overlay2': 'rgba(255,255,255,0.04)',
      '--t-shadow': 'rgba(0,0,0,0.5)'
    }
  },
  {
    id: 'ember', name: '烈焰余烬', icon: '🔥', vars: {
      '--t-bg': '#0c0500',
      '--t-bg-card': 'rgba(255,120,30,0.04)',
      '--t-bg-glass': 'rgba(18,6,0,0.9)',
      '--t-accent1': '#ff6b2b',
      '--t-accent2': '#ffad5e',
      '--t-accent3': '#ff3030',
      '--t-accent4': '#ffe14d',
      '--t-text': '#fff5ee',
      '--t-text2': 'rgba(255,200,150,0.6)',
      '--t-text3': 'rgba(255,200,150,0.28)',
      '--t-border': 'rgba(255,107,43,0.2)',
      '--t-orb1': '#ff6b2b',
      '--t-orb2': '#ff3030',
      '--t-orb3': '#ffe14d',
      '--t-grid': 'rgba(255,107,43,0.04)',
      '--t-play-bg': 'linear-gradient(135deg,#ff3030,#ffad5e)',
      '--t-lyric-active': '#ffe14d',
      '--t-lyric-glow': 'rgba(255,225,77,0.45)',
      '--t-progress': 'linear-gradient(90deg,#ff3030,#ffad5e)',
      '--t-disc-bg': 'radial-gradient(circle at 30% 30%,#2a1005,#0c0500 70%)',
      '--t-disc-border': 'rgba(255,107,43,0.25)',
      '--t-disc-center': 'linear-gradient(135deg,#ff6b2b,#ffad5e)',
      '--t-disc-glow': 'rgba(255,107,43,0.18)',
      '--t-label-color': 'rgba(255,107,43,0.7)',
      '--t-folder-bg': 'rgba(255,225,77,0.1)',
      '--t-folder-clr': '#ffe14d',
      '--t-audio-bg': 'rgba(255,107,43,0.1)',
      '--t-audio-clr': '#ff6b2b',
      '--t-title-grad': 'linear-gradient(90deg,#fff5ee 0%,rgba(255,107,43,0.9) 100%)',
      '--t-overlay': 'rgba(255,255,255,0.05)',
      '--t-overlay2': 'rgba(255,255,255,0.04)',
      '--t-shadow': 'rgba(0,0,0,0.5)'
    }
  },
]

const currentThemeId = ref('daylight')
const themeVars = computed(() => THEMES.find(t => t.id === currentThemeId.value)?.vars ?? {})
const applyTheme = (id) => {
  if (THEMES.find(t => t.id === id)) currentThemeId.value = id
}

// =============================================
// 浏览器状态
// =============================================
const allEntries = ref(null)
const pathStack = ref([])
const currentEntries = ref([])
const hasFolder = ref(false)
const errorMsg = ref('')
const sourceMode = ref('local')
const serverTree = ref(null)
const fileBrowserRef = ref(null)

// ── 全局搜索状态 ──────────────────────────────
const isSearchMode = ref(false)
const searchResults = ref(null)

// =============================================
// 播放器状态
// =============================================
const playlist = ref([])
const currentIndex = ref(-1)
const showPlayer = ref(false)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.8)
const isDragging = ref(false)
const favorites = ref(new Set())
const lyrics = ref([])
const currentLyricIndex = ref(-1)
const albumRotation = ref(0)
const audioRef = ref(null)
const playerViewRef = ref(null)

// 播放模式：order / shuffle / repeat
const playMode = ref('order')
const cyclePlayMode = () => {
  playMode.value = {order: 'shuffle', shuffle: 'repeat', repeat: 'order'}[playMode.value]
}

// 睡眠定时器
const sleepMinutes = ref(0)   // 0 = 未启用
const sleepEndTime = ref(0)   // Date.now() + ms
let sleepTimerId = null
const setSleepTimer = (minutes) => {
  if (sleepTimerId) {
    clearTimeout(sleepTimerId);
    sleepTimerId = null
  }
  sleepMinutes.value = minutes
  if (minutes <= 0) {
    sleepEndTime.value = 0;
    return
  }
  sleepEndTime.value = Date.now() + minutes * 60_000
  sleepTimerId = setTimeout(() => {
    audioRef.value?.pause()
    isPlaying.value = false
    stopAlbumRotation()
    sleepMinutes.value = 0
    sleepEndTime.value = 0
    sleepTimerId = null
  }, minutes * 60_000)
}
const cancelSleepTimer = () => setSleepTimer(0)
let rotationRafId = null, lastTimestamp = null

// =============================================
// 计算属性
// =============================================
const currentSong = computed(() =>
    currentIndex.value >= 0 && currentIndex.value < playlist.value.length
        ? playlist.value[currentIndex.value] : null
)
const songTitle = computed(() =>
    currentSong.value ? currentSong.value.name.replace(/\.[^.]+$/, '') : '未知歌曲'
)
const artistName = computed(() => {
  const i = songTitle.value.indexOf(' - ')
  return i > 0 ? songTitle.value.substring(0, i) : '未知艺术家'
})
const displayTitle = computed(() => {
  const i = songTitle.value.indexOf(' - ')
  return i > 0 ? songTitle.value.substring(i + 3) : songTitle.value
})
const progressPercent = computed(() =>
    duration.value ? (currentTime.value / duration.value) * 100 : 0
)
const isFavorite = computed(() =>
    currentSong.value ? favorites.value.has(currentSong.value.name) : false
)

// =============================================
// 本地文件系统
// =============================================
const AUDIO_EXTS = new Set(['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.opus', '.wma'])
const isAudioFile = (n) => AUDIO_EXTS.has(n.substring(n.lastIndexOf('.')).toLowerCase())
const isLrcFile = (n) => n.toLowerCase().endsWith('.lrc')

const handleFolderSelect = (event) => {
  const files = Array.from(event.target.files)
  if (!files.length) return
  errorMsg.value = ''
  sourceMode.value = 'local'
  buildVirtualFS(files)
  hasFolder.value = true
  pathStack.value = []
  navigateToPath([])
}

const buildVirtualFS = (files) => {
  const root = {name: 'root', type: 'folder', children: new Map(), path: []}
  files.forEach(file => {
    const parts = file.webkitRelativePath.split('/')
    let cur = root
    for (let i = 1; i < parts.length - 1; i++) {
      if (!cur.children.has(parts[i]))
        cur.children.set(parts[i], {name: parts[i], type: 'folder', children: new Map(), path: parts.slice(0, i + 1)})
      cur = cur.children.get(parts[i])
    }
    const fn = parts[parts.length - 1]
    if (isAudioFile(fn) || isLrcFile(fn))
      cur.children.set(fn, {
        name: fn,
        type: 'file',
        fileObj: file,
        path: parts,
        isAudio: isAudioFile(fn),
        isLrc: isLrcFile(fn)
      })
  })
  allEntries.value = root
}

const navigateToPath = (pathParts) => {
  let node = allEntries.value
  for (const p of pathParts) {
    if (node.children?.has(p)) node = node.children.get(p)
    else break
  }
  if (!node?.children) {
    currentEntries.value = [];
    return
  }
  const folders = [], audioFiles = []
  node.children.forEach(e => {
    if (e.type === 'folder' && hasAudioInFolder(e)) folders.push(e)
    else if (e.isAudio) audioFiles.push(e)
  })
  folders.sort((a, b) => a.name.localeCompare(b.name))
  audioFiles.sort((a, b) => a.name.localeCompare(b.name))
  currentEntries.value = [...folders, ...audioFiles]
  if (pathParts.length > 0)
    pathStack.value = pathParts.map((name, i) => ({name, path: pathParts.slice(0, i + 1)}))
}

const hasAudioInFolder = (folder) => {
  if (!folder.children) return false
  for (const [, e] of folder.children) {
    if (e.isAudio) return true
    if (e.type === 'folder' && hasAudioInFolder(e)) return true
  }
  return false
}

// =============================================
// 服务器模式
// =============================================
const serverBase = ref('')   // 连接成功后存储 server base URL，供收藏接口使用
const connectServer = async ({url}) => {
  const base = url.replace(/\/$/, '')
  fileBrowserRef.value?.setServerLoading(true)
  fileBrowserRef.value?.setServerError('')
  try {
    const res = await fetch(`${base}/api/files?flat=0`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data.success) throw new Error(data.error || '服务器返回失败')
    serverBase.value = base
    serverTree.value = convertServerTree(data.tree, [])
    allEntries.value = serverTree.value
    hasFolder.value = true
    sourceMode.value = 'server'
    pathStack.value = []
    navigateToServerPath([])
  } catch (e) {
    fileBrowserRef.value?.setServerError(`连接失败：${e.message}`)
  } finally {
    fileBrowserRef.value?.setServerLoading(false)
  }
}

const convertServerTree = (node, parentPath) => {
  const currentPath = [...parentPath, node.name]
  if (node.type === 'folder')
    return {
      type: 'folder', name: node.name, path: currentPath, source: 'server',
      children: (node.children || []).map(c => convertServerTree(c, currentPath))
    }
  return {
    type: 'file', name: node.name, ext: node.ext, relativePath: node.relativePath,
    url: node.url, lrc: node.lrc ?? null, isAudio: node.isAudio, isLrc: node.isLrc,
    source: 'server', path: currentPath
  }
}

const navigateToServerPath = (pathParts) => {
  let node = serverTree.value
  for (const part of pathParts) {
    const child = node?.children?.find(c => c.name === part)
    if (!child) break
    node = child
  }
  if (!node) {
    currentEntries.value = [];
    return
  }
  const items = (node.children || []).filter(e =>
      e.type === 'folder' ? hasAudioInServerFolder(e) : e.isAudio
  )
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  currentEntries.value = items
  pathStack.value = pathParts.length > 0
      ? pathParts.map((name, i) => ({name, path: pathParts.slice(0, i + 1)}))
      : []
}

const hasAudioInServerFolder = (folder) =>
    (folder.children || []).some(e =>
        (e.type === 'file' && e.isAudio) || (e.type === 'folder' && hasAudioInServerFolder(e))
    )

const disconnectServer = () => {
  sourceMode.value = 'local';
  hasFolder.value = false
  serverBase.value = '';
  serverTree.value = null;
  allEntries.value = null
  currentEntries.value = [];
  pathStack.value = []
  exitSearchMode()
  if (showPlayer.value) closePlayer()
}

const refreshServer = () => {
  // 重新拉取：遍历 serverTree 找根节点 url 前缀
  const firstAudio = findFirstAudio(serverTree.value)
  if (!firstAudio?.url) return
  try {
    const u = new URL(firstAudio.url)
    connectServer({url: `${u.protocol}//${u.host}`})
  } catch { /* 无法解析则忽略 */
  }
}
const findFirstAudio = (node) => {
  if (!node) return null
  if (node.isAudio) return node
  for (const c of (node.children || [])) {
    const r = findFirstAudio(c);
    if (r) return r
  }
  return null
}

// =============================================
// 导航
// =============================================
const enterFolder = (entry) => {
  exitSearchMode()
  fileBrowserRef.value?.clearSearch()
  if (sourceMode.value === 'server') navigateToServerPath(entry.path.slice(1))
  else navigateToPath(entry.path.slice(1))
}
const goBack = () => {
  exitSearchMode()
  fileBrowserRef.value?.clearSearch()
  const nav = sourceMode.value === 'server' ? navigateToServerPath : navigateToPath
  if (pathStack.value.length <= 1) {
    pathStack.value = [];
    nav([])
  } else nav(pathStack.value[pathStack.value.length - 2].path)
}
const goRoot = () => {
  exitSearchMode()
  fileBrowserRef.value?.clearSearch()
  pathStack.value = []
  if (sourceMode.value === 'server') navigateToServerPath([])
  else navigateToPath([])
}
const breadcrumbNav = (item) => {
  exitSearchMode()
  fileBrowserRef.value?.clearSearch()
  if (sourceMode.value === 'server') navigateToServerPath(item.path)
  else navigateToPath(item.path)
}

// ── 全局搜索 ─────────────────────────────────
// 递归收集本地 Map 树中的所有音频文件
const collectLocalAudio = (node, result = []) => {
  if (!node?.children) return result
  node.children.forEach(e => {
    if (e.isAudio) result.push(e)
    else if (e.type === 'folder') collectLocalAudio(e, result)
  })
  return result
}
// 递归收集服务端数组树中的所有音频文件
const collectServerAudio = (node, result = []) => {
  if (!node) return result
  if (node.isAudio) {
    result.push(node);
    return result
  }
  for (const c of (node.children || [])) collectServerAudio(c, result)
  return result
}

const handleSearchAll = (keyword) => {
  if (!allEntries.value || !keyword.trim()) return
  const q = keyword.toLowerCase()
  const all = sourceMode.value === 'server'
      ? collectServerAudio(allEntries.value)
      : collectLocalAudio(allEntries.value)
  searchResults.value = all.filter(e => e.name.toLowerCase().includes(q))
  isSearchMode.value = true
}

const exitSearchMode = () => {
  isSearchMode.value = false
  searchResults.value = null
}

// =============================================
// 播放控制
// =============================================
// visibleList：可选，传入当前搜索过滤后的列表，用于构建 playlist
// 不传时退回到 currentEntries（保持旧行为）
const playAudio = async (entry, visibleList) => {
  const source = visibleList ?? currentEntries.value
  const audioList = source.filter(e => e.type === 'file' && e.isAudio)
  playlist.value = audioList
  const idx = audioList.findIndex(e => e.name === entry.name && e.url === entry.url)
  currentIndex.value = idx >= 0 ? idx : 0
  showPlayer.value = true
  await loadAndPlay(currentIndex.value)
}

const loadAndPlay = async (index) => {
  if (index < 0 || index >= playlist.value.length) return
  currentIndex.value = index
  const song = playlist.value[index]
  const audio = audioRef.value
  if (audio.src?.startsWith('blob:')) URL.revokeObjectURL(audio.src)
  audio.src = song.source === 'server' ? song.url : URL.createObjectURL(song.fileObj)
  audio.volume = volume.value
  try {
    await audio.play();
    isPlaying.value = true;
    startAlbumRotation()
  } catch (e) {
    console.error('播放失败:', e)
  }
  await loadLyrics(song)
}

const loadLyrics = async (song) => {
  lyrics.value = [];
  currentLyricIndex.value = -1
  if (song.source === 'server') {
    if (song.lrc) {
      try {
        lyrics.value = parseLRC(await fetch(song.lrc).then(r => r.text()))
      } catch (e) {
        console.error('LRC fetch 失败:', e)
      }
    }
  } else {
    const lrcName = song.name.replace(/\.[^.]+$/, '') + '.lrc'
    const dirPath = song.path.slice(1, -1)
    let node = allEntries.value
    for (const p of dirPath) {
      if (node.children?.has(p)) node = node.children.get(p)
      else {
        node = null;
        break
      }
    }
    if (node?.children?.has(lrcName)) {
      try {
        lyrics.value = parseLRC(await node.children.get(lrcName).fileObj.text())
      } catch (e) {
        console.error('LRC 读取失败:', e)
      }
    }
  }
}

const togglePlay = () => {
  const audio = audioRef.value;
  if (!audio) return
  if (isPlaying.value) {
    audio.pause();
    isPlaying.value = false;
    stopAlbumRotation()
  } else {
    audio.play();
    isPlaying.value = true;
    startAlbumRotation()
  }
}
const prevSong = () => {
  if (!playlist.value.length) return
  loadAndPlay((currentIndex.value - 1 + playlist.value.length) % playlist.value.length)
}
const nextSong = (fromEnd = false) => {
  if (!playlist.value.length) return
  if (fromEnd && playMode.value === 'repeat') {
    loadAndPlay(currentIndex.value);
    return
  }
  if (playMode.value === 'shuffle') {
    let idx = Math.floor(Math.random() * playlist.value.length)
    if (playlist.value.length > 1 && idx === currentIndex.value)
      idx = (idx + 1) % playlist.value.length
    loadAndPlay(idx)
  } else {
    loadAndPlay((currentIndex.value + 1) % playlist.value.length)
  }
}
const toggleFavorite = async () => {
  if (!currentSong.value) return
  const song = currentSong.value
  const n = song.name
  const wasFav = favorites.value.has(n)

  // 本地状态立即更新
  if (wasFav) favorites.value.delete(n)
  else favorites.value.add(n)

  // 服务器模式：调接口持久化
  if (sourceMode.value === 'server' && serverBase.value) {
    try {
      if (!wasFav) {
        // 添加收藏
        await fetch(`${serverBase.value}/favorite/add`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(song),
        })
      } else {
        // 取消收藏
        await fetch(`${serverBase.value}/favorite/remove`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({url: song.url, name: song.name}),
        })
      }
    } catch (e) {
      console.error('收藏接口错误:', e)
    }
  }
}

// ── 我的收藏 ──────────────────────────────
const showFavorites = ref(false)
const favoritesList = ref([])
const favLoading = ref(false)
const favError = ref('')

const loadFavorites = async () => {
  if (!serverBase.value) {
    favError.value = '请先连接服务器';
    return
  }
  favLoading.value = true;
  favError.value = ''
  try {
    const res = await fetch(`${serverBase.value}/favorite/data`)
    const data = await res.json()
    if (data.success) {
      favoritesList.value = data.data
      // 同步本地收藏标记
      data.data.forEach(s => favorites.value.add(s.name))
    } else {
      favError.value = data.error || '获取收藏失败'
    }
  } catch (e) {
    favError.value = `请求失败: ${e.message}`
  } finally {
    favLoading.value = false
  }
}

const toggleFavPanel = () => {
  if (!showFavorites.value) {
    showFavorites.value = true
    loadFavorites()
  } else {
    showFavorites.value = false
  }
}

const playFromFavorites = async (song) => {
  // 将收藏列表的音频项作为 playlist，并播放选中的
  const audioList = favoritesList.value.filter(e => e.isAudio !== false)
  playlist.value = audioList
  const idx = audioList.findIndex(e => e.url === song.url || e.name === song.name)
  currentIndex.value = idx >= 0 ? idx : 0
  showPlayer.value = true
  await loadAndPlay(currentIndex.value)
}
const closePlayer = () => {
  showPlayer.value = false
}

// audio 事件
const onAudioEnded = () => {
  if (sleepMinutes.value === -1) {
    audioRef.value?.pause()
    isPlaying.value = false
    stopAlbumRotation()
    sleepMinutes.value = 0
    sleepEndTime.value = 0
    return
  }
  nextSong(true)
}
const onLoadedMetadata = () => {
  duration.value = audioRef.value?.duration || 0
}
const onTimeUpdate = () => {
  if (!isDragging.value) currentTime.value = audioRef.value?.currentTime || 0
  updateLyric()
}

// 歌词滚动
const updateLyric = () => {
  if (!lyrics.value.length) return
  const idx = findCurrentLyricIndex(lyrics.value, currentTime.value)
  if (idx !== currentLyricIndex.value) {
    currentLyricIndex.value = idx
    nextTick(() => {
      const pv = playerViewRef.value
      scrollLyric(pv?.lyricsContainerRef, idx)
      scrollLyric(pv?.mobileLyricsRef, idx)
    })
  }
}
const scrollLyric = (container, index) => {
  if (!container || index < 0) return
  const el = container.querySelector('.lyric-line.active')
  if (el) container.scrollTo({top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth'})
}
const onLyricSeek = (time) => {
  audioRef.value.currentTime = time;
  currentTime.value = time
}

const removeFromPlaylist = (index) => {
  if (index < 0 || index >= playlist.value.length) return
  const wasPlaying = isPlaying.value
  // 如果删除的是当前播放歌曲
  if (index === currentIndex.value) {
    audioRef.value?.pause()
    isPlaying.value = false
    stopAlbumRotation()
    playlist.value.splice(index, 1)
    if (playlist.value.length === 0) {
      closePlayer()
    } else {
      // 播放删除位置的下一首（或最后一首）
      const nextIdx = Math.min(index, playlist.value.length - 1)
      currentIndex.value = -1 // 强制重载
      loadAndPlay(nextIdx)
    }
  } else {
    playlist.value.splice(index, 1)
    // 修正 currentIndex
    if (index < currentIndex.value) currentIndex.value--
  }
}

// =============================================
// 进度条拖拽
// =============================================
const getProgressRatio = (event, el) => {
  const rect = el.getBoundingClientRect()
  const x = event.touches ? event.touches[0].clientX : event.clientX
  return Math.max(0, Math.min(1, (x - rect.left) / rect.width))
}

// PlayerView 里的 seek / drag-start 事件传来原生 MouseEvent/TouchEvent
// 需从 playerViewRef 拿到对应的进度条 DOM 元素
const getProgressEl = () => {
  const pv = playerViewRef.value
  if (!pv) return null
  // 手机端 mobileProgressRef 有真实 DOM 则优先（桌面栏被 display:none 时其 getBoundingClientRect().width === 0）
  const mobile = pv.mobileProgressRef?.value ?? pv.mobileProgressRef
  const desktop = pv.progressBarRef?.value ?? pv.progressBarRef
  if (mobile && mobile.getBoundingClientRect().width > 0) return mobile
  return desktop
}

const onSeek = (event) => {
  const el = getProgressEl()
  if (!el) return
  const ratio = getProgressRatio(event, el)
  audioRef.value.currentTime = ratio * duration.value
  currentTime.value = ratio * duration.value
}

const onDragStart = (event) => {
  isDragging.value = true
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDragMove, {passive: false})
  document.addEventListener('touchend', stopDrag)
  onDragMove(event)
}
const onDragMove = (event) => {
  if (!isDragging.value) return
  if (event.cancelable) event.preventDefault()
  const el = getProgressEl()
  if (!el) return
  currentTime.value = getProgressRatio(event, el) * duration.value
}
const stopDrag = () => {
  if (isDragging.value) {
    audioRef.value.currentTime = currentTime.value;
    isDragging.value = false
  }
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', stopDrag)
}

const onVolumeChange = (event) => {
  volume.value = parseFloat(event.target.value)
  if (audioRef.value) audioRef.value.volume = volume.value
}

// =============================================
// 专辑旋转
// =============================================
const startAlbumRotation = () => {
  if (rotationRafId) return
  lastTimestamp = null
  const animate = (ts) => {
    if (!lastTimestamp) lastTimestamp = ts
    albumRotation.value = (albumRotation.value + (ts - lastTimestamp) * 0.018) % 360
    lastTimestamp = ts
    rotationRafId = requestAnimationFrame(animate)
  }
  rotationRafId = requestAnimationFrame(animate)
}
const stopAlbumRotation = () => {
  if (rotationRafId) {
    cancelAnimationFrame(rotationRafId);
    rotationRafId = null;
    lastTimestamp = null
  }
}

// 把主题变量同步到 document.body，使 Teleport 到 body 的子组件也能继承 CSS 变量
const applyThemeToBody = (vars) => {
  Object.entries(vars).forEach(([k, v]) => document.body.style.setProperty(k, v))
}
watch(themeVars, applyThemeToBody, {immediate: true})

onUnmounted(() => {
  stopAlbumRotation()
  if (sleepTimerId) clearTimeout(sleepTimerId)
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', stopDrag)
})
</script>

<template>
  <div class="app-wrapper"
       :style="{ ...themeVars, '--minibar-h': (currentSong && !showPlayer) ? 'calc(78px + env(safe-area-inset-bottom, 0px))' : '0px' }">
    <!-- 动态背景 -->
    <div class="bg-orb orb1"></div>
    <div class="bg-orb orb2"></div>
    <div class="bg-orb orb3"></div>
    <div class="bg-grid"></div>

    <!-- 首页（文件浏览器）-->
    <FileBrowser
        ref="fileBrowserRef"
        :has-folder="hasFolder"
        :source-mode="sourceMode"
        :path-stack="pathStack"
        :current-entries="currentEntries"
        :current-song="currentSong"
        :is-playing="isPlaying"
        :error-msg="errorMsg"
        :themes="THEMES"
        :current-theme-id="currentThemeId"
        :server-mode="sourceMode === 'server'"
        :search-results="searchResults"
        :is-search-mode="isSearchMode"
        :has-mini-bar="!!currentSong && !showPlayer"
        @play-audio="({ entry, visibleList }) => playAudio(entry, visibleList)"
        @enter-folder="enterFolder"
        @go-back="goBack"
        @go-root="goRoot"
        @breadcrumb-nav="breadcrumbNav"
        @folder-select="handleFolderSelect"
        @connect-server="connectServer"
        @disconnect="disconnectServer"
        @refresh-server="refreshServer"
        @apply-theme="applyTheme"
        @show-favorites="toggleFavPanel"
        @search-all="handleSearchAll"
        @clear-search="exitSearchMode"
    />

    <!-- 我的收藏面板 -->
    <Transition name="fav-slide">
      <div v-if="showFavorites" class="fav-panel">
        <div class="fav-header">
          <span class="fav-title">我的收藏</span>
          <span class="fav-count" v-if="!favLoading">{{ favoritesList.length }} 首</span>
          <button class="fav-close" @click="showFavorites = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div v-if="favLoading" class="fav-loading">
          <span class="fav-spinner"></span>
          <span>加载中...</span>
        </div>
        <div v-else-if="favError" class="fav-error">{{ favError }}</div>
        <div v-else-if="favoritesList.length === 0" class="fav-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <p>暂无收藏</p>
          <span>在播放页面点击心形图标收藏歌曲</span>
        </div>
        <div v-else class="fav-list">
          <div v-for="(song, i) in favoritesList" :key="song.url || song.name"
               class="fav-item" @click="playFromFavorites(song)">
            <div class="fav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div class="fav-info">
              <span class="fav-name">{{ song.name.replace(/\.[^.]+$/, '') }}</span>
              <span class="fav-ext">{{ (song.name.split('.').pop() || '').toUpperCase() }}</span>
            </div>
            <svg class="fav-play-icon" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 播放页面 -->
    <Transition name="player-slide">
      <PlayerView
          v-if="showPlayer"
          ref="playerViewRef"
          :display-title="displayTitle"
          :artist-name="artistName"
          :is-playing="isPlaying"
          :album-rotation="albumRotation"
          :current-time="currentTime"
          :duration="duration"
          :progress-percent="progressPercent"
          :volume="volume"
          :lyrics="lyrics"
          :current-lyric-index="currentLyricIndex"
          :is-favorite="isFavorite"
          :playlist="playlist"
          :current-index="currentIndex"
          :play-mode="playMode"
          :sleep-minutes="sleepMinutes"
          :sleep-end-time="sleepEndTime"
          @close="closePlayer"
          @toggle-play="togglePlay"
          @prev="prevSong"
          @next="nextSong"
          @seek="onSeek"
          @drag-start="onDragStart"
          @volume-change="onVolumeChange"
          @toggle-fav="toggleFavorite"
          @load-index="loadAndPlay"
          @lyric-seek="onLyricSeek"
          @remove-from-playlist="removeFromPlaylist"
          @cycle-play-mode="cyclePlayMode"
          @set-sleep-timer="setSleepTimer"
          @cancel-sleep-timer="cancelSleepTimer"
      />
    </Transition>

    <!-- 底部迷你播放栏（有歌曲时始终显示，播放页打开时隐藏） -->
    <Transition name="minibar-slide">
      <MiniBar
          v-if="currentSong && !showPlayer"
          :display-title="displayTitle"
          :artist-name="artistName"
          :is-playing="isPlaying"
          :is-favorite="isFavorite"
          :volume="volume"
          :play-mode="playMode"
          :playlist="playlist"
          :current-index="currentIndex"
          :progress-percent="progressPercent"
          :sleep-minutes="sleepMinutes"
          :sleep-end-time="sleepEndTime"
          @open-player="showPlayer = true"
          @toggle-play="togglePlay"
          @prev="prevSong"
          @next="nextSong"
          @toggle-fav="toggleFavorite"
          @volume-change="onVolumeChange"
          @cycle-play-mode="cyclePlayMode"
          @load-index="loadAndPlay"
          @remove-from-playlist="removeFromPlaylist"
          @set-sleep-timer="setSleepTimer"
          @cancel-sleep-timer="cancelSleepTimer"
      />
    </Transition>

    <audio ref="audioRef"
           @timeupdate="onTimeUpdate"
           @loadedmetadata="onLoadedMetadata"
           @ended="onAudioEnded">
    </audio>
  </div>
</template>

<style scoped>
.app-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: var(--t-bg);
  overflow: hidden;
  font-family: 'Rajdhani', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--t-text);
  transition: background 0.5s;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.14;
  pointer-events: none;
  transition: background 0.6s;
}

.orb1 {
  width: 55vw;
  height: 55vw;
  background: radial-gradient(circle, var(--t-orb1), transparent);
  top: -18vw;
  left: -14vw;
  animation: orb1Float 14s ease-in-out infinite;
}

.orb2 {
  width: 45vw;
  height: 45vw;
  background: radial-gradient(circle, var(--t-orb2), transparent);
  bottom: -14vw;
  right: -10vw;
  animation: orb1Float 14s ease-in-out infinite -5s;
}

.orb3 {
  width: 36vw;
  height: 36vw;
  background: radial-gradient(circle, var(--t-orb3), transparent);
  top: 50%;
  left: 50%;
  opacity: 0.08;
  animation: orb3Float 16s ease-in-out infinite;
}

@keyframes orb1Float {
  0%, 100% {
    transform: translate(0, 0)
  }
  40% {
    transform: translate(2vw, -2vw)
  }
  70% {
    transform: translate(-1.5vw, 1.8vw)
  }
}

@keyframes orb3Float {
  0%, 100% {
    transform: translate(-50%, -50%)
  }
  50% {
    transform: translate(calc(-50% + 1vw), calc(-50% + 1.5vw))
  }
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(var(--t-grid) 1px, transparent 1px), linear-gradient(90deg, var(--t-grid) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}

/* 播放页过渡动画 */
.player-slide-enter-active {
  animation: modalIn 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}

.player-slide-leave-active {
  animation: modalOut 0.28s ease forwards;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.92)
  }
  to {
    opacity: 1;
    transform: scale(1)
  }
}

@keyframes modalOut {
  from {
    opacity: 1;
    transform: scale(1)
  }
  to {
    opacity: 0;
    transform: scale(0.95)
  }
}

/* 迷你播放栏过渡 */
.minibar-slide-enter-active {
  animation: minibarIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.minibar-slide-leave-active {
  animation: minibarIn 0.2s ease reverse;
}

@keyframes minibarIn {
  from {
    opacity: 0;
    transform: translateY(100%)
  }
  to {
    opacity: 1;
    transform: translateY(0)
  }
}

/* 我的收藏面板 */
.fav-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(360px, 100vw);
  z-index: 50;
  background: color-mix(in srgb, var(--t-bg) 94%, white);
  border-left: 1px solid var(--t-border);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.4);
}

.fav-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--t-border);
  flex-shrink: 0;
}

.fav-title {
  font-family: 'Orbitron', monospace;
  font-size: 0.75rem;
  letter-spacing: 3px;
  color: var(--t-label-color);
  flex: 1;
}

.fav-count {
  font-size: 0.78rem;
  color: var(--t-text3);
}

.fav-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--t-text3);
  padding: 4px;
  border-radius: 6px;
  display: flex;
  transition: all 0.2s;
}

.fav-close svg {
  width: 16px;
  height: 16px;
}

.fav-close:hover {
  color: var(--t-text);
  background: rgba(255, 255, 255, 0.08);
}

.fav-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--t-text2);
  font-size: 0.88rem;
}

.fav-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--t-border);
  border-top-color: var(--t-accent1);
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg)
  }
}

.fav-error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff6b6b;
  font-size: 0.85rem;
  padding: 20px;
  text-align: center;
}

.fav-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--t-text3);
  padding: 20px;
  text-align: center;
}

.fav-empty svg {
  width: 52px;
  height: 52px;
  opacity: 0.2;
}

.fav-empty p {
  font-size: 1rem;
  color: var(--t-text2);
}

.fav-empty span {
  font-size: 0.78rem;
  opacity: 0.6;
}

.fav-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  padding-bottom: var(--minibar-h, 0px);
}

.fav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 18px;
  cursor: pointer;
  transition: background 0.18s;
}

.fav-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.fav-item:hover .fav-play-icon {
  opacity: 1;
}

.fav-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--t-audio-bg);
  color: var(--t-audio-clr);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fav-icon svg {
  width: 18px;
  height: 18px;
}

.fav-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.fav-name {
  font-size: 0.85rem;
  color: var(--t-text2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fav-ext {
  font-size: 0.65rem;
  color: var(--t-audio-clr);
  font-family: 'Orbitron', monospace;
  opacity: 0.8;
}

.fav-play-icon {
  width: 14px;
  height: 14px;
  color: var(--t-accent1);
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

/* 收藏面板过渡 */
.fav-slide-enter-active {
  animation: favIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.fav-slide-leave-active {
  animation: favIn 0.22s ease reverse;
}

@keyframes favIn {
  from {
    opacity: 0;
    transform: translateX(40px)
  }
  to {
    opacity: 1;
    transform: translateX(0)
  }
}

@media (max-width: 600px) {
  .fav-panel {
    width: 100vw;
    left: 0;
    right: 0;
    border-left: none;
    border-top: 1px solid var(--t-border);
    /* padding handled by fav-list scroll area */
  }

  @keyframes favIn {
    from {
      opacity: 0;
      transform: translateY(40px)
    }
    to {
      opacity: 1;
      transform: translateY(0)
    }
  }
}
</style>