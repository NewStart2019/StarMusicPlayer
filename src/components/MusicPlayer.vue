<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { parseLRC, findCurrentLyricIndex } from '../utils/lrcParser.js'

// =============================================
// 状态定义
// =============================================

/** 虚拟文件系统：存储所有扫描到的文件条目 */
const allEntries = ref([])
/** 当前目录路径栈（面包屑导航用） */
const pathStack = ref([])
/** 当前目录下的条目列表 */
const currentEntries = ref([])
/** 搜索关键词 */
const searchQuery = ref('')
/** 是否已选择文件夹 */
const hasFolder = ref(false)
/** 错误信息 */
const errorMsg = ref('')

/** 播放列表（当前文件夹中的所有音频文件） */
const playlist = ref([])
/** 当前播放索引 */
const currentIndex = ref(-1)
/** 是否显示播放器全屏弹窗 */
const showPlayer = ref(false)
/** 是否正在播放 */
const isPlaying = ref(false)
/** 当前时间（秒） */
const currentTime = ref(0)
/** 总时长（秒） */
const duration = ref(0)
/** 音量 0-1 */
const volume = ref(0.8)
/** 进度条拖拽中标记 */
const isDragging = ref(false)
/** 收藏列表（文件名集合） */
const favorites = ref(new Set())

/** 歌词数组 */
const lyrics = ref([])
/** 当前歌词索引 */
const currentLyricIndex = ref(-1)
/** 专辑封面旋转角度 */
const albumRotation = ref(0)
/** 旋转动画帧ID */
let rotationRafId = null
let lastTimestamp = null

/** Audio 元素引用 */
const audioRef = ref(null)
/** 歌词容器引用 */
const lyricsContainerRef = ref(null)
/** 文件输入引用 */
const fileInputRef = ref(null)
/** 进度条引用 */
const progressRef = ref(null)

// =============================================
// 计算属性
// =============================================

/** 当前播放的歌曲 */
const currentSong = computed(() => {
  if (currentIndex.value < 0 || currentIndex.value >= playlist.value.length) return null
  return playlist.value[currentIndex.value]
})

/** 歌曲标题（去掉扩展名） */
const songTitle = computed(() => {
  if (!currentSong.value) return '未知歌曲'
  return currentSong.value.name.replace(/\.[^.]+$/, '')
})

/** 艺术家（从文件名解析，格式: 艺术家 - 歌曲名） */
const artistName = computed(() => {
  const title = songTitle.value
  const dashIdx = title.indexOf(' - ')
  if (dashIdx > 0) return title.substring(0, dashIdx)
  return '未知艺术家'
})

/** 展示用歌名 */
const displayTitle = computed(() => {
  const title = songTitle.value
  const dashIdx = title.indexOf(' - ')
  if (dashIdx > 0) return title.substring(dashIdx + 3)
  return title
})

/** 当前目录名 */
const currentDirName = computed(() => {
  if (pathStack.value.length === 0) return '根目录'
  return pathStack.value[pathStack.value.length - 1].name
})

/** 过滤后的条目列表（搜索） */
const filteredEntries = computed(() => {
  if (!searchQuery.value.trim()) return currentEntries.value
  const q = searchQuery.value.toLowerCase()
  return currentEntries.value.filter(e => e.name.toLowerCase().includes(q))
})

/** 进度条百分比 */
const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

/** 格式化时间 mm:ss */
const formatTime = (sec) => {
  if (isNaN(sec) || sec < 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// =============================================
// 文件系统操作
// =============================================

/** 支持的音频扩展名 */
const AUDIO_EXTS = new Set(['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.opus', '.wma'])

/** 判断是否为音频文件 */
const isAudioFile = (name) => {
  const ext = name.substring(name.lastIndexOf('.')).toLowerCase()
  return AUDIO_EXTS.has(ext)
}

/** 判断是否为 LRC 文件 */
const isLrcFile = (name) => name.toLowerCase().endsWith('.lrc')

/**
 * 处理文件夹选择（使用 input[webkitdirectory]）
 */
const handleFolderSelect = (event) => {
  const files = Array.from(event.target.files)
  if (!files.length) return

  errorMsg.value = ''
  // 构建虚拟文件系统树
  buildVirtualFS(files)
  hasFolder.value = true
  pathStack.value = []
  navigateToPath([])
}

/**
 * 构建虚拟文件系统
 * 将 FileList 转换成层级结构存储
 */
const buildVirtualFS = (files) => {
  // 使用 Map 构建目录树
  const root = { name: 'root', type: 'folder', children: new Map(), path: [] }

  files.forEach(file => {
    // webkitRelativePath 格式: "rootFolder/subDir/file.mp3"
    const parts = file.webkitRelativePath.split('/')
    // parts[0] 是选择的根文件夹名

    let current = root
    // 从第1层开始（跳过选择的根文件夹名）
    for (let i = 1; i < parts.length - 1; i++) {
      const dirName = parts[i]
      if (!current.children.has(dirName)) {
        const dirPath = parts.slice(0, i + 1)
        current.children.set(dirName, {
          name: dirName,
          type: 'folder',
          children: new Map(),
          path: dirPath
        })
      }
      current = current.children.get(dirName)
    }

    // 最后一个是文件名
    const fileName = parts[parts.length - 1]
    // 只存储音频和LRC文件
    if (isAudioFile(fileName) || isLrcFile(fileName)) {
      current.children.set(fileName, {
        name: fileName,
        type: 'file',
        fileObj: file,
        path: parts,
        isAudio: isAudioFile(fileName),
        isLrc: isLrcFile(fileName)
      })
    }
  })

  // 将 root 的 children 转换成扁平化的虚拟FS树
  allEntries.value = root
}

/**
 * 导航到指定路径
 * @param {string[]} pathParts - 路径各级名称数组
 */
const navigateToPath = (pathParts) => {
  let node = allEntries.value
  for (const part of pathParts) {
    if (node.children && node.children.has(part)) {
      node = node.children.get(part)
    } else {
      break
    }
  }

  if (!node || !node.children) {
    currentEntries.value = []
    return
  }

  // 分离文件夹和音频文件，文件夹优先
  const folders = []
  const audioFiles = []

  node.children.forEach((entry) => {
    // 过滤掉 LRC 文件，仅展示文件夹和音频文件
    if (entry.type === 'folder') {
      // 检查文件夹内是否有音频文件（深层）
      if (hasAudioInFolder(entry)) folders.push(entry)
    } else if (entry.isAudio) {
      audioFiles.push(entry)
    }
  })

  // 字母排序
  folders.sort((a, b) => a.name.localeCompare(b.name))
  audioFiles.sort((a, b) => a.name.localeCompare(b.name))

  currentEntries.value = [...folders, ...audioFiles]

  // 更新面包屑
  if (pathParts.length > 0) {
    pathStack.value = pathParts.map((name, i) => ({
      name,
      path: pathParts.slice(0, i + 1)
    }))
  }
}

/**
 * 递归检查文件夹内是否有音频文件
 */
const hasAudioInFolder = (folder) => {
  if (!folder.children) return false
  for (const [, entry] of folder.children) {
    if (entry.isAudio) return true
    if (entry.type === 'folder' && hasAudioInFolder(entry)) return true
  }
  return false
}

/**
 * 点击文件夹，进入子目录
 */
const enterFolder = (entry) => {
  searchQuery.value = ''
  navigateToPath(entry.path.slice(1)) // 去掉根文件夹名
}

/**
 * 返回上级目录
 */
const goBack = () => {
  searchQuery.value = ''
  if (pathStack.value.length <= 1) {
    pathStack.value = []
    navigateToPath([])
  } else {
    const newPath = pathStack.value[pathStack.value.length - 2].path
    navigateToPath(newPath)
  }
}

/**
 * 面包屑点击导航
 */
const breadcrumbNav = (item) => {
  searchQuery.value = ''
  navigateToPath(item.path)
}

// =============================================
// 播放列表与播放控制
// =============================================

/**
 * 收集当前目录下所有音频文件（用于播放列表）
 */
const collectAudioFiles = (entries) => {
  return entries.filter(e => e.type === 'file' && e.isAudio)
}

/**
 * 点击音频文件，开始播放
 */
const playAudio = async (entry, entries) => {
  // 建立播放列表：当前目录下所有音频文件
  const audioList = collectAudioFiles(entries || currentEntries.value)
  playlist.value = audioList

  const idx = audioList.findIndex(e => e.name === entry.name)
  currentIndex.value = idx >= 0 ? idx : 0

  showPlayer.value = true
  await loadAndPlay(currentIndex.value)
}

/**
 * 加载并播放指定索引的歌曲
 */
const loadAndPlay = async (index) => {
  if (index < 0 || index >= playlist.value.length) return

  currentIndex.value = index
  const song = playlist.value[index]

  // 创建 Blob URL
  const url = URL.createObjectURL(song.fileObj)
  const audio = audioRef.value

  // 释放旧的 Blob URL
  if (audio.src && audio.src.startsWith('blob:')) {
    URL.revokeObjectURL(audio.src)
  }

  audio.src = url
  audio.volume = volume.value

  try {
    await audio.play()
    isPlaying.value = true
    startAlbumRotation()
  } catch (e) {
    console.error('播放失败:', e)
    errorMsg.value = '音频播放失败，请检查文件格式'
  }

  // 加载对应歌词
  await loadLyrics(song)
}

/**
 * 加载 LRC 歌词
 * 查找同目录下同名的 .lrc 文件
 */
const loadLyrics = async (song) => {
  lyrics.value = []
  currentLyricIndex.value = -1

  // 获取同名 LRC 文件名
  const baseName = song.name.replace(/\.[^.]+$/, '')
  const lrcName = baseName + '.lrc'

  // 在文件树中查找同目录的 LRC 文件
  const dirPath = song.path.slice(1, -1) // 去掉根文件夹名和文件名
  let node = allEntries.value

  for (const part of dirPath) {
    if (node.children && node.children.has(part)) {
      node = node.children.get(part)
    } else {
      node = null
      break
    }
  }

  if (node && node.children && node.children.has(lrcName)) {
    const lrcEntry = node.children.get(lrcName)
    try {
      const text = await lrcEntry.fileObj.text()
      lyrics.value = parseLRC(text)
    } catch (e) {
      console.error('LRC 读取失败:', e)
    }
  }
}

/** 播放/暂停切换 */
const togglePlay = () => {
  const audio = audioRef.value
  if (!audio) return

  if (isPlaying.value) {
    audio.pause()
    isPlaying.value = false
    stopAlbumRotation()
  } else {
    audio.play()
    isPlaying.value = true
    startAlbumRotation()
  }
}

/** 上一曲 */
const prevSong = () => {
  if (playlist.value.length === 0) return
  const newIdx = (currentIndex.value - 1 + playlist.value.length) % playlist.value.length
  loadAndPlay(newIdx)
}

/** 下一曲 */
const nextSong = () => {
  if (playlist.value.length === 0) return
  const newIdx = (currentIndex.value + 1) % playlist.value.length
  loadAndPlay(newIdx)
}

/** 歌曲结束自动下一曲 */
const onAudioEnded = () => {
  nextSong()
}

/** 音频时间更新 */
const onTimeUpdate = () => {
  if (!isDragging.value) {
    currentTime.value = audioRef.value?.currentTime || 0
  }
  // 更新歌词
  updateLyric()
}

/** 音频元数据加载完成 */
const onLoadedMetadata = () => {
  duration.value = audioRef.value?.duration || 0
}

/**
 * 更新当前歌词高亮
 */
const updateLyric = () => {
  if (!lyrics.value.length) return

  const newIdx = findCurrentLyricIndex(lyrics.value, currentTime.value)
  if (newIdx !== currentLyricIndex.value) {
    currentLyricIndex.value = newIdx
    // 滚动歌词到居中位置
    nextTick(() => scrollLyricToCenter(newIdx))
  }
}

/**
 * 将当前歌词行滚动到容器中央
 */
const scrollLyricToCenter = (index) => {
  const container = lyricsContainerRef.value
  if (!container || index < 0) return

  const activeEl = container.querySelector('.lyric-line.active')
  if (!activeEl) return

  const containerH = container.clientHeight
  const elTop = activeEl.offsetTop
  const elH = activeEl.clientHeight

  // 目标滚动位置：让当前歌词居中
  const targetScroll = elTop - containerH / 2 + elH / 2
  container.scrollTo({ top: targetScroll, behavior: 'smooth' })
}

// =============================================
// 进度条控制
// =============================================

/** 点击进度条跳转 */
const seekTo = (event) => {
  const rect = progressRef.value.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const newTime = ratio * duration.value
  audioRef.value.currentTime = newTime
  currentTime.value = newTime
}

/** 开始拖拽进度 */
const startDrag = (event) => {
  isDragging.value = true
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', stopDrag)
  onDragMove(event)
}

const onDragMove = (event) => {
  if (!isDragging.value || !progressRef.value) return
  const rect = progressRef.value.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  currentTime.value = ratio * duration.value
}

const stopDrag = () => {
  if (isDragging.value) {
    audioRef.value.currentTime = currentTime.value
    isDragging.value = false
  }
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', stopDrag)
}

/** 音量变更 */
const onVolumeChange = (event) => {
  volume.value = parseFloat(event.target.value)
  if (audioRef.value) audioRef.value.volume = volume.value
}

// =============================================
// 专辑封面旋转动画
// =============================================

const startAlbumRotation = () => {
  if (rotationRafId) return
  lastTimestamp = null

  const animate = (timestamp) => {
    if (!lastTimestamp) lastTimestamp = timestamp
    const delta = timestamp - lastTimestamp
    lastTimestamp = timestamp
    // 每秒旋转 6 度
    albumRotation.value = (albumRotation.value + delta * 0.006) % 360
    rotationRafId = requestAnimationFrame(animate)
  }

  rotationRafId = requestAnimationFrame(animate)
}

const stopAlbumRotation = () => {
  if (rotationRafId) {
    cancelAnimationFrame(rotationRafId)
    rotationRafId = null
    lastTimestamp = null
  }
}

// =============================================
// 收藏功能
// =============================================
const toggleFavorite = () => {
  if (!currentSong.value) return
  const name = currentSong.value.name
  if (favorites.value.has(name)) {
    favorites.value.delete(name)
  } else {
    favorites.value.add(name)
  }
}

const isFavorite = computed(() => {
  if (!currentSong.value) return false
  return favorites.value.has(currentSong.value.name)
})

// =============================================
// 播放器关闭
// =============================================
const closePlayer = () => {
  showPlayer.value = false
  if (audioRef.value) {
    audioRef.value.pause()
    isPlaying.value = false
    stopAlbumRotation()
  }
}

// =============================================
// 生命周期
// =============================================
onUnmounted(() => {
  stopAlbumRotation()
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
  <!-- 主背景：深色动态渐变 -->
  <div class="app-wrapper">
    <!-- 动态背景装饰 -->
    <div class="bg-orb orb1"></div>
    <div class="bg-orb orb2"></div>
    <div class="bg-orb orb3"></div>
    <div class="bg-grid"></div>

    <!-- =================== 文件浏览区域 =================== -->
    <div class="browser-container">

      <!-- 顶部标题栏 -->
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

        <!-- 搜索框 -->
        <div class="search-wrap" v-if="hasFolder">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
              v-model="searchQuery"
              class="search-input"
              type="text"
              placeholder="搜索文件..."
          />
        </div>
      </header>

      <!-- 无文件夹时的欢迎页 -->
      <div v-if="!hasFolder" class="welcome-screen">
        <div class="welcome-inner">
          <div class="welcome-visual">
            <div class="vinyl-disc">
              <div class="vinyl-groove" v-for="i in 5" :key="i"></div>
              <div class="vinyl-center"></div>
            </div>
          </div>
          <h1 class="welcome-title">开始你的音乐之旅</h1>
          <p class="welcome-sub">选择本地音乐文件夹，即刻享受沉浸式播放体验</p>
          <button class="btn-select" @click="fileInputRef.click()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            选择音乐文件夹
          </button>
          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        </div>
      </div>

      <!-- 文件浏览器 -->
      <div v-else class="file-browser">

        <!-- 面包屑导航 -->
        <nav class="breadcrumb">
          <span
              class="crumb crumb-root"
              @click="() => { pathStack = []; navigateToPath([]) }"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            根目录
          </span>
          <template v-for="(item, i) in pathStack" :key="i">
            <span class="crumb-sep">›</span>
            <span
                class="crumb"
                :class="{ 'crumb-active': i === pathStack.length - 1 }"
                @click="breadcrumbNav(item)"
            >{{ item.name }}</span>
          </template>
        </nav>

        <!-- 操作栏 -->
        <div class="toolbar">
          <button v-if="pathStack.length > 0" class="btn-back" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            返回上级
          </button>
          <button class="btn-change" @click="fileInputRef.click()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            更换文件夹
          </button>
          <span class="item-count">{{ filteredEntries.length }} 个项目</span>
        </div>

        <!-- 文件网格 -->
        <div class="file-grid" v-if="filteredEntries.length > 0">
          <div
              v-for="entry in filteredEntries"
              :key="entry.name"
              class="file-card"
              :class="entry.type === 'folder' ? 'folder-card' : 'audio-card'"
              @click="entry.type === 'folder' ? enterFolder(entry) : playAudio(entry, null)"
              @dblclick="entry.type === 'folder' ? enterFolder(entry) : null"
          >
            <!-- 文件夹图标 -->
            <div v-if="entry.type === 'folder'" class="card-icon folder-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <!-- 音频图标 -->
            <div v-else class="card-icon audio-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
              <!-- 播放中指示器 -->
              <div v-if="currentSong && currentSong.name === entry.name && isPlaying" class="playing-waves">
                <span></span><span></span><span></span>
              </div>
            </div>
            <div class="card-name">{{ entry.name }}</div>
            <div v-if="entry.type !== 'folder'" class="card-ext">
              {{ entry.name.split('.').pop().toUpperCase() }}
            </div>
          </div>
        </div>

        <!-- 空目录提示 -->
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

    <!-- 隐藏的文件选择 input -->
    <input
        ref="fileInputRef"
        type="file"
        webkitdirectory
        multiple
        style="display:none"
        @change="handleFolderSelect"
    />

    <!-- =================== 全屏播放器弹窗 =================== -->
    <Transition name="player-modal">
      <div v-if="showPlayer" class="player-modal" @click.self="closePlayer">
        <div class="player-inner">

          <!-- 关闭按钮 -->
          <button class="btn-close" @click="closePlayer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <!-- 左侧：控制区 -->
          <div class="player-left">

            <!-- 歌曲信息 -->
            <div class="song-info">
              <h1 class="song-title">{{ displayTitle }}</h1>
              <p class="song-artist">{{ artistName }}</p>
            </div>

            <!-- 专辑封面 -->
            <div class="album-wrap">
              <div class="album-ring ring-outer"></div>
              <div class="album-ring ring-mid"></div>
              <div
                  class="album-disc"
                  :style="{ transform: `rotate(${albumRotation}deg)` }"
              >
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
              <!-- 播放状态光晕 -->
              <div class="album-glow" :class="{ active: isPlaying }"></div>
            </div>

            <!-- 进度控制 -->
            <div class="progress-section">
              <div class="time-display">
                <span>{{ formatTime(currentTime) }}</span>
                <span>{{ formatTime(duration) }}</span>
              </div>
              <div
                  class="progress-bar"
                  ref="progressRef"
                  @click="seekTo"
                  @mousedown="startDrag"
              >
                <div class="progress-bg"></div>
                <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
                <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
              </div>
            </div>

            <!-- 控制按钮 -->
            <div class="controls">
              <!-- 收藏 -->
              <button class="ctrl-btn ctrl-fav" @click="toggleFavorite" :class="{ active: isFavorite }">
                <svg viewBox="0 0 24 24" :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>

              <!-- 上一曲 -->
              <button class="ctrl-btn ctrl-prev" @click="prevSong">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="19,20 9,12 19,4"/>
                  <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
              </button>

              <!-- 播放/暂停 -->
              <button class="ctrl-btn ctrl-play" @click="togglePlay">
                <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21"/>
                </svg>
              </button>

              <!-- 下一曲 -->
              <button class="ctrl-btn ctrl-next" @click="nextSong">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="5,4 15,12 5,20"/>
                  <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
              </button>

              <!-- 音量 -->
              <div class="volume-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="vol-icon">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    :value="volume"
                    class="volume-slider"
                    @input="onVolumeChange"
                />
              </div>
            </div>

            <!-- 迷你播放列表点指示器 -->
            <div class="playlist-dots">
              <span
                  v-for="(_, i) in playlist.slice(Math.max(0, currentIndex - 3), Math.min(playlist.length, currentIndex + 4))"
                  :key="i"
                  class="dot"
                  :class="{ active: Math.max(0, currentIndex - 3) + i === currentIndex }"
                  @click="loadAndPlay(Math.max(0, currentIndex - 3) + i)"
              ></span>
            </div>
          </div>

          <!-- 右侧：歌词区 -->
          <div class="player-right">
            <div class="lyrics-header">
              <span class="lyrics-label">LYRICS</span>
              <div class="lyrics-line-deco"></div>
            </div>

            <!-- 有歌词 -->
            <div
                v-if="lyrics.length > 0"
                class="lyrics-container"
                ref="lyricsContainerRef"
            >
              <!-- 顶部占位，确保第一句可以居中 -->
              <div class="lyrics-spacer"></div>

              <div
                  v-for="(line, i) in lyrics"
                  :key="i"
                  class="lyric-line"
                  :class="{
                  active: i === currentLyricIndex,
                  prev: i < currentLyricIndex,
                  next: i > currentLyricIndex
                }"
                  @click="() => { audioRef.currentTime = line.time; currentTime = line.time }"
              >
                {{ line.text || '♪' }}
              </div>

              <!-- 底部占位 -->
              <div class="lyrics-spacer"></div>
            </div>

            <!-- 无歌词提示 -->
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

        </div>
      </div>
    </Transition>

    <!-- 隐藏的 Audio 元素 -->
    <audio
        ref="audioRef"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @ended="onAudioEnded"
    ></audio>
  </div>
</template>

<style scoped>
/* =============================================
   全局布局
   ============================================= */
.app-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #050810;
  overflow: hidden;
  font-family: 'Rajdhani', sans-serif;
}

/* 动态背景光球 */
.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  animation: orbFloat 12s ease-in-out infinite;
  pointer-events: none;
}
.orb1 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, #4facfe, transparent);
  top: -200px; left: -200px;
  animation-delay: 0s;
}
.orb2 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, #f953c6, transparent);
  bottom: -150px; right: -100px;
  animation-delay: -4s;
}
.orb3 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, #00f260, transparent);
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -8s;
  opacity: 0.08;
}
@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(30px, -30px); }
  66% { transform: translate(-20px, 20px); }
}

/* 背景网格 */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
      linear-gradient(rgba(0, 242, 254, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 242, 254, 0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}

/* =============================================
   文件浏览器区域
   ============================================= */
.browser-container {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部 Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 36px;
  border-bottom: 1px solid rgba(0, 242, 254, 0.1);
  background: rgba(5, 8, 16, 0.6);
  backdrop-filter: blur(20px);
  flex-shrink: 0;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 36px; height: 36px;
  color: #00f2fe;
  filter: drop-shadow(0 0 8px #00f2fe88);
}

.logo-text {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 4px;
  color: #fff;
}

.logo-accent { color: #00f2fe; }

/* 搜索框 */
.search-wrap {
  position: relative;
  width: 300px;
}

.search-icon {
  position: absolute;
  left: 14px; top: 50%;
  transform: translateY(-50%);
  width: 16px; height: 16px;
  color: rgba(255,255,255,0.4);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 16px 10px 42px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(0, 242, 254, 0.2);
  border-radius: 999px;
  color: #fff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.search-input::placeholder { color: rgba(255,255,255,0.3); }
.search-input:focus {
  border-color: rgba(0, 242, 254, 0.5);
  box-shadow: 0 0 20px rgba(0, 242, 254, 0.1);
}

/* =============================================
   欢迎页
   ============================================= */
.welcome-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-inner {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

/* 黑胶唱片装饰 */
.vinyl-disc {
  width: 200px; height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, #1a1a2e 30%, #0a0a15 60%, #1a1a2e 100%);
  border: 2px solid rgba(0, 242, 254, 0.3);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: vinylSpin 8s linear infinite;
  box-shadow: 0 0 60px rgba(79, 172, 254, 0.2), inset 0 0 30px rgba(0,0,0,0.5);
}

@keyframes vinylSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.vinyl-groove {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.05);
}
.vinyl-groove:nth-child(1) { width: 170px; height: 170px; }
.vinyl-groove:nth-child(2) { width: 140px; height: 140px; }
.vinyl-groove:nth-child(3) { width: 110px; height: 110px; }
.vinyl-groove:nth-child(4) { width: 80px; height: 80px; }
.vinyl-groove:nth-child(5) { width: 50px; height: 50px; }

.vinyl-center {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00f2fe, #4facfe);
  box-shadow: 0 0 15px rgba(0, 242, 254, 0.6);
  position: relative;
  z-index: 1;
}

.welcome-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #00f2fe, #4facfe, #f953c6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-sub {
  color: rgba(255,255,255,0.5);
  font-size: 1rem;
  font-weight: 300;
}

/* 选择文件夹按钮 */
.btn-select {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 36px;
  background: linear-gradient(135deg, rgba(0,242,254,0.15), rgba(79,172,254,0.15));
  border: 1px solid rgba(0,242,254,0.4);
  border-radius: 999px;
  color: #00f2fe;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 0 30px rgba(0,242,254,0.1);
}

.btn-select svg { width: 18px; height: 18px; }

.btn-select:hover {
  background: linear-gradient(135deg, rgba(0,242,254,0.25), rgba(79,172,254,0.25));
  border-color: rgba(0,242,254,0.8);
  box-shadow: 0 0 40px rgba(0,242,254,0.25), 0 0 80px rgba(0,242,254,0.1);
  transform: scale(1.03);
}

/* =============================================
   文件浏览器
   ============================================= */
.file-browser {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 36px;
}

/* 面包屑 */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 16px 0 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.crumb {
  color: rgba(255,255,255,0.5);
  font-size: 0.88rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;
  padding: 2px 6px;
  border-radius: 4px;
}
.crumb:hover { color: #00f2fe; }
.crumb-root { color: rgba(255,255,255,0.6); }
.crumb-active { color: #00f2fe; cursor: default; }
.crumb-sep { color: rgba(255,255,255,0.2); font-size: 1.1rem; }

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0 16px;
  flex-shrink: 0;
}

.btn-back, .btn-change {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: rgba(255,255,255,0.7);
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back svg, .btn-change svg { width: 14px; height: 14px; }

.btn-back:hover, .btn-change:hover {
  border-color: rgba(0,242,254,0.4);
  color: #00f2fe;
  background: rgba(0,242,254,0.08);
}

.item-count {
  margin-left: auto;
  color: rgba(255,255,255,0.3);
  font-size: 0.85rem;
}

/* 文件网格 */
.file-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 16px;
  overflow-y: auto;
  padding-bottom: 24px;
  align-content: start;
}

.file-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 12px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s;
  text-align: center;
}

.file-card:hover {
  background: rgba(0,242,254,0.06);
  border-color: rgba(0,242,254,0.3);
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(0,242,254,0.1);
}

.card-icon {
  width: 48px; height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  position: relative;
}

.folder-icon {
  background: rgba(255, 185, 0, 0.1);
  color: #ffb900;
}

.audio-icon {
  background: rgba(0, 242, 254, 0.1);
  color: #00f2fe;
}

.card-icon svg { width: 26px; height: 26px; }

.card-name {
  color: rgba(255,255,255,0.8);
  font-size: 0.78rem;
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
  top: 10px; right: 10px;
  font-size: 0.6rem;
  padding: 2px 5px;
  background: rgba(0,242,254,0.15);
  border-radius: 4px;
  color: rgba(0,242,254,0.8);
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 0.5px;
}

/* 播放中动画 */
.playing-waves {
  position: absolute;
  bottom: -8px; right: -8px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
}
.playing-waves span {
  width: 3px;
  background: #00f260;
  border-radius: 2px;
  animation: waveAnim 0.8s ease-in-out infinite;
}
.playing-waves span:nth-child(1) { animation-delay: 0s; }
.playing-waves span:nth-child(2) { animation-delay: 0.15s; }
.playing-waves span:nth-child(3) { animation-delay: 0.3s; }
@keyframes waveAnim {
  0%, 100% { height: 4px; }
  50% { height: 14px; }
}

/* 空目录 */
.empty-hint {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: rgba(255,255,255,0.25);
}
.empty-hint svg { width: 48px; height: 48px; }
.empty-hint p { font-size: 1rem; }

.error-msg {
  color: #ff4444;
  font-size: 0.85rem;
}

/* =============================================
   全屏播放器弹窗
   ============================================= */
.player-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(3, 5, 15, 0.85);
  backdrop-filter: blur(12px);
}

/* 弹窗动画 */
.player-modal-enter-active { animation: modalIn 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.player-modal-leave-active { animation: modalOut 0.3s ease-in forwards; }
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes modalOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}

.player-inner {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  background:
      radial-gradient(ellipse at 20% 20%, rgba(79,172,254,0.08) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 80%, rgba(249,83,198,0.08) 0%, transparent 60%),
      rgba(8, 12, 28, 0.95);
  overflow: hidden;
}

.btn-close {
  position: absolute;
  top: 24px; right: 28px;
  z-index: 10;
  width: 44px; height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s;
}
.btn-close svg { width: 18px; height: 18px; }
.btn-close:hover {
  background: rgba(255,70,70,0.2);
  border-color: rgba(255,70,70,0.5);
  color: #ff4646;
  transform: rotate(90deg);
}

/* ============ 左侧控制区 ============ */
.player-left {
  width: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 40px 48px;
  border-right: 1px solid rgba(0,242,254,0.08);
}

/* 歌曲信息 */
.song-info {
  text-align: center;
  width: 100%;
}

.song-title {
  font-family: 'Orbitron', sans-serif;
  font-size: clamp(1.2rem, 2.5vw, 2rem);
  font-weight: 700;
  background: linear-gradient(90deg, #fff 0%, rgba(0,242,254,0.9) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  color: rgba(255,255,255,0.5);
  font-size: 0.95rem;
  letter-spacing: 2px;
  font-weight: 300;
}

/* 专辑封面 */
.album-wrap {
  position: relative;
  width: min(220px, 25vw);
  height: min(220px, 25vw);
  flex-shrink: 0;
}

.album-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(0,242,254,0.15);
  inset: 0;
  animation: ringPulse 3s ease-in-out infinite;
}
.ring-outer { inset: -20px; animation-delay: 0s; }
.ring-mid { inset: -8px; animation-delay: -1.5s; }
@keyframes ringPulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.02); }
}

.album-disc {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #1e2a4a, #050810 70%);
  border: 2px solid rgba(0,242,254,0.2);
  overflow: hidden;
  box-shadow: 0 0 40px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3);
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
  border: 1px solid rgba(255,255,255,0.04);
}
.disc-groove:nth-child(1) { width: 90%; height: 90%; }
.disc-groove:nth-child(2) { width: 78%; height: 78%; }
.disc-groove:nth-child(3) { width: 66%; height: 66%; }
.disc-groove:nth-child(4) { width: 54%; height: 54%; }
.disc-groove:nth-child(5) { width: 42%; height: 42%; }
.disc-groove:nth-child(6) { width: 30%; height: 30%; }
.disc-groove:nth-child(7) { width: 20%; height: 20%; }
.disc-groove:nth-child(8) { width: 10%; height: 10%; }

.disc-center {
  position: absolute;
  inset: 50%;
  transform: translate(-50%, -50%);
  width: 28%;
  height: 28%;
  border-radius: 50%;
  background: linear-gradient(135deg, #00f2fe, #4facfe);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(0,242,254,0.5);
}
.disc-center svg { width: 40%; height: 40%; color: rgba(0,0,0,0.7); }

.album-glow {
  position: absolute;
  inset: -30px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0,242,254,0.15), transparent 70%);
  opacity: 0;
  transition: opacity 1s;
  pointer-events: none;
  animation: glowPulse 2s ease-in-out infinite;
}
.album-glow.active { opacity: 1; }
@keyframes glowPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 进度条 */
.progress-section {
  width: 100%;
}

.time-display {
  display: flex;
  justify-content: space-between;
  color: rgba(255,255,255,0.45);
  font-size: 0.82rem;
  font-family: 'Orbitron', sans-serif;
  margin-bottom: 10px;
}

.progress-bar {
  position: relative;
  height: 4px;
  border-radius: 999px;
  cursor: pointer;
}
.progress-bg {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.1);
  border-radius: 999px;
}
.progress-fill {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  background: linear-gradient(90deg, #00f2fe, #4facfe);
  border-radius: 999px;
  transition: width 0.15s linear;
  box-shadow: 0 0 8px rgba(0,242,254,0.5);
}
.progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 10px rgba(0,242,254,0.8);
  transition: left 0.15s linear;
  cursor: grab;
}
.progress-thumb:active { cursor: grabbing; }
.progress-bar:hover .progress-thumb { transform: translate(-50%, -50%) scale(1.3); }

/* 播放控制按钮 */
.controls {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  justify-content: center;
}

.ctrl-btn {
  background: none;
  border: none;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 0;
}
.ctrl-btn:hover { color: #fff; transform: scale(1.15); }

.ctrl-fav { width: 38px; height: 38px; }
.ctrl-fav svg { width: 20px; height: 20px; }
.ctrl-fav.active { color: #f953c6; filter: drop-shadow(0 0 6px #f953c6); }

.ctrl-prev, .ctrl-next {
  width: 44px; height: 44px;
}
.ctrl-prev svg, .ctrl-next svg { width: 22px; height: 22px; }

.ctrl-play {
  width: 68px; height: 68px;
  background: linear-gradient(135deg, #00f2fe, #4facfe);
  color: #050810;
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(0,242,254,0.4), 0 0 60px rgba(0,242,254,0.15);
  transition: all 0.2s;
}
.ctrl-play svg { width: 26px; height: 26px; }
.ctrl-play:hover {
  transform: scale(1.08);
  box-shadow: 0 0 40px rgba(0,242,254,0.6), 0 0 80px rgba(0,242,254,0.25);
  color: #050810;
}

/* 音量控制 */
.volume-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}
.vol-icon { width: 18px; height: 18px; color: rgba(255,255,255,0.5); flex-shrink: 0; }

.volume-slider {
  -webkit-appearance: none;
  width: 80px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255,255,255,0.15);
  outline: none;
  cursor: pointer;
}
.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00f2fe, #4facfe);
  box-shadow: 0 0 8px rgba(0,242,254,0.5);
}

/* 播放列表点指示器 */
.playlist-dots {
  display: flex;
  gap: 8px;
  align-items: center;
}
.dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  cursor: pointer;
  transition: all 0.25s;
}
.dot.active {
  width: 20px;
  border-radius: 3px;
  background: linear-gradient(90deg, #00f2fe, #4facfe);
  box-shadow: 0 0 8px rgba(0,242,254,0.5);
}
.dot:hover { background: rgba(255,255,255,0.4); }

/* ============ 右侧歌词区 ============ */
.player-right {
  width: 50%;
  display: flex;
  flex-direction: column;
  padding: 40px 36px 40px 48px;
  overflow: hidden;
}

.lyrics-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.lyrics-label {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 4px;
  color: rgba(0,242,254,0.6);
  flex-shrink: 0;
}

.lyrics-line-deco {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(0,242,254,0.3), transparent);
}

/* 歌词滚动容器 */
.lyrics-container {
  flex: 1;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  /* 隐藏滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.lyrics-container::-webkit-scrollbar { display: none; }

.lyrics-spacer { height: 40vh; flex-shrink: 0; }

/* 歌词行 */
.lyric-line {
  width: 100%;
  text-align: center;
  padding: 10px 12px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.05rem;
  font-weight: 400;
  color: rgba(255,255,255,0.25);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  line-height: 1.5;
}

.lyric-line:hover {
  color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.04);
}

/* 当前歌词 */
.lyric-line.active {
  color: #00f260;
  font-size: 1.2rem;
  font-weight: 600;
  text-shadow: 0 0 20px rgba(0,242,96,0.5);
  transform: scale(1.05);
  background: rgba(0,242,96,0.05);
}

/* 前一句渐出 */
.lyric-line.prev {
  color: rgba(255,255,255,0.18);
}

/* 后一句稍亮 */
.lyric-line.next {
  color: rgba(255,255,255,0.28);
}

/* 无歌词提示 */
.no-lyrics {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: rgba(255,255,255,0.2);
}
.no-lyrics-icon {
  width: 80px; height: 80px;
  opacity: 0.3;
}
.no-lyrics-icon svg { width: 100%; height: 100%; }
.no-lyrics p { font-size: 1.2rem; font-weight: 500; }
.no-lyrics span { font-size: 0.82rem; color: rgba(255,255,255,0.15); }
</style>