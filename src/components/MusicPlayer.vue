<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { parseLRC, findCurrentLyricIndex } from '../utils/lrcParser.js'

// =============================================
// 主题系统
// =============================================

/**
 * 主题定义：每个主题包含 CSS 变量覆盖值
 * 通过在 :root 上动态注入 style 实现切换
 */
const THEMES = [
  {
    id: 'cyber',
    name: '赛博霓虹',
    icon: '⚡',
    vars: {
      '--t-bg':           '#050810',
      '--t-bg-card':      'rgba(255,255,255,0.04)',
      '--t-bg-glass':     'rgba(10,15,35,0.85)',
      '--t-accent1':      '#00f2fe',
      '--t-accent2':      '#4facfe',
      '--t-accent3':      '#00f260',
      '--t-accent4':      '#f953c6',
      '--t-text':         '#ffffff',
      '--t-text2':        'rgba(255,255,255,0.55)',
      '--t-text3':        'rgba(255,255,255,0.28)',
      '--t-border':       'rgba(0,242,254,0.18)',
      '--t-orb1':         '#4facfe',
      '--t-orb2':         '#f953c6',
      '--t-orb3':         '#00f260',
      '--t-grid':         'rgba(0,242,254,0.04)',
      '--t-play-bg':      'linear-gradient(135deg,#00f2fe,#4facfe)',
      '--t-lyric-active': '#00f260',
      '--t-lyric-glow':   'rgba(0,242,96,0.45)',
      '--t-progress':     'linear-gradient(90deg,#00f2fe,#4facfe)',
      '--t-disc-bg':      'radial-gradient(circle at 30% 30%,#1e2a4a,#050810 70%)',
      '--t-disc-border':  'rgba(0,242,254,0.2)',
      '--t-disc-center':  'linear-gradient(135deg,#00f2fe,#4facfe)',
      '--t-disc-glow':    'rgba(0,242,254,0.15)',
      '--t-label-color':  'rgba(0,242,254,0.6)',
      '--t-folder-bg':    'rgba(255,185,0,0.1)',
      '--t-folder-clr':   '#ffb900',
      '--t-audio-bg':     'rgba(0,242,254,0.1)',
      '--t-audio-clr':    '#00f2fe',
      '--t-title-grad':   'linear-gradient(90deg,#fff 0%,rgba(0,242,254,0.9) 100%)',
    }
  },
  {
    id: 'sakura',
    name: '樱花物语',
    icon: '🌸',
    vars: {
      '--t-bg':           '#0f0810',
      '--t-bg-card':      'rgba(255,220,240,0.04)',
      '--t-bg-glass':     'rgba(20,8,20,0.88)',
      '--t-accent1':      '#ff85b3',
      '--t-accent2':      '#ffb3d1',
      '--t-accent3':      '#ff4d8d',
      '--t-accent4':      '#ffe066',
      '--t-text':         '#fff0f5',
      '--t-text2':        'rgba(255,200,220,0.6)',
      '--t-text3':        'rgba(255,200,220,0.28)',
      '--t-border':       'rgba(255,133,179,0.2)',
      '--t-orb1':         '#ff85b3',
      '--t-orb2':         '#b060ff',
      '--t-orb3':         '#ffe066',
      '--t-grid':         'rgba(255,133,179,0.04)',
      '--t-play-bg':      'linear-gradient(135deg,#ff4d8d,#ffb3d1)',
      '--t-lyric-active': '#ffe066',
      '--t-lyric-glow':   'rgba(255,224,102,0.45)',
      '--t-progress':     'linear-gradient(90deg,#ff4d8d,#ffb3d1)',
      '--t-disc-bg':      'radial-gradient(circle at 30% 30%,#2d1020,#0f0810 70%)',
      '--t-disc-border':  'rgba(255,133,179,0.25)',
      '--t-disc-center':  'linear-gradient(135deg,#ff85b3,#ffb3d1)',
      '--t-disc-glow':    'rgba(255,133,179,0.18)',
      '--t-label-color':  'rgba(255,133,179,0.7)',
      '--t-folder-bg':    'rgba(255,224,102,0.1)',
      '--t-folder-clr':   '#ffe066',
      '--t-audio-bg':     'rgba(255,133,179,0.1)',
      '--t-audio-clr':    '#ff85b3',
      '--t-title-grad':   'linear-gradient(90deg,#fff0f5 0%,rgba(255,133,179,0.9) 100%)',
    }
  },
  {
    id: 'forest',
    name: '翡翠森林',
    icon: '🌿',
    vars: {
      '--t-bg':           '#060e08',
      '--t-bg-card':      'rgba(180,255,180,0.03)',
      '--t-bg-glass':     'rgba(6,18,8,0.9)',
      '--t-accent1':      '#39d98a',
      '--t-accent2':      '#88f0b8',
      '--t-accent3':      '#00e5a0',
      '--t-accent4':      '#ffd166',
      '--t-text':         '#f0fff4',
      '--t-text2':        'rgba(180,255,210,0.55)',
      '--t-text3':        'rgba(180,255,210,0.28)',
      '--t-border':       'rgba(57,217,138,0.18)',
      '--t-orb1':         '#39d98a',
      '--t-orb2':         '#00b8ff',
      '--t-orb3':         '#ffd166',
      '--t-grid':         'rgba(57,217,138,0.04)',
      '--t-play-bg':      'linear-gradient(135deg,#39d98a,#88f0b8)',
      '--t-lyric-active': '#ffd166',
      '--t-lyric-glow':   'rgba(255,209,102,0.4)',
      '--t-progress':     'linear-gradient(90deg,#39d98a,#88f0b8)',
      '--t-disc-bg':      'radial-gradient(circle at 30% 30%,#0d2516,#060e08 70%)',
      '--t-disc-border':  'rgba(57,217,138,0.22)',
      '--t-disc-center':  'linear-gradient(135deg,#39d98a,#88f0b8)',
      '--t-disc-glow':    'rgba(57,217,138,0.15)',
      '--t-label-color':  'rgba(57,217,138,0.65)',
      '--t-folder-bg':    'rgba(255,209,102,0.1)',
      '--t-folder-clr':   '#ffd166',
      '--t-audio-bg':     'rgba(57,217,138,0.1)',
      '--t-audio-clr':    '#39d98a',
      '--t-title-grad':   'linear-gradient(90deg,#f0fff4 0%,rgba(57,217,138,0.9) 100%)',
    }
  },
  {
    id: 'aurora',
    name: '极光幻境',
    icon: '🌌',
    vars: {
      '--t-bg':           '#04080f',
      '--t-bg-card':      'rgba(120,200,255,0.04)',
      '--t-bg-glass':     'rgba(4,10,20,0.9)',
      '--t-accent1':      '#7b61ff',
      '--t-accent2':      '#00d4ff',
      '--t-accent3':      '#ff6b6b',
      '--t-accent4':      '#ffd60a',
      '--t-text':         '#f0f4ff',
      '--t-text2':        'rgba(180,190,255,0.6)',
      '--t-text3':        'rgba(180,190,255,0.28)',
      '--t-border':       'rgba(123,97,255,0.2)',
      '--t-orb1':         '#7b61ff',
      '--t-orb2':         '#00d4ff',
      '--t-orb3':         '#ff6b6b',
      '--t-grid':         'rgba(123,97,255,0.04)',
      '--t-play-bg':      'linear-gradient(135deg,#7b61ff,#00d4ff)',
      '--t-lyric-active': '#ffd60a',
      '--t-lyric-glow':   'rgba(255,214,10,0.45)',
      '--t-progress':     'linear-gradient(90deg,#7b61ff,#00d4ff)',
      '--t-disc-bg':      'radial-gradient(circle at 30% 30%,#1a1040,#04080f 70%)',
      '--t-disc-border':  'rgba(123,97,255,0.25)',
      '--t-disc-center':  'linear-gradient(135deg,#7b61ff,#00d4ff)',
      '--t-disc-glow':    'rgba(123,97,255,0.18)',
      '--t-label-color':  'rgba(123,97,255,0.7)',
      '--t-folder-bg':    'rgba(255,214,10,0.1)',
      '--t-folder-clr':   '#ffd60a',
      '--t-audio-bg':     'rgba(123,97,255,0.1)',
      '--t-audio-clr':    '#7b61ff',
      '--t-title-grad':   'linear-gradient(90deg,#f0f4ff 0%,rgba(123,97,255,0.9) 100%)',
    }
  },
  {
    id: 'ember',
    name: '烈焰余烬',
    icon: '🔥',
    vars: {
      '--t-bg':           '#0c0500',
      '--t-bg-card':      'rgba(255,120,30,0.04)',
      '--t-bg-glass':     'rgba(18,6,0,0.9)',
      '--t-accent1':      '#ff6b2b',
      '--t-accent2':      '#ffad5e',
      '--t-accent3':      '#ff3030',
      '--t-accent4':      '#ffe14d',
      '--t-text':         '#fff5ee',
      '--t-text2':        'rgba(255,200,150,0.6)',
      '--t-text3':        'rgba(255,200,150,0.28)',
      '--t-border':       'rgba(255,107,43,0.2)',
      '--t-orb1':         '#ff6b2b',
      '--t-orb2':         '#ff3030',
      '--t-orb3':         '#ffe14d',
      '--t-grid':         'rgba(255,107,43,0.04)',
      '--t-play-bg':      'linear-gradient(135deg,#ff3030,#ffad5e)',
      '--t-lyric-active': '#ffe14d',
      '--t-lyric-glow':   'rgba(255,225,77,0.45)',
      '--t-progress':     'linear-gradient(90deg,#ff3030,#ffad5e)',
      '--t-disc-bg':      'radial-gradient(circle at 30% 30%,#2a1005,#0c0500 70%)',
      '--t-disc-border':  'rgba(255,107,43,0.25)',
      '--t-disc-center':  'linear-gradient(135deg,#ff6b2b,#ffad5e)',
      '--t-disc-glow':    'rgba(255,107,43,0.18)',
      '--t-label-color':  'rgba(255,107,43,0.7)',
      '--t-folder-bg':    'rgba(255,225,77,0.1)',
      '--t-folder-clr':   '#ffe14d',
      '--t-audio-bg':     'rgba(255,107,43,0.1)',
      '--t-audio-clr':    '#ff6b2b',
      '--t-title-grad':   'linear-gradient(90deg,#fff5ee 0%,rgba(255,107,43,0.9) 100%)',
    }
  }
]

const currentThemeId = ref('cyber')
const showThemePicker = ref(false)

/** 当前主题对象 */
const currentTheme = computed(() => THEMES.find(t => t.id === currentThemeId.value))

/**
 * 将主题变量对象转为 Vue :style 可用的内联样式对象
 * 绑定到 .app-wrapper 上，确保 scoped CSS 中的 var() 能正确读取
 */
const themeVars = computed(() => currentTheme.value?.vars ?? {})

/** 切换主题：只更新 currentThemeId，themeVars 自动联动 */
const applyTheme = (themeId) => {
  if (!THEMES.find(t => t.id === themeId)) return
  currentThemeId.value = themeId
  showThemePicker.value = false
}

/** 主题容器 ref，用于点击外部关闭面板 */
const themeWrapRef = ref(null)
const onDocClick = (e) => {
  if (themeWrapRef.value && !themeWrapRef.value.contains(e.target)) {
    showThemePicker.value = false
  }
}
watch(showThemePicker, (val) => {
  if (val) document.addEventListener('click', onDocClick, true)
  else document.removeEventListener('click', onDocClick, true)
})

// =============================================
// 状态定义
// =============================================

const allEntries = ref([])
const pathStack = ref([])
const currentEntries = ref([])
const searchQuery = ref('')
const hasFolder = ref(false)
const errorMsg = ref('')

/** 数据源模式：'local' | 'server' */
const sourceMode = ref('local')

// ── 服务器模式相关 ──────────────────────────
/** 服务器地址输入值 */
const serverUrl = ref('http://localhost:3000')
/** 是否显示服务器连接面板 */
const showServerPanel = ref(false)
/** 服务器加载状态 */
const serverLoading = ref(false)
/** 服务器错误信息 */
const serverError = ref('')
/** 服务器原始树数据（用于目录导航） */
const serverTree = ref(null)

const playlist = ref([])
const currentIndex = ref(-1)
const showPlayer = ref(false)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.8)
const isDragging = ref(false)
const favorites = ref(new Set())

/** 手机端播放器 tab: 'player' | 'lyrics' */
const mobileTab = ref('player')

const lyrics = ref([])
const currentLyricIndex = ref(-1)
const albumRotation = ref(0)
let rotationRafId = null
let lastTimestamp = null

const audioRef = ref(null)
const lyricsContainerRef = ref(null)
const mobileLyricsRef = ref(null)
const fileInputRef = ref(null)
const progressRef = ref(null)
const mobileProgressRef = ref(null)

// =============================================
// 计算属性
// =============================================

const currentSong = computed(() => {
  if (currentIndex.value < 0 || currentIndex.value >= playlist.value.length) return null
  return playlist.value[currentIndex.value]
})

const songTitle = computed(() => {
  if (!currentSong.value) return '未知歌曲'
  return currentSong.value.name.replace(/\.[^.]+$/, '')
})

const artistName = computed(() => {
  const title = songTitle.value
  const dashIdx = title.indexOf(' - ')
  return dashIdx > 0 ? title.substring(0, dashIdx) : '未知艺术家'
})

const displayTitle = computed(() => {
  const title = songTitle.value
  const dashIdx = title.indexOf(' - ')
  return dashIdx > 0 ? title.substring(dashIdx + 3) : title
})

const filteredEntries = computed(() => {
  if (!searchQuery.value.trim()) return currentEntries.value
  const q = searchQuery.value.toLowerCase()
  return currentEntries.value.filter(e => e.name.toLowerCase().includes(q))
})

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

const formatTime = (sec) => {
  if (isNaN(sec) || sec < 0) return '00:00'
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

// =============================================
// 文件系统操作
// =============================================

const AUDIO_EXTS = new Set(['.mp3','.flac','.wav','.aac','.ogg','.m4a','.opus','.wma'])
const isAudioFile = (name) => AUDIO_EXTS.has(name.substring(name.lastIndexOf('.')).toLowerCase())
const isLrcFile   = (name) => name.toLowerCase().endsWith('.lrc')

const handleFolderSelect = (event) => {
  const files = Array.from(event.target.files)
  if (!files.length) return
  errorMsg.value = ''
  buildVirtualFS(files)
  hasFolder.value = true
  pathStack.value = []
  navigateToPath([])
}

const buildVirtualFS = (files) => {
  const root = { name: 'root', type: 'folder', children: new Map(), path: [] }
  files.forEach(file => {
    const parts = file.webkitRelativePath.split('/')
    let cur = root
    for (let i = 1; i < parts.length - 1; i++) {
      if (!cur.children.has(parts[i])) {
        cur.children.set(parts[i], {
          name: parts[i], type: 'folder', children: new Map(), path: parts.slice(0, i+1)
        })
      }
      cur = cur.children.get(parts[i])
    }
    const fn = parts[parts.length - 1]
    if (isAudioFile(fn) || isLrcFile(fn)) {
      cur.children.set(fn, {
        name: fn, type: 'file', fileObj: file, path: parts,
        isAudio: isAudioFile(fn), isLrc: isLrcFile(fn)
      })
    }
  })
  allEntries.value = root
}

const navigateToPath = (pathParts) => {
  let node = allEntries.value
  for (const p of pathParts) {
    if (node.children?.has(p)) node = node.children.get(p)
    else break
  }
  if (!node?.children) { currentEntries.value = []; return }

  const folders = [], audioFiles = []
  node.children.forEach(e => {
    if (e.type === 'folder' && hasAudioInFolder(e)) folders.push(e)
    else if (e.isAudio) audioFiles.push(e)
  })
  folders.sort((a, b) => a.name.localeCompare(b.name))
  audioFiles.sort((a, b) => a.name.localeCompare(b.name))
  currentEntries.value = [...folders, ...audioFiles]

  if (pathParts.length > 0) {
    pathStack.value = pathParts.map((name, i) => ({ name, path: pathParts.slice(0, i+1) }))
  }
}

const hasAudioInFolder = (folder) => {
  if (!folder.children) return false
  for (const [, e] of folder.children) {
    if (e.isAudio) return true
    if (e.type === 'folder' && hasAudioInFolder(e)) return true
  }
  return false
}

const enterFolder = (entry) => {
  searchQuery.value = ''
  if (sourceMode.value === 'server') {
    // server 路径是从根节点名开始的完整数组，需去掉根节点名
    navigateToServerPath(entry.path.slice(1))
  } else {
    navigateToPath(entry.path.slice(1))
  }
}

const goBack = () => {
  searchQuery.value = ''
  const navigate = sourceMode.value === 'server' ? navigateToServerPath : navigateToPath
  if (pathStack.value.length <= 1) { pathStack.value = []; navigate([]) }
  else navigate(pathStack.value[pathStack.value.length - 2].path)
}

const breadcrumbNav = (item) => {
  searchQuery.value = ''
  if (sourceMode.value === 'server') navigateToServerPath(item.path)
  else navigateToPath(item.path)
}

const goRoot = () => {
  searchQuery.value = ''
  pathStack.value = []
  if (sourceMode.value === 'server') navigateToServerPath([])
  else navigateToPath([])
}

// =============================================
// 服务器模式：连接 & 文件树转换
// =============================================

/**
 * 连接服务器，拉取 /api/files 并构建与本地模式兼容的 entry 树
 */
const connectServer = async () => {
  const base = serverUrl.value.replace(/\/$/, '')
  serverLoading.value = true
  serverError.value = ''
  try {
    const res = await fetch(`${base}/api/files?flat=0`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data.success) throw new Error(data.error || '服务器返回失败')

    // 将服务器树递归转换为与本地 entry 兼容的结构
    serverTree.value = convertServerTree(data.tree, [])
    allEntries.value = serverTree.value
    hasFolder.value = true
    sourceMode.value = 'server'
    showServerPanel.value = false
    pathStack.value = []
    navigateToServerPath([])
  } catch (e) {
    serverError.value = `连接失败：${e.message}`
  } finally {
    serverLoading.value = false
  }
}

/**
 * 递归将服务器返回的节点转换为 entry 格式
 * 与本地 buildVirtualFS 产出的结构保持兼容
 * @param {object} node    - 服务器节点
 * @param {string[]} parentPath - 父路径数组（面包屑用）
 */
const convertServerTree = (node, parentPath) => {
  const currentPath = [...parentPath, node.name]
  if (node.type === 'folder') {
    return {
      type: 'folder',
      name: node.name,
      path: currentPath,
      source: 'server',
      children: (node.children || []).map(child => convertServerTree(child, currentPath))
    }
  } else {
    return {
      type: 'file',
      name: node.name,
      ext: node.ext,
      relativePath: node.relativePath,
      url: node.url,
      lrc: node.lrc ?? null,   // 服务端已匹配好的歌词下载 url，null 表示无对应 lrc
      isAudio: node.isAudio,
      isLrc: node.isLrc,
      source: 'server',
      path: currentPath,
    }
  }
}

/**
 * 服务器模式下通过路径数组（面包屑）导航目录
 * 直接递归 serverTree 找到对应节点，再展示其子项
 */
const navigateToServerPath = (pathParts) => {
  let node = serverTree.value
  for (const part of pathParts) {
    const child = node?.children?.find(c => c.name === part)
    if (!child) break
    node = child
  }
  if (!node) { currentEntries.value = []; return }

  const items = (node.children || []).filter(e => {
    if (e.type === 'folder') return hasAudioInServerFolder(e)
    return e.isAudio
  })
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  currentEntries.value = items

  if (pathParts.length > 0) {
    pathStack.value = pathParts.map((name, i) => ({ name, path: pathParts.slice(0, i + 1) }))
  } else {
    pathStack.value = []
  }
}

const hasAudioInServerFolder = (folder) => {
  if (!folder.children) return false
  return folder.children.some(e =>
      (e.type === 'file' && e.isAudio) ||
      (e.type === 'folder' && hasAudioInServerFolder(e))
  )
}

/** 断开服务器，回到欢迎页 */
const disconnectServer = () => {
  sourceMode.value = 'local'
  hasFolder.value = false
  serverTree.value = null
  allEntries.value = []
  currentEntries.value = []
  pathStack.value = []
}

// =============================================
// 播放控制
// =============================================

const playAudio = async (entry) => {
  const audioList = currentEntries.value.filter(e => e.type === 'file' && e.isAudio)
  playlist.value = audioList
  const idx = audioList.findIndex(e => e.name === entry.name)
  currentIndex.value = idx >= 0 ? idx : 0
  showPlayer.value = true
  mobileTab.value = 'player'
  await loadAndPlay(currentIndex.value)
}

const loadAndPlay = async (index) => {
  if (index < 0 || index >= playlist.value.length) return
  currentIndex.value = index
  const song = playlist.value[index]
  const audio = audioRef.value

  // 释放旧的 blob URL（仅本地模式产生）
  if (audio.src?.startsWith('blob:')) URL.revokeObjectURL(audio.src)

  if (song.source === 'server') {
    // 服务器模式：直接使用后端返回的完整 url
    audio.src = song.url
  } else {
    // 本地模式：从 File 对象生成临时 blob URL
    audio.src = URL.createObjectURL(song.fileObj)
  }

  audio.volume = volume.value
  try {
    await audio.play()
    isPlaying.value = true
    startAlbumRotation()
  } catch (e) {
    console.error('播放失败:', e)
    errorMsg.value = '音频播放失败，请检查文件格式'
  }
  await loadLyrics(song)
}

const loadLyrics = async (song) => {
  lyrics.value = []
  currentLyricIndex.value = -1
  const lrcName = song.name.replace(/\.[^.]+$/, '') + '.lrc'

  if (song.source === 'server') {
    // 服务端已在 /api/files 响应中匹配好 lrc 字段，直接 fetch
    if (song.lrc) {
      try {
        const text = await fetch(song.lrc).then(r => r.text())
        lyrics.value = parseLRC(text)
      } catch (e) { console.error('LRC fetch 失败:', e) }
    }
  } else {
    // 本地模式：从虚拟文件树中找同名 .lrc 的 File 对象
    const dirPath = song.path.slice(1, -1)
    let node = allEntries.value
    for (const p of dirPath) {
      if (node.children?.has(p)) node = node.children.get(p)
      else { node = null; break }
    }
    if (node?.children?.has(lrcName)) {
      try { lyrics.value = parseLRC(await node.children.get(lrcName).fileObj.text()) }
      catch (e) { console.error('LRC 读取失败:', e) }
    }
  }
}



const togglePlay = () => {
  const audio = audioRef.value
  if (!audio) return
  if (isPlaying.value) { audio.pause(); isPlaying.value = false; stopAlbumRotation() }
  else { audio.play(); isPlaying.value = true; startAlbumRotation() }
}

const prevSong = () => {
  if (!playlist.value.length) return
  loadAndPlay((currentIndex.value - 1 + playlist.value.length) % playlist.value.length)
}
const nextSong = () => {
  if (!playlist.value.length) return
  loadAndPlay((currentIndex.value + 1) % playlist.value.length)
}

const onAudioEnded = () => nextSong()

const onTimeUpdate = () => {
  if (!isDragging.value) currentTime.value = audioRef.value?.currentTime || 0
  updateLyric()
}
const onLoadedMetadata = () => { duration.value = audioRef.value?.duration || 0 }

const updateLyric = () => {
  if (!lyrics.value.length) return
  const newIdx = findCurrentLyricIndex(lyrics.value, currentTime.value)
  if (newIdx !== currentLyricIndex.value) {
    currentLyricIndex.value = newIdx
    nextTick(() => {
      scrollLyricToCenter(lyricsContainerRef.value, newIdx)
      scrollLyricToCenter(mobileLyricsRef.value, newIdx)
    })
  }
}

const scrollLyricToCenter = (container, index) => {
  if (!container || index < 0) return
  const el = container.querySelector('.lyric-line.active')
  if (!el) return
  container.scrollTo({ top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' })
}

// =============================================
// 进度条（鼠标 + 触摸）
// =============================================

const getProgressRatio = (event, el) => {
  const rect = el.getBoundingClientRect()
  const x = event.touches ? event.touches[0].clientX : event.clientX
  return Math.max(0, Math.min(1, (x - rect.left) / rect.width))
}

const seekTo = (event) => {
  const el = progressRef.value || mobileProgressRef.value
  if (!el) return
  const ratio = getProgressRatio(event, el)
  audioRef.value.currentTime = ratio * duration.value
  currentTime.value = ratio * duration.value
}

const startDrag = (event) => {
  isDragging.value = true
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDragMove, { passive: false })
  document.addEventListener('touchend', stopDrag)
  onDragMove(event)
}

const onDragMove = (event) => {
  if (!isDragging.value) return
  if (event.cancelable) event.preventDefault()
  const el = progressRef.value || mobileProgressRef.value
  if (!el) return
  currentTime.value = getProgressRatio(event, el) * duration.value
}

const stopDrag = () => {
  if (isDragging.value) { audioRef.value.currentTime = currentTime.value; isDragging.value = false }
  ['mousemove','mouseup'].forEach(e => document.removeEventListener(e, e === 'mousemove' ? onDragMove : stopDrag))
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', stopDrag)
}

const onVolumeChange = (e) => {
  volume.value = parseFloat(e.target.value)
  if (audioRef.value) audioRef.value.volume = volume.value
}

// =============================================
// 专辑封面旋转
// =============================================

const startAlbumRotation = () => {
  if (rotationRafId) return
  lastTimestamp = null
  const animate = (ts) => {
    if (!lastTimestamp) lastTimestamp = ts
    albumRotation.value = (albumRotation.value + (ts - lastTimestamp) * 0.006) % 360
    lastTimestamp = ts
    rotationRafId = requestAnimationFrame(animate)
  }
  rotationRafId = requestAnimationFrame(animate)
}
const stopAlbumRotation = () => {
  if (rotationRafId) { cancelAnimationFrame(rotationRafId); rotationRafId = null; lastTimestamp = null }
}

// =============================================
// 收藏
// =============================================

const toggleFavorite = () => {
  if (!currentSong.value) return
  const n = currentSong.value.name
  if (favorites.value.has(n)) favorites.value.delete(n)
  else favorites.value.add(n)
}
const isFavorite = computed(() => currentSong.value ? favorites.value.has(currentSong.value.name) : false)

// =============================================
// 关闭播放器
// =============================================

const closePlayer = () => {
  showPlayer.value = false
  if (audioRef.value) { audioRef.value.pause(); isPlaying.value = false; stopAlbumRotation() }
}

// =============================================
// 生命周期
// =============================================

onMounted(() => {
  // currentThemeId 默认 'cyber'，themeVars 自动生效，无需手动调用
})

onUnmounted(() => {
  stopAlbumRotation()
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', stopDrag)
})
</script>

<template>
  <div class="app-wrapper" :style="themeVars">
    <!-- 动态背景 -->
    <div class="bg-orb orb1"></div>
    <div class="bg-orb orb2"></div>
    <div class="bg-orb orb3"></div>
    <div class="bg-grid"></div>

    <!-- ========== 文件浏览器（占满全页）========== -->
    <div class="browser-container">

      <!-- Header -->
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
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input v-model="searchQuery" class="search-input" type="text" placeholder="搜索文件..."/>
          </div>

          <!-- 数据源徽标（已加载时显示）-->
          <div v-if="hasFolder" class="source-badge" :class="sourceMode">
            <svg v-if="sourceMode === 'server'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{{ sourceMode === 'server' ? '服务器' : '本地' }}</span>
            <button class="badge-close" @click="sourceMode === 'server' ? disconnectServer() : (hasFolder = false)" title="断开">✕</button>
          </div>

          <!-- 主题切换 -->
          <div class="theme-wrap" ref="themeWrapRef">
            <button class="btn-theme" @click="showThemePicker = !showThemePicker">
              <span class="theme-icon">{{ currentTheme.icon }}</span>
              <span class="theme-label">主题</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   class="theme-chevron" :class="{ open: showThemePicker }">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            <Transition name="dropdown">
              <div v-if="showThemePicker" class="theme-dropdown">
                <div class="dropdown-title">选择主题</div>
                <div
                    v-for="t in THEMES" :key="t.id"
                    class="theme-opt" :class="{ active: t.id === currentThemeId }"
                    @click="applyTheme(t.id)"
                >
                  <span>{{ t.icon }}</span>
                  <span class="opt-name">{{ t.name }}</span>
                  <svg v-if="t.id === currentThemeId" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="opt-check">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </header>



      <!-- 欢迎页 -->
      <div v-if="!hasFolder" class="welcome-screen">
        <div class="welcome-inner">
          <div class="vinyl-disc">
            <div class="vinyl-groove" v-for="i in 5" :key="i"></div>
            <div class="vinyl-center"></div>
          </div>
          <h1 class="welcome-title">开始你的音乐之旅</h1>
          <p class="welcome-sub">选择本地文件夹，或连接音乐服务器</p>

          <!-- 两个入口按钮 -->
          <div class="welcome-btns">
            <button class="btn-select" @click="fileInputRef.click()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              本地文件夹
            </button>
            <button class="btn-server" @click="showServerPanel = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
                <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
              </svg>
              连接服务器
            </button>
          </div>

          <!-- 服务器连接面板 -->
          <div v-if="showServerPanel" class="server-panel">
            <div class="sp-title">服务器地址</div>
            <div class="sp-row">
              <input
                  v-model="serverUrl"
                  class="sp-input"
                  placeholder="http://localhost:3000"
                  @keydown.enter="connectServer"
              />
              <button class="sp-btn" :disabled="serverLoading" @click="connectServer">
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

      <!-- 文件浏览器 -->
      <div v-else class="file-browser">
        <nav class="breadcrumb">
          <span class="crumb crumb-root" @click="goRoot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            根目录
          </span>
          <template v-for="(item, i) in pathStack" :key="i">
            <span class="crumb-sep">›</span>
            <span class="crumb" :class="{ 'crumb-active': i === pathStack.length - 1 }" @click="breadcrumbNav(item)">{{ item.name }}</span>
          </template>
        </nav>

        <div class="toolbar">
          <button v-if="pathStack.length > 0" class="btn-toolbar" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
            返回
          </button>
          <!-- 本地模式显示更换文件夹；服务器模式显示刷新 -->
          <button v-if="sourceMode === 'local'" class="btn-toolbar" @click="fileInputRef.click()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="btn-text">更换文件夹</span>
          </button>
          <button v-else class="btn-toolbar" @click="connectServer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.18-5.3"/>
            </svg>
            <span class="btn-text">刷新</span>
          </button>
          <span class="item-count">{{ filteredEntries.length }} 个项目</span>
        </div>

        <div class="file-grid" v-if="filteredEntries.length > 0">
          <div
              v-for="entry in filteredEntries" :key="entry.name"
              class="file-card"
              :class="entry.type === 'folder' ? 'folder-card' : 'audio-card'"
              @click="entry.type === 'folder' ? enterFolder(entry) : playAudio(entry)"
          >
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
          <p>{{ searchQuery ? '没有找到匹配的文件' : '此目录没有音频文件' }}</p>
        </div>
      </div>
    </div>

    <input ref="fileInputRef" type="file" webkitdirectory multiple style="display:none" @change="handleFolderSelect"/>

    <!-- ========== 全屏播放器 ========== -->
    <Transition name="player-modal">
      <div v-if="showPlayer" class="player-modal">
        <div class="player-inner">

          <button class="btn-close" @click="closePlayer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <!-- 桌面左侧 -->
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
                <span>{{ formatTime(currentTime) }}</span>
                <span>{{ formatTime(duration) }}</span>
              </div>
              <div class="progress-bar" ref="progressRef"
                   @click="seekTo" @mousedown="startDrag" @touchstart.prevent="startDrag">
                <div class="progress-bg"></div>
                <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
                <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
              </div>
            </div>

            <div class="controls">
              <button class="ctrl-btn ctrl-fav" @click="toggleFavorite" :class="{ active: isFavorite }">
                <svg viewBox="0 0 24 24" :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
              <button class="ctrl-btn ctrl-prev" @click="prevSong">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="19,20 9,12 19,4"/>
                  <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
              </button>
              <button class="ctrl-btn ctrl-play" @click="togglePlay">
                <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21"/>
                </svg>
              </button>
              <button class="ctrl-btn ctrl-next" @click="nextSong">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,4 15,12 5,20"/>
                  <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
              </button>
              <div class="volume-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="vol-icon">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                <input type="range" min="0" max="1" step="0.01" :value="volume" class="volume-slider" @input="onVolumeChange"/>
              </div>
            </div>

            <div class="playlist-dots">
              <span
                  v-for="(_, i) in playlist.slice(Math.max(0,currentIndex-3), Math.min(playlist.length,currentIndex+4))"
                  :key="i"
                  class="dot"
                  :class="{ active: Math.max(0,currentIndex-3)+i === currentIndex }"
                  @click="loadAndPlay(Math.max(0,currentIndex-3)+i)"
              ></span>
            </div>
          </div>

          <!-- 桌面右侧：歌词 -->
          <div class="player-right desktop-lyrics">
            <div class="lyrics-header">
              <span class="lyrics-label">LYRICS</span>
              <div class="lyrics-deco"></div>
            </div>
            <div v-if="lyrics.length > 0" class="lyrics-container" ref="lyricsContainerRef">
              <div class="lyrics-spacer"></div>
              <div
                  v-for="(line, i) in lyrics" :key="i"
                  class="lyric-line"
                  :class="{ active: i === currentLyricIndex, prev: i < currentLyricIndex, next: i > currentLyricIndex }"
                  @click="() => { audioRef.currentTime = line.time; currentTime = line.time }"
              >{{ line.text || '♪' }}</div>
              <div class="lyrics-spacer"></div>
            </div>
            <div v-else class="no-lyrics">
              <div class="no-lyrics-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
              <p>暂无歌词</p>
              <span>将同名 .lrc 文件放在歌曲同目录下</span>
            </div>
          </div>

          <!-- 手机端：Tab 布局 -->
          <div class="mobile-player">
            <div class="mobile-tabs">
              <button class="m-tab" :class="{ active: mobileTab === 'player' }" @click="mobileTab = 'player'">播放</button>
              <button class="m-tab" :class="{ active: mobileTab === 'lyrics' }" @click="mobileTab = 'lyrics'">歌词</button>
            </div>

            <!-- 手机播放面板 -->
            <div v-show="mobileTab === 'player'" class="m-content">
              <div class="song-info">
                <h1 class="song-title m-title">{{ displayTitle }}</h1>
                <p class="song-artist">{{ artistName }}</p>
              </div>
              <div class="album-wrap m-album">
                <div class="album-ring ring-outer"></div>
                <div class="album-ring ring-mid"></div>
                <div class="album-disc" :style="{ transform: `rotate(${albumRotation}deg)` }">
                  <div class="disc-grooves"><div class="disc-groove" v-for="i in 8" :key="i"></div></div>
                  <div class="disc-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M9 18V5l12-2v13"/>
                      <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                    </svg>
                  </div>
                </div>
                <div class="album-glow" :class="{ active: isPlaying }"></div>
              </div>
              <div class="progress-section">
                <div class="time-display">
                  <span>{{ formatTime(currentTime) }}</span>
                  <span>{{ formatTime(duration) }}</span>
                </div>
                <div class="progress-bar" ref="mobileProgressRef"
                     @click="seekTo" @mousedown="startDrag" @touchstart.prevent="startDrag">
                  <div class="progress-bg"></div>
                  <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
                  <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
                </div>
              </div>
              <div class="controls m-controls">
                <button class="ctrl-btn ctrl-fav" @click="toggleFavorite" :class="{ active: isFavorite }">
                  <svg viewBox="0 0 24 24" :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
                <button class="ctrl-btn ctrl-prev" @click="prevSong">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="19,20 9,12 19,4"/>
                    <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
                  </svg>
                </button>
                <button class="ctrl-btn ctrl-play" @click="togglePlay">
                  <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                </button>
                <button class="ctrl-btn ctrl-next" @click="nextSong">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,4 15,12 5,20"/>
                    <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
                  </svg>
                </button>
                <div class="volume-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="vol-icon">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                  <input type="range" min="0" max="1" step="0.01" :value="volume" class="volume-slider" @input="onVolumeChange"/>
                </div>
              </div>
            </div>

            <!-- 手机歌词面板 -->
            <div v-show="mobileTab === 'lyrics'" class="m-content m-lyrics-content">
              <div class="lyrics-header">
                <span class="lyrics-label">LYRICS</span>
                <div class="lyrics-deco"></div>
              </div>
              <div v-if="lyrics.length > 0" class="lyrics-container m-lyrics-scroll" ref="mobileLyricsRef">
                <div class="lyrics-spacer"></div>
                <div
                    v-for="(line, i) in lyrics" :key="i"
                    class="lyric-line"
                    :class="{ active: i === currentLyricIndex, prev: i < currentLyricIndex, next: i > currentLyricIndex }"
                >{{ line.text || '♪' }}</div>
                <div class="lyrics-spacer"></div>
              </div>
              <div v-else class="no-lyrics">
                <div class="no-lyrics-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                  </svg>
                </div>
                <p>暂无歌词</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Transition>

    <audio ref="audioRef"
           @timeupdate="onTimeUpdate"
           @loadedmetadata="onLoadedMetadata"
           @ended="onAudioEnded">
    </audio>
  </div>
</template>

<style scoped>
/* 所有主题变量通过 :style="themeVars" 内联绑定到 .app-wrapper，scoped CSS 直接消费 var(--t-*) */

/* =============================================
   基础
   ============================================= */
.app-wrapper {
  position: relative;
  width: 100vw; height: 100vh;
  background: var(--t-bg);
  overflow: hidden;
  font-family: 'Rajdhani','PingFang SC','Microsoft YaHei',sans-serif;
  color: var(--t-text);
  transition: background 0.5s;
}

/* 背景光球 */
.bg-orb {
  position: absolute; border-radius: 50%;
  filter: blur(90px); opacity: 0.14;
  pointer-events: none;
  transition: background 0.6s;
}
.orb1 {
  width: 55vw; height: 55vw;
  background: radial-gradient(circle, var(--t-orb1), transparent);
  top: -18vw; left: -14vw;
  animation: orb1Float 14s ease-in-out infinite;
}
.orb2 {
  width: 45vw; height: 45vw;
  background: radial-gradient(circle, var(--t-orb2), transparent);
  bottom: -14vw; right: -10vw;
  animation: orb1Float 14s ease-in-out infinite -5s;
}
.orb3 {
  width: 36vw; height: 36vw;
  background: radial-gradient(circle, var(--t-orb3), transparent);
  top: 50%; left: 50%;
  opacity: 0.08;
  animation: orb3Float 16s ease-in-out infinite;
}
@keyframes orb1Float {
  0%,100% { transform: translate(0,0); }
  40% { transform: translate(2vw,-2vw); }
  70% { transform: translate(-1.5vw,1.8vw); }
}
@keyframes orb3Float {
  0%,100% { transform: translate(-50%,-50%); }
  50% { transform: translate(calc(-50% + 1vw),calc(-50% + 1.5vw)); }
}

.bg-grid {
  position: absolute; inset: 0;
  background-image:
      linear-gradient(var(--t-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--t-grid) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}

/* =============================================
   文件浏览器 — 占据全屏
   ============================================= */
.browser-container {
  position: absolute; inset: 0; z-index: 1;
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* Header */
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; height: 62px; min-height: 62px;
  border-bottom: 1px solid var(--t-border);
  background: rgba(0,0,0,0.3); backdrop-filter: blur(20px);
  flex-shrink: 0; gap: 16px;
  transition: border-color 0.4s;
}

.logo-area { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.logo-icon {
  width: 28px; height: 28px;
  color: var(--t-accent1);
  filter: drop-shadow(0 0 6px var(--t-accent1));
  transition: color 0.4s, filter 0.4s;
}
.logo-text {
  font-family: 'Orbitron', monospace, sans-serif;
  font-size: 1.12rem; font-weight: 700; letter-spacing: 3px;
  color: var(--t-text);
}
.logo-accent { color: var(--t-accent1); transition: color 0.4s; }

.header-right { display: flex; align-items: center; gap: 12px; flex: 1; justify-content: flex-end; }

.search-wrap { position: relative; width: min(260px, 32vw); }
.search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  width: 14px; height: 14px; color: var(--t-text3); pointer-events: none;
}
.search-input {
  width: 100%; padding: 8px 14px 8px 36px;
  background: rgba(255,255,255,0.05); border: 1px solid var(--t-border);
  border-radius: 999px; color: var(--t-text); font-family: inherit; font-size: 0.88rem;
  outline: none; transition: border-color 0.3s, box-shadow 0.3s;
}
.search-input::placeholder { color: var(--t-text3); }
.search-input:focus { border-color: var(--t-accent1); box-shadow: 0 0 16px color-mix(in srgb, var(--t-accent1) 20%, transparent); }

/* 主题切换 */
.theme-wrap { position: relative; }
.btn-theme {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 20px;
  background: rgba(255,255,255,0.06); border: 1px solid var(--t-border);
  color: var(--t-text2); font-family: inherit; font-size: 0.87rem;
  cursor: pointer; white-space: nowrap; transition: all 0.25s;
}
.btn-theme:hover { border-color: var(--t-accent1); color: var(--t-text); }
.theme-icon { font-size: 1rem; }
.theme-label { font-weight: 500; }
.theme-chevron { width: 14px; height: 14px; transition: transform 0.25s; }
.theme-chevron.open { transform: rotate(180deg); }

.theme-dropdown {
  position: absolute; top: calc(100% + 8px); right: 0;
  min-width: 175px; z-index: 300;
  background: color-mix(in srgb, var(--t-bg) 92%, white);
  border: 1px solid var(--t-border); border-radius: 14px;
  padding: 8px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  backdrop-filter: blur(20px);
}
.dropdown-title {
  font-size: 0.65rem; letter-spacing: 2px; text-transform: uppercase;
  color: var(--t-text3); padding: 4px 10px 8px;
  font-family: 'Orbitron', monospace;
}
.theme-opt {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 12px; border-radius: 8px; cursor: pointer;
  color: var(--t-text2); font-size: 0.9rem; transition: background 0.2s;
}
.theme-opt:hover { background: rgba(255,255,255,0.07); color: var(--t-text); }
.theme-opt.active { background: color-mix(in srgb, var(--t-accent1) 12%, transparent); color: var(--t-accent1); }
.opt-name { flex: 1; font-weight: 500; }
.opt-check { width: 13px; height: 13px; color: var(--t-accent1); }

.dropdown-enter-active { animation: dropDown 0.2s ease; }
.dropdown-leave-active { animation: dropDown 0.15s ease reverse; }
@keyframes dropDown {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}


/* =============================================
   欢迎页
   ============================================= */
.welcome-screen { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; }
.welcome-inner { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; max-width: 400px; }

.vinyl-disc {
  width: min(180px, 40vw); height: min(180px, 40vw);
  border-radius: 50%;
  background: radial-gradient(circle,#1a1a2e 30%,#0a0a15 60%,#1a1a2e 100%);
  border: 2px solid var(--t-border);
  position: relative; display: flex; align-items: center; justify-content: center;
  animation: vinylSpin 8s linear infinite;
  box-shadow: 0 0 50px color-mix(in srgb, var(--t-accent2) 20%, transparent);
}
@keyframes vinylSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.vinyl-groove { position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,0.05); }
.vinyl-groove:nth-child(1) { width: 86%; height: 86%; }
.vinyl-groove:nth-child(2) { width: 72%; height: 72%; }
.vinyl-groove:nth-child(3) { width: 57%; height: 57%; }
.vinyl-groove:nth-child(4) { width: 40%; height: 40%; }
.vinyl-groove:nth-child(5) { width: 24%; height: 24%; }
.vinyl-center { width: 28px; height: 28px; border-radius: 50%; background: var(--t-play-bg); box-shadow: 0 0 14px var(--t-disc-glow); z-index: 1; }

.welcome-title {
  font-family: 'Orbitron', monospace, sans-serif;
  font-size: clamp(1.2rem, 4vw, 2rem); font-weight: 700;
  background: var(--t-title-grad);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.welcome-sub { color: var(--t-text2); font-size: 0.93rem; }

.btn-select {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 30px; border-radius: 999px;
  background: color-mix(in srgb, var(--t-accent1) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--t-accent1) 50%, transparent);
  color: var(--t-accent1);
  font-family: 'Orbitron', monospace, sans-serif; font-size: 0.78rem; letter-spacing: 2px;
  cursor: pointer; transition: all 0.3s;
  box-shadow: 0 0 20px color-mix(in srgb, var(--t-accent1) 10%, transparent);
}
.btn-select svg { width: 16px; height: 16px; }
.btn-select:hover {
  background: color-mix(in srgb, var(--t-accent1) 24%, transparent);
  border-color: var(--t-accent1);
  box-shadow: 0 0 38px color-mix(in srgb, var(--t-accent1) 25%, transparent);
  transform: scale(1.03);
}
.error-msg { color: #ff5555; font-size: 0.85rem; }

/* =============================================
   文件浏览器
   ============================================= */
.file-browser {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; padding: 0 22px; min-height: 0;
}

.breadcrumb {
  display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
  padding: 12px 0 6px; flex-shrink: 0;
}
.crumb {
  color: var(--t-text2); font-size: 0.84rem; cursor: pointer;
  display: flex; align-items: center; gap: 4px;
  padding: 2px 6px; border-radius: 4px; transition: color 0.2s;
  max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.crumb:hover { color: var(--t-accent1); }
.crumb-active { color: var(--t-accent1); cursor: default; }
.crumb-sep { color: var(--t-text3); font-size: 1rem; }

.toolbar { display: flex; align-items: center; gap: 10px; padding: 8px 0 12px; flex-shrink: 0; }
.btn-toolbar {
  display: flex; align-items: center; gap: 5px;
  padding: 7px 14px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: var(--t-text2);
  font-family: inherit; font-size: 0.87rem;
  cursor: pointer; white-space: nowrap; transition: all 0.2s;
}
.btn-toolbar svg { width: 13px; height: 13px; flex-shrink: 0; }
.btn-toolbar:hover { border-color: var(--t-accent1); color: var(--t-accent1); background: color-mix(in srgb, var(--t-accent1) 8%, transparent); }
.item-count { margin-left: auto; color: var(--t-text3); font-size: 0.82rem; }

.file-grid {
  flex: 1; overflow-y: auto; min-height: 0;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 12px; padding-bottom: 20px; align-content: start;
}

.file-card {
  position: relative; display: flex; flex-direction: column;
  align-items: center; gap: 7px; padding: 15px 10px 11px;
  background: var(--t-bg-card); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; cursor: pointer; text-align: center; transition: all 0.22s;
}
.file-card:hover {
  background: color-mix(in srgb, var(--t-accent1) 6%, transparent);
  border-color: color-mix(in srgb, var(--t-accent1) 35%, transparent);
  transform: translateY(-2px);
  box-shadow: 0 6px 22px color-mix(in srgb, var(--t-accent1) 10%, transparent);
}

.card-icon {
  width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;
  border-radius: 10px; position: relative; flex-shrink: 0;
}
.folder-icon { background: var(--t-folder-bg); color: var(--t-folder-clr); }
.audio-icon  { background: var(--t-audio-bg);  color: var(--t-audio-clr);  }
.card-icon svg { width: 22px; height: 22px; }

.card-name {
  color: var(--t-text2); font-size: 0.74rem; font-weight: 500; line-height: 1.3;
  word-break: break-all; display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden; width: 100%;
}
.card-ext {
  position: absolute; top: 8px; right: 8px;
  font-size: 0.57rem; padding: 1px 4px;
  background: var(--t-audio-bg); border-radius: 3px;
  color: var(--t-audio-clr); font-family: 'Orbitron', monospace;
}

.playing-waves { position: absolute; bottom: -5px; right: -5px; display: flex; align-items: flex-end; gap: 2px; height: 13px; }
.playing-waves span { width: 3px; background: var(--t-accent3); border-radius: 2px; animation: waveAnim 0.8s ease-in-out infinite; }
.playing-waves span:nth-child(2) { animation-delay: 0.15s; }
.playing-waves span:nth-child(3) { animation-delay: 0.3s; }
@keyframes waveAnim { 0%,100% { height: 3px; } 50% { height: 11px; } }

.empty-hint { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: var(--t-text3); }
.empty-hint svg { width: 42px; height: 42px; }

/* =============================================
   全屏播放器
   ============================================= */
.player-modal {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: stretch;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(18px);
}
.player-modal-enter-active { animation: modalIn 0.42s cubic-bezier(0.16,1,0.3,1); }
.player-modal-leave-active { animation: modalOut 0.28s ease forwards; }
@keyframes modalIn  { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
@keyframes modalOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); } }

.player-inner {
  position: relative; width: 100%; height: 100%;
  display: flex;
  background:
      radial-gradient(ellipse at 20% 20%, color-mix(in srgb, var(--t-accent2) 8%, transparent) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 80%, color-mix(in srgb, var(--t-accent4) 8%, transparent) 0%, transparent 60%),
      var(--t-bg-glass);
  overflow: hidden;
}

.btn-close {
  position: absolute; top: 20px; right: 22px; z-index: 10;
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: var(--t-text2); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.25s;
}
.btn-close svg { width: 16px; height: 16px; }
.btn-close:hover { background: rgba(255,60,60,0.18); border-color: rgba(255,60,60,0.5); color: #ff5050; transform: rotate(90deg); }

/* 左侧 */
.player-left {
  width: 50%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 18px;
  padding: 36px 44px; border-right: 1px solid var(--t-border); overflow-y: auto;
}

.song-info { text-align: center; width: 100%; }
.song-title {
  font-family: 'Orbitron', monospace, sans-serif;
  font-size: clamp(0.95rem, 2.2vw, 1.7rem); font-weight: 700;
  background: var(--t-title-grad);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  margin-bottom: 6px; line-height: 1.25;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.song-artist { color: var(--t-text2); font-size: 0.88rem; letter-spacing: 2px; }

/* 专辑封面 */
.album-wrap {
  position: relative;
  width: min(200px, 22vw); height: min(200px, 22vw);
  flex-shrink: 0;
}
.album-ring { position: absolute; border-radius: 50%; border: 1px solid var(--t-disc-border); animation: ringPulse 3s ease-in-out infinite; }
.ring-outer { inset: -16px; animation-delay: 0s; }
.ring-mid   { inset: -5px;  animation-delay: -1.5s; }
@keyframes ringPulse { 0%,100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.65; transform: scale(1.025); } }

.album-disc {
  position: absolute; inset: 0; border-radius: 50%;
  background: var(--t-disc-bg); border: 2px solid var(--t-disc-border);
  overflow: hidden; box-shadow: 0 0 40px rgba(0,0,0,0.6);
  transition: background 0.4s, border-color 0.4s;
}
.disc-grooves { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.disc-groove { position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,0.04); }
.disc-groove:nth-child(1) { width:90%; height:90%; }
.disc-groove:nth-child(2) { width:78%; height:78%; }
.disc-groove:nth-child(3) { width:66%; height:66%; }
.disc-groove:nth-child(4) { width:54%; height:54%; }
.disc-groove:nth-child(5) { width:42%; height:42%; }
.disc-groove:nth-child(6) { width:30%; height:30%; }
.disc-groove:nth-child(7) { width:20%; height:20%; }
.disc-groove:nth-child(8) { width:10%; height:10%; }
.disc-center {
  position: absolute; inset: 50%; transform: translate(-50%,-50%);
  width: 28%; height: 28%; border-radius: 50%;
  background: var(--t-disc-center);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 16px var(--t-disc-glow);
  transition: background 0.4s, box-shadow 0.4s;
}
.disc-center svg { width: 40%; height: 40%; color: rgba(0,0,0,0.7); }

.album-glow {
  position: absolute; inset: -28px; border-radius: 50%;
  background: radial-gradient(circle, var(--t-disc-glow), transparent 70%);
  opacity: 0; transition: opacity 1s; pointer-events: none;
  animation: glowPulse 2.5s ease-in-out infinite;
}
.album-glow.active { opacity: 1; }
@keyframes glowPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }

/* 进度条 */
.progress-section { width: 100%; }
.time-display {
  display: flex; justify-content: space-between;
  color: var(--t-text3); font-size: 0.78rem;
  font-family: 'Orbitron', monospace; margin-bottom: 6px;
}
.progress-bar { position: relative; height: 4px; border-radius: 999px; cursor: pointer; padding: 8px 0; box-sizing: content-box; }
.progress-bg { position: absolute; top: 8px; left: 0; right: 0; bottom: 8px; background: rgba(255,255,255,0.1); border-radius: 999px; }
.progress-fill { position: absolute; top: 8px; left: 0; bottom: 8px; background: var(--t-progress); border-radius: 999px; transition: width 0.12s linear; box-shadow: 0 0 8px color-mix(in srgb, var(--t-accent1) 50%, transparent); }
.progress-thumb {
  position: absolute; top: 50%; transform: translate(-50%,-50%);
  width: 13px; height: 13px; border-radius: 50%;
  background: #fff; box-shadow: 0 0 10px var(--t-accent1);
  transition: left 0.12s linear; cursor: grab;
}
.progress-thumb:active { cursor: grabbing; }
.progress-bar:hover .progress-thumb { transform: translate(-50%,-50%) scale(1.25); }

/* 控制按钮 */
.controls { display: flex; align-items: center; gap: 12px; width: 100%; justify-content: center; }
.ctrl-btn {
  background: none; border: none; color: var(--t-text2); cursor: pointer;
  transition: all 0.2s; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; padding: 0;
}
.ctrl-btn:hover { color: var(--t-text); transform: scale(1.12); }

.ctrl-fav { width: 36px; height: 36px; }
.ctrl-fav svg { width: 18px; height: 18px; }
.ctrl-fav.active { color: var(--t-accent4); filter: drop-shadow(0 0 5px var(--t-accent4)); }

.ctrl-prev, .ctrl-next { width: 40px; height: 40px; }
.ctrl-prev svg, .ctrl-next svg { width: 20px; height: 20px; }

.ctrl-play {
  width: 60px; height: 60px; background: var(--t-play-bg);
  color: rgba(0,0,0,0.8); border-radius: 50%;
  box-shadow: 0 0 26px color-mix(in srgb, var(--t-accent1) 40%, transparent);
  transition: all 0.2s;
}
.ctrl-play svg { width: 24px; height: 24px; }
.ctrl-play:hover { transform: scale(1.08); box-shadow: 0 0 38px color-mix(in srgb, var(--t-accent1) 60%, transparent); }

.volume-wrap { display: flex; align-items: center; gap: 7px; margin-left: 6px; }
.vol-icon { width: 15px; height: 15px; color: var(--t-text2); flex-shrink: 0; }
.volume-slider {
  -webkit-appearance: none; width: 70px; height: 3px;
  border-radius: 999px; background: rgba(255,255,255,0.12); outline: none; cursor: pointer;
}
.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%;
  background: var(--t-play-bg); box-shadow: 0 0 6px var(--t-disc-glow);
}

.playlist-dots { display: flex; gap: 7px; align-items: center; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.18); cursor: pointer; transition: all 0.25s; }
.dot.active { width: 18px; border-radius: 3px; background: var(--t-play-bg); box-shadow: 0 0 6px var(--t-disc-glow); }
.dot:hover { background: rgba(255,255,255,0.38); }

/* 右侧歌词（桌面） */
.player-right { width: 50%; display: flex; flex-direction: column; padding: 34px 30px 34px 42px; overflow: hidden; }

.lyrics-header { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; flex-shrink: 0; }
.lyrics-label { font-family: 'Orbitron', monospace; font-size: 0.66rem; letter-spacing: 4px; color: var(--t-label-color); flex-shrink: 0; }
.lyrics-deco { flex: 1; height: 1px; background: linear-gradient(90deg, var(--t-border), transparent); }

.lyrics-container {
  flex: 1; overflow-y: scroll;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  scrollbar-width: none; -ms-overflow-style: none;
}
.lyrics-container::-webkit-scrollbar { display: none; }
.lyrics-spacer { height: 38vh; flex-shrink: 0; }

.lyric-line {
  width: 100%; text-align: center; padding: 9px 12px;
  font-family: inherit; font-size: 1rem; font-weight: 400;
  color: var(--t-text3); border-radius: 8px; cursor: pointer;
  transition: all 0.36s cubic-bezier(0.4,0,0.2,1); line-height: 1.55;
}
.lyric-line:hover { color: var(--t-text2); background: rgba(255,255,255,0.04); }
.lyric-line.active {
  color: var(--t-lyric-active); font-size: 1.15rem; font-weight: 600;
  text-shadow: 0 0 18px var(--t-lyric-glow);
  transform: scale(1.04);
  background: color-mix(in srgb, var(--t-lyric-active) 5%, transparent);
}
.lyric-line.prev { color: var(--t-text3); opacity: 0.65; }
.lyric-line.next { color: color-mix(in srgb, var(--t-text2) 55%, transparent); }

.no-lyrics { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: var(--t-text3); }
.no-lyrics-icon { width: 68px; height: 68px; opacity: 0.25; }
.no-lyrics-icon svg { width: 100%; height: 100%; }
.no-lyrics p { font-size: 1.1rem; }
.no-lyrics span { font-size: 0.78rem; opacity: 0.6; }

/* 手机端默认隐藏 */
.mobile-player { display: none; }

/* =============================================
   响应式：平板 ≤ 880px
   ============================================= */
@media (max-width: 880px) {
  .player-left  { width: 56%; padding: 26px 22px; gap: 15px; }
  .player-right { width: 44%; padding: 26px 18px; }
  .album-wrap   { width: min(165px, 26vw); height: min(165px, 26vw); }
  .file-grid    { grid-template-columns: repeat(auto-fill, minmax(98px, 1fr)); gap: 10px; }
  .search-wrap  { width: min(200px, 26vw); }
}

/* =============================================
   响应式：手机 ≤ 600px
   ============================================= */
@media (max-width: 600px) {
  /* Header */
  .header { padding: 0 14px; height: 54px; min-height: 54px; }
  .logo-text { font-size: 0.92rem; letter-spacing: 2px; }
  .logo-icon { width: 22px; height: 22px; }
  .search-wrap { width: min(150px, calc(100vw - 195px)); }
  .search-input { font-size: 0.8rem; padding: 6px 10px 6px 32px; }
  .btn-theme { padding: 5px 10px; }
  .theme-label { display: none; }

  /* 文件浏览器 */
  .file-browser { padding: 0 12px; }
  .file-grid { grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 8px; }
  .file-card { padding: 12px 8px 9px; gap: 6px; }
  .card-icon { width: 36px; height: 36px; border-radius: 8px; }
  .card-icon svg { width: 19px; height: 19px; }
  .card-name { font-size: 0.68rem; }
  .btn-text { display: none; }
  .breadcrumb { padding: 10px 0 4px; }

  /* 隐藏桌面播放器，显示手机布局 */
  .player-left    { display: none; }
  .desktop-lyrics { display: none; }

  .mobile-player {
    display: flex; flex-direction: column;
    width: 100%; height: 100%; overflow: hidden;
  }

  .mobile-tabs {
    display: flex; flex-shrink: 0;
    border-bottom: 1px solid var(--t-border);
    margin-top: 54px;
  }
  .m-tab {
    flex: 1; padding: 11px;
    background: none; border: none; border-bottom: 2px solid transparent;
    color: var(--t-text3); font-family: inherit; font-size: 0.88rem;
    cursor: pointer; transition: all 0.2s; margin-bottom: -1px; letter-spacing: 1px;
  }
  .m-tab.active { color: var(--t-accent1); border-bottom-color: var(--t-accent1); font-weight: 600; }

  .m-content {
    flex: 1; overflow-y: auto; min-height: 0;
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; padding: 16px 20px 20px;
  }
  .m-lyrics-content { gap: 0; padding: 12px 14px; }
  .m-lyrics-scroll  { flex: 1; width: 100%; }

  /* 手机封面 */
  .m-album {
    width: min(155px, 42vw) !important;
    height: min(155px, 42vw) !important;
  }
  .m-album .ring-outer { inset: -12px; }
  .m-album .ring-mid   { inset: -4px; }

  /* 手机歌曲信息 */
  .m-content .song-info { width: 100%; }
  .m-title {
    font-size: clamp(0.9rem, 4.5vw, 1.25rem) !important;
    white-space: normal !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    text-align: center;
  }
  .m-content .song-artist { font-size: 0.82rem; }
  .m-content .progress-section { width: 100%; }

  /* 手机控制按钮加大触控区 */
  .m-controls { gap: 10px; }
  .m-controls .ctrl-play { width: 54px; height: 54px; }
  .m-controls .ctrl-play svg { width: 22px; height: 22px; }
  .m-controls .ctrl-prev,
  .m-controls .ctrl-next { width: 38px; height: 38px; }
  .m-controls .volume-wrap { margin-left: 4px; }
  .m-controls .volume-slider { width: 64px; }
}

/* 欢迎页两按钮并排 */
.welcome-btns { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }

.btn-server {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 28px; border-radius: 14px; border: 1.5px solid var(--t-border);
  background: var(--t-bg-card); color: var(--t-accent2);
  font-size: 1rem; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: all 0.25s;
}
.btn-server svg { width: 20px; height: 20px; }
.btn-server:hover { border-color: var(--t-accent2); background: rgba(255,255,255,0.06); transform: translateY(-2px); }

/* 服务器连接面板 */
.server-panel {
  margin-top: 20px; padding: 20px 22px; border-radius: 14px;
  border: 1px solid var(--t-border); background: var(--t-bg-card);
  width: min(400px, 90vw); text-align: left;
}
.sp-title { font-size: 0.75rem; letter-spacing: 3px; color: var(--t-label-color); margin-bottom: 10px; font-family: 'Orbitron', monospace; }
.sp-row { display: flex; gap: 8px; }
.sp-input {
  flex: 1; padding: 9px 14px; border-radius: 8px; border: 1px solid var(--t-border);
  background: rgba(255,255,255,0.05); color: var(--t-text); font-size: 0.88rem; font-family: inherit; outline: none;
}
.sp-input:focus { border-color: var(--t-accent1); }
.sp-btn {
  padding: 9px 18px; border-radius: 8px; border: none;
  background: var(--t-play-bg); color: rgba(0,0,0,0.8); font-weight: 600; font-family: inherit;
  cursor: pointer; font-size: 0.88rem; transition: opacity 0.2s; white-space: nowrap; min-width: 64px;
  display: flex; align-items: center; justify-content: center;
}
.sp-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.sp-loading {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(0,0,0,0.3); border-top-color: rgba(0,0,0,0.8);
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.sp-error { color: #ff6b6b; font-size: 0.8rem; margin: 8px 0 0; }
.sp-hint { color: var(--t-text3); font-size: 0.75rem; margin: 10px 0 0; }
.sp-hint code { color: var(--t-accent2); background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; font-size: 0.72rem; }

/* 数据源徽标 */
.source-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 8px 4px 10px; border-radius: 20px;
  font-size: 0.72rem; font-weight: 600; letter-spacing: 1px;
  border: 1px solid var(--t-border); background: var(--t-bg-card);
  color: var(--t-text2);
}
.source-badge svg { width: 13px; height: 13px; flex-shrink: 0; }
.source-badge.server { border-color: var(--t-accent2); color: var(--t-accent2); }
.source-badge.local  { border-color: var(--t-accent1); color: var(--t-accent1); }
.badge-close {
  background: none; border: none; cursor: pointer; color: inherit; opacity: 0.6;
  padding: 0 0 0 4px; font-size: 0.75rem; line-height: 1; transition: opacity 0.2s;
}
.badge-close:hover { opacity: 1; }
@media (max-width: 375px) {
  .logo-text { display: none; }
  .search-wrap { width: calc(100vw - 165px); }
  .file-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>