/**
 * m4aMetadata.js — 纯 JS 解析 MP4/M4A 内嵌元数据
 *
 * 支持字段：
 *   title   (©nam)  歌曲标题
 *   artist  (©ART)  艺术家
 *   album   (©alb)  专辑
 *   lyrics  (©lyr)  内嵌歌词（纯文本，非 LRC 时间轴格式）
 *   cover   (covr)  封面图片 → base64 data URL
 *
 * 使用方式：
 *   import { parseM4AMetadata } from './m4aMetadata.js'
 *   const meta = await parseM4AMetadata(arrayBuffer)
 *   // meta: { title, artist, album, lyrics, cover }
 */

/** 读取大端 uint32 */
const readU32 = (view, offset) => view.getUint32(offset, false)
/** 读取大端 uint64（只取低 32 位，够用） */
const readU64 = (view, offset) => {
  const hi = view.getUint32(offset, false)
  const lo = view.getUint32(offset + 4, false)
  return hi * 0x100000000 + lo
}
/** 读取 4 字节 box 类型字符串 */
const readBoxType = (view, offset) =>
  String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1),
    view.getUint8(offset+2), view.getUint8(offset+3))

/**
 * 遍历 MP4 box 列表，对指定 type 回调
 * @param {DataView} view
 * @param {number} start  数据起始偏移
 * @param {number} end    数据结束偏移
 * @param {string} type   目标 box 类型（4 字符）
 * @param {Function} cb   (boxStart, boxSize, dataStart, dataSize) => void|true(停止)
 */
const walkBoxes = (view, start, end, type, cb) => {
  let pos = start
  while (pos + 8 <= end) {
    let size = readU32(view, pos)
    const boxType = readBoxType(view, pos + 4)
    let headerSize = 8
    if (size === 1) {
      // 64-bit size
      if (pos + 16 > end) break
      size = readU64(view, pos + 8)
      headerSize = 16
    } else if (size === 0) {
      size = end - pos
    }
    if (size < headerSize || pos + size > end) break
    if (boxType === type) {
      if (cb(pos, size, pos + headerSize, size - headerSize) === true) return
    }
    pos += size
  }
}

/**
 * 深度查找 box 路径，返回找到的 [dataStart, dataSize] 或 null
 * path: ['moov','udta','meta','ilst'] 等
 */
const findBox = (view, path, start = 0, end = view.byteLength) => {
  if (path.length === 0) return [start, end - start]
  let result = null
  walkBoxes(view, start, end, path[0], (boxStart, boxSize, dataStart, dataSize) => {
    result = findBox(view, path.slice(1), dataStart, dataStart + dataSize)
    return true
  })
  return result
}

/** 读取 UTF-8 字符串 */
const readString = (buffer, start, len) =>
  new TextDecoder('utf-8').decode(new Uint8Array(buffer, start, len))

/**
 * 从 ilst box 中提取指定 atom 的 data 内容
 * ilst 结构：atom(4b size + 4b type) → data box(4b size + 4b 'data' + 4b flags + 4b pad + payload)
 */
const readIlstAtom = (view, ilstStart, ilstEnd, atomType) => {
  let result = null
  walkBoxes(view, ilstStart, ilstEnd, atomType, (boxStart, boxSize, dataStart, dataSize) => {
    // 在这个 atom 内找 'data' box
    walkBoxes(view, dataStart, dataStart + dataSize, 'data', (dStart, dSize, dDataStart, dDataSize) => {
      // data box header: 4 bytes flags + 4 bytes locale = 8 bytes
      if (dDataSize > 8) {
        const flags = view.getUint32(dDataStart, false) & 0xffffff
        const payloadStart = dDataStart + 8
        const payloadLen = dDataSize - 8
        // flags: 1 = UTF-8, 13/14 = JPEG/PNG (cover), 21 = int
        if (flags === 1 || flags === 0) {
          result = readString(view.buffer, payloadStart, payloadLen)
        } else if (flags === 13 || flags === 14) {
          // 图片
          const arr = new Uint8Array(view.buffer, payloadStart, payloadLen)
          const mime = flags === 13 ? 'image/jpeg' : 'image/png'
          let binary = ''
          arr.forEach(b => { binary += String.fromCharCode(b) })
          result = `data:${mime};base64,${btoa(binary)}`
        }
      }
      return true
    })
    return true
  })
  return result
}

/**
 * 主入口：解析 M4A/MP4 ArrayBuffer，返回元数据对象
 * @param {ArrayBuffer} buffer
 * @returns {{ title:string|null, artist:string|null, album:string|null, lyrics:string|null, cover:string|null }}
 */
export const parseM4AMetadata = (buffer) => {
  const meta = { title: null, artist: null, album: null, lyrics: null, cover: null }
  try {
    const view = new DataView(buffer)

    // 尝试两种路径：iTunes 标准 / 某些编码器用法
    const paths = [
      ['moov', 'udta', 'meta', 'ilst'],
      ['moov', 'meta', 'ilst'],
    ]

    let ilstRange = null
    for (const path of paths) {
      ilstRange = findBox(view, path)
      if (ilstRange) break
    }

    if (!ilstRange) return meta

    const [ilstStart, ilstSize] = ilstRange
    const ilstEnd = ilstStart + ilstSize

    // iTunes atom 名称映射
    const atomMap = {
      '\u00a9nam': 'title',   // ©nam
      '\u00a9ART': 'artist',  // ©ART
      '\u00a9alb': 'album',   // ©alb
      '\u00a9lyr': 'lyrics',  // ©lyr
      'covr':      'cover',
    }

    for (const [atom, key] of Object.entries(atomMap)) {
      const val = readIlstAtom(view, ilstStart, ilstEnd, atom)
      if (val) meta[key] = val
    }

    // 部分文件用 'aART' 存专辑艺术家，©ART 为空时退回
    if (!meta.artist) {
      const aART = readIlstAtom(view, ilstStart, ilstEnd, 'aART')
      if (aART) meta.artist = aART
    }

  } catch (e) {
    console.warn('M4A 元数据解析失败:', e)
  }
  return meta
}

/**
 * 将内嵌纯文本歌词转换为 LRC 格式数组（无时间轴时按行返回）
 * @param {string} lyricsText
 * @returns {Array<{time:number, text:string}>|null}
 */
export const parsePlainLyrics = (lyricsText) => {
  debugger
  if (!lyricsText?.trim()) return null
  // 判断是否已是 LRC 格式（包含 [mm:ss] 时间轴）
  const lrcLineRegex = /\[\d{1,3}:\d{2}(?:\.\d+)?\]/
  if (lrcLineRegex.test(lyricsText)) return null  // 交给 parseLRC 处理

  // 纯文本：按行分割，时间设为 0（仅展示，无法同步）
  return lyricsText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(text => ({ time: 0, text }))
}