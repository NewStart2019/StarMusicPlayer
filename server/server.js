/**
 * StarMusicPlayer - 本地音乐服务器
 *
 * 提供两个核心接口：
 *   GET /api/files?dir=<目录路径>    — 递归扫描指定目录，返回文件树 JSON（每个文件含完整 url 字段）
 *   GET /api/download?path=<文件路径> — 下载 / 流式播放指定文件，支持 Range 断点续传
 *
 * 启动：node server.js [--port 3000] [--host 0.0.0.0] [--root /your/music/dir]
 *
 *   --port  监听端口，默认 3000
 *   --host  监听 IP，默认 0.0.0.0（所有网卡）；指定如 192.168.1.10 可限定网卡
 *   --root  音乐根目录，默认当前工作目录
 *
 * 示例：
 *   node server.js --port 8080 --host 192.168.1.10 --root /home/user/Music
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
const HOST      = getArg('--host') || '0.0.0.0'
const ROOT_DIR  = path.resolve(getArg('--root') || process.cwd())

/** 允许访问的音频 + 歌词扩展名（安全白名单） */
const ALLOWED_EXTS = new Set([
  '.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.opus', '.wma', '.ape', '.alac',
  '.lrc', '.txt'
])

console.log(`✦ StarMusicPlayer Server`)
console.log(`  Root directory : ${ROOT_DIR}`)
console.log(`  Host           : ${HOST}`)
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
  // 将 URL 中的正斜杠统一转为系统路径分隔符（兼容 Windows）
  const normalized = rawPath.split('/').join(path.sep)
  const resolved   = path.resolve(ROOT_DIR, normalized)
  if (!resolved.startsWith(ROOT_DIR + path.sep) && resolved !== ROOT_DIR) return null
  return resolved
}

/**
 * 递归扫描目录，返回文件树
 * @param {string} dirPath  - 目录绝对路径
 * @param {string} baseRoot - 相对路径的基准根（用于生成 relativePath）
 * @param {string} baseUrl  - 服务根地址，如 http://192.168.1.10:3000（用于生成完整 url）
 * @param {number} depth    - 当前递归深度（防无限递归，最深 20 层）
 * @returns {object} 节点对象
 */
const scanDir = (dirPath, baseRoot, baseUrl, depth = 0) => {
  if (depth > 20) return null

  let stat
  try { stat = fs.statSync(dirPath) } catch { return null }

  const name         = path.basename(dirPath)
  const relativePath = path.relative(baseRoot, dirPath)
  const ext          = path.extname(name).toLowerCase()

  if (stat.isFile()) {
    // 只返回白名单内的文件
    if (!ALLOWED_EXTS.has(ext)) return null
    // 将相对路径中的反斜杠（Windows）统一转为正斜杠，再编码为 URL 参数
    const urlPath     = relativePath.split(path.sep).join('/')
    const downloadUrl = `${baseUrl}/api/download?path=${encodeURIComponent(urlPath)}`
    return {
      type         : 'file',
      name,
      ext,
      relativePath,
      url          : downloadUrl,
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
      .map(child => scanDir(path.join(dirPath, child), baseRoot, baseUrl, depth + 1))
      .filter(Boolean)  // 过滤掉 null（不可访问 / 非白名单文件）

    // 目录本身没有任何允许的子节点时也过滤掉
    if (childNodes.length === 0) return null

    // 为音频文件匹配同目录下同名 .lrc 文件，注入 lrc 字段
    const lrcMap = new Map()
    childNodes.forEach(n => { if (n.isLrc) lrcMap.set(n.name, n.url) })
    childNodes.forEach(n => {
      if (n.isAudio) {
        const lrcName = n.name.replace(/\.[^.]+$/, '') + '.lrc'
        n.lrc = lrcMap.get(lrcName) ?? null
      }
    })

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

  // 从请求头 Host 推导 baseUrl，用于生成文件的完整 url 字段
  // 优先使用 X-Forwarded-Host（反向代理场景），回退到 Host 头，最后用配置值
  const hostHeader = req.headers['x-forwarded-host'] || req.headers['host'] || `${HOST}:${PORT}`
  const proto      = req.headers['x-forwarded-proto'] || 'http'
  const baseUrl    = `${proto}://${hostHeader}`

  // 扫描
  const tree = scanDir(targetDir, ROOT_DIR, baseUrl)
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
      baseUrl,
      dir        : path.relative(ROOT_DIR, targetDir) || '.',
      scannedAt  : new Date().toISOString(),
      totalFiles : files.length,
      files,
    })
  }

  sendJSON(res, 200, {
    success   : true,
    root      : ROOT_DIR,
    baseUrl,
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
  // filename= 只能含 ASCII 可见字符，中文等非 ASCII 字符会导致 ERR_INVALID_CHAR
  // 用 ASCII 安全的占位名 + filename*=UTF-8'' 编码名并存，兼容所有客户端
  const asciiFallback = encodeURIComponent(fileName).replace(/%[0-9A-Fa-f]{2}/g, '_')
  res.writeHead(200, {
    'Content-Type'                : mimeType,
    'Content-Length'              : fileSize,
    'Accept-Ranges'               : 'bytes',
    'Content-Disposition'         : `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`,
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
  try { url = new URL(req.url, `http://${HOST}:${PORT}`) }
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

server.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST
  console.log(`✦ Server running → http://${displayHost}:${PORT}`)
  if (HOST === '0.0.0.0') {
    console.log(`  局域网访问   → http://<本机IP>:${PORT}`)
  }
  console.log(`  文件列表     : http://${displayHost}:${PORT}/api/files`)
  console.log(`  文件列表(扁平): http://${displayHost}:${PORT}/api/files?flat=1`)
  console.log(`  文件下载     : http://${displayHost}:${PORT}/api/download?path=<相对路径>\n`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✖ 端口 ${PORT} 已被占用，请换一个端口: node server.js --port 3001`)
  } else {
    console.error('✖ 服务器错误:', err.message)
  }
  process.exit(1)
})