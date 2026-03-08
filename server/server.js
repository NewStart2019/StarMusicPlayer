/**
 * StarMusicPlayer - 本地音乐服务器
 *
 * 提供两个核心接口：
 *   GET /api/files?dir=<目录路径>   — 递归扫描指定目录，返回文件树 JSON
 *   GET /api/download?path=<文件路径> — 下载指定文件
 *
 * 启动：node server.js [--port 3000] [--root /your/music/dir]
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { URL } from 'url'

// ─── 配置 ────────────────────────────────────────────────────────────────────

/** 解析命令行参数 */
const args = process.argv.slice(2)
const getArg = (flag) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : null
}

const PORT      = parseInt(getArg('--port') || '3000', 10)
const ROOT_DIR  = path.resolve(getArg('--root') || process.cwd())

/** 允许访问的音频 + 歌词扩展名（安全白名单） */
const ALLOWED_EXTS = new Set([
  '.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.opus', '.wma', '.ape', '.alac',
  '.lrc', '.txt'
])

console.log(`✦ StarMusicPlayer Server`)
console.log(`  Root directory : ${ROOT_DIR}`)
console.log(`  Port           : ${PORT}`)
console.log(`  Allowed exts   : ${[...ALLOWED_EXTS].join(', ')}\n`)

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 安全路径解析：确保目标路径在 ROOT_DIR 内，防止路径穿越攻击
 * @param {string} rawPath - 用户传入的相对或绝对路径
 * @returns {string|null} 安全的绝对路径，越界则返回 null
 */
const safePath = (rawPath) => {
  if (!rawPath) return null
  const resolved = path.resolve(ROOT_DIR, rawPath)
  // 必须以 ROOT_DIR 开头（加 sep 防止 /root2 误匹配 /root）
  if (!resolved.startsWith(ROOT_DIR + path.sep) && resolved !== ROOT_DIR) return null
  return resolved
}

/**
 * 递归扫描目录，返回文件树
 * @param {string} dirPath  - 目录绝对路径
 * @param {string} baseRoot - 相对路径的基准根（用于生成 relativePath）
 * @param {number} depth    - 当前递归深度（防无限递归，最深 20 层）
 * @returns {object} 节点对象
 */
const scanDir = (dirPath, baseRoot, depth = 0) => {
  if (depth > 20) return null

  let stat
  try { stat = fs.statSync(dirPath) } catch { return null }

  const name         = path.basename(dirPath)
  const relativePath = path.relative(baseRoot, dirPath)
  const ext          = path.extname(name).toLowerCase()

  if (stat.isFile()) {
    // 只返回白名单内的文件
    if (!ALLOWED_EXTS.has(ext)) return null
    return {
      type         : 'file',
      name,
      ext,
      relativePath,
      size         : stat.size,
      sizeReadable : formatSize(stat.size),
      mtime        : stat.mtime.toISOString(),
      isAudio      : isAudio(ext),
      isLrc        : ext === '.lrc',
    }
  }

  if (stat.isDirectory()) {
    let children
    try { children = fs.readdirSync(dirPath) } catch { children = [] }

    const childNodes = children
      .map(child => scanDir(path.join(dirPath, child), baseRoot, depth + 1))
      .filter(Boolean)  // 过滤掉 null（不可访问 / 非白名单文件）

    // 目录本身没有任何允许的子节点时也过滤掉
    if (childNodes.length === 0) return null

    // 文件夹在前，文件在后，各自按名称排序
    childNodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return {
      type         : 'folder',
      name,
      relativePath,
      mtime        : stat.mtime.toISOString(),
      childCount   : childNodes.length,
      children     : childNodes,
    }
  }

  return null
}

/** 判断是否音频文件 */
const isAudio = (ext) =>
  ['.mp3','.flac','.wav','.aac','.ogg','.m4a','.opus','.wma','.ape','.alac'].includes(ext)

/** 文件大小格式化 */
const formatSize = (bytes) => {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(2)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

/** 返回 JSON 响应 */
const sendJSON = (res, status, data) => {
  const body = JSON.stringify(data, null, 2)
  res.writeHead(status, {
    'Content-Type'                : 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin' : '*',
    'Content-Length'              : Buffer.byteLength(body),
  })
  res.end(body)
}

/** 返回错误 JSON */
const sendError = (res, status, message) =>
  sendJSON(res, status, { success: false, error: message })

// ─── 路由处理 ─────────────────────────────────────────────────────────────────

/**
 * GET /api/files
 *
 * 查询参数：
 *   dir  (可选) 相对于 ROOT_DIR 的子目录，默认为 ROOT_DIR 本身
 *   flat (可选) flat=1 时返回扁平数组而非树形结构，便于搜索
 *
 * 响应示例（树形）：
 * {
 *   "success": true,
 *   "root": "/music",
 *   "dir": "Jazz",
 *   "scannedAt": "2025-03-08T12:00:00.000Z",
 *   "tree": { "type": "folder", "name": "Jazz", "children": [...] }
 * }
 */
const handleFiles = (req, res, query) => {
  const dirParam  = query.get('dir') || ''
  const flatMode  = query.get('flat') === '1'

  // 安全解析路径
  const targetDir = dirParam ? safePath(dirParam) : ROOT_DIR
  if (!targetDir) return sendError(res, 403, `路径越界，只允许访问 ROOT_DIR 内的目录`)

  // 确认存在且是目录
  let stat
  try { stat = fs.statSync(targetDir) } catch {
    return sendError(res, 404, `目录不存在: ${dirParam || ROOT_DIR}`)
  }
  if (!stat.isDirectory()) return sendError(res, 400, `指定路径不是目录`)

  // 扫描
  const tree = scanDir(targetDir, ROOT_DIR)
  if (!tree) return sendError(res, 500, '扫描目录失败或目录为空')

  if (flatMode) {
    // 扁平化：递归收集所有文件节点
    const files = []
    const flatten = (node) => {
      if (node.type === 'file') { files.push(node); return }
      node.children?.forEach(flatten)
    }
    flatten(tree)
    return sendJSON(res, 200, {
      success    : true,
      root       : ROOT_DIR,
      dir        : path.relative(ROOT_DIR, targetDir) || '.',
      scannedAt  : new Date().toISOString(),
      totalFiles : files.length,
      files,
    })
  }

  sendJSON(res, 200, {
    success   : true,
    root      : ROOT_DIR,
    dir       : path.relative(ROOT_DIR, targetDir) || '.',
    scannedAt : new Date().toISOString(),
    tree,
  })
}

/**
 * GET /api/download
 *
 * 查询参数：
 *   path  (必填) 相对于 ROOT_DIR 的文件路径
 *
 * 行为：
 *   - 验证路径安全性（防路径穿越）
 *   - 验证扩展名白名单
 *   - 支持 Range 请求（断点续传，音频流播放必需）
 *   - 设置 Content-Disposition 触发浏览器下载
 */
const handleDownload = (req, res, query) => {
  const filePath = query.get('path')
  if (!filePath) return sendError(res, 400, '缺少 path 参数')

  // 安全解析
  const absPath = safePath(filePath)
  if (!absPath) return sendError(res, 403, '路径越界，禁止访问')

  // 白名单检查
  const ext = path.extname(absPath).toLowerCase()
  if (!ALLOWED_EXTS.has(ext)) return sendError(res, 403, `不允许下载此类型文件: ${ext}`)

  // 文件存在性检查
  let stat
  try { stat = fs.statSync(absPath) } catch {
    return sendError(res, 404, `文件不存在: ${filePath}`)
  }
  if (!stat.isFile()) return sendError(res, 400, '指定路径不是文件')

  const fileName   = path.basename(absPath)
  const fileSize   = stat.size
  const mimeType   = getMimeType(ext)
  const rangeHeader = req.headers['range']

  // ── Range 请求（支持音频流 / 断点续传）──────────────────────────
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/)
    if (!match) return sendError(res, 416, 'Range 格式错误')

    const start = match[1] ? parseInt(match[1], 10) : 0
    const end   = match[2] ? parseInt(match[2], 10) : fileSize - 1

    if (start > end || end >= fileSize) {
      res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` })
      return res.end()
    }

    const chunkSize = end - start + 1
    res.writeHead(206, {
      'Content-Range'               : `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges'               : 'bytes',
      'Content-Length'              : chunkSize,
      'Content-Type'                : mimeType,
      'Access-Control-Allow-Origin' : '*',
    })
    const stream = fs.createReadStream(absPath, { start, end })
    stream.pipe(res)
    stream.on('error', () => res.end())
    return
  }

  // ── 完整文件下载 ─────────────────────────────────────────────────
  // Content-Disposition: attachment 触发浏览器「另存为」对话框
  // filename* 使用 RFC 5987 编码，支持中文文件名
  const encodedName = encodeURIComponent(fileName).replace(/'/g, "%27")
  res.writeHead(200, {
    'Content-Type'                : mimeType,
    'Content-Length'              : fileSize,
    'Accept-Ranges'               : 'bytes',
    'Content-Disposition'         : `attachment; filename="${fileName}"; filename*=UTF-8''${encodedName}`,
    'Access-Control-Allow-Origin' : '*',
    'Cache-Control'               : 'no-cache',
  })
  const stream = fs.createReadStream(absPath)
  stream.pipe(res)
  stream.on('error', (err) => {
    console.error('文件流错误:', err.message)
    res.end()
  })
}

/** 根据扩展名返回 MIME 类型 */
const getMimeType = (ext) => ({
  '.mp3'  : 'audio/mpeg',
  '.flac' : 'audio/flac',
  '.wav'  : 'audio/wav',
  '.aac'  : 'audio/aac',
  '.ogg'  : 'audio/ogg',
  '.m4a'  : 'audio/mp4',
  '.opus' : 'audio/opus',
  '.wma'  : 'audio/x-ms-wma',
  '.ape'  : 'audio/ape',
  '.alac' : 'audio/alac',
  '.lrc'  : 'text/plain; charset=utf-8',
  '.txt'  : 'text/plain; charset=utf-8',
}[ext] || 'application/octet-stream')

// ─── HTTP 服务器 ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // 只处理 GET / OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin'  : '*',
      'Access-Control-Allow-Methods' : 'GET, OPTIONS',
      'Access-Control-Allow-Headers' : 'Range, Content-Type',
    })
    return res.end()
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, '只支持 GET 请求')
  }

  // 解析 URL
  let url
  try { url = new URL(req.url, `http://localhost:${PORT}`) }
  catch { return sendError(res, 400, '无效的 URL') }

  const { pathname, searchParams } = url

  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${pathname}  ${[...searchParams].map(([k,v])=>`${k}=${v}`).join('&')}`)

  if (pathname === '/api/files')    return handleFiles(req, res, searchParams)
  if (pathname === '/api/download') return handleDownload(req, res, searchParams)

  // 根路径返回接口说明
  if (pathname === '/') {
    return sendJSON(res, 200, {
      name    : 'StarMusicPlayer API Server',
      version : '1.0.0',
      root    : ROOT_DIR,
      routes  : [
        {
          method      : 'GET',
          path        : '/api/files',
          description : '递归扫描目录，返回文件树 JSON',
          params      : [
            { name: 'dir',  required: false, desc: '相对于 root 的子目录路径，默认为 root' },
            { name: 'flat', required: false, desc: 'flat=1 返回扁平文件数组，便于搜索' },
          ],
          example     : '/api/files?dir=Jazz&flat=0',
        },
        {
          method      : 'GET',
          path        : '/api/download',
          description : '下载或流式播放指定文件，支持 Range 断点续传',
          params      : [
            { name: 'path', required: true, desc: '相对于 root 的文件路径' },
          ],
          example     : '/api/download?path=Jazz/Miles Davis - So What.mp3',
        },
      ],
    })
  }

  sendError(res, 404, `未知路由: ${pathname}`)
})

server.listen(PORT, () => {
  console.log(`✦ Server running → http://localhost:${PORT}`)
  console.log(`  文件列表: http://localhost:${PORT}/api/files`)
  console.log(`  文件列表(扁平): http://localhost:${PORT}/api/files?flat=1`)
  console.log(`  文件下载: http://localhost:${PORT}/api/download?path=<相对路径>\n`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✖ 端口 ${PORT} 已被占用，请换一个端口: node server.js --port 3001`)
  } else {
    console.error('✖ 服务器错误:', err.message)
  }
  process.exit(1)
})