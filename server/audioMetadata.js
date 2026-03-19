/**
 * audioMetadata.js — 纯浏览器音频元数据解析器
 *
 * 支持格式：
 *   .mp3  — ID3v1 / ID3v2.2 / ID3v2.3 / ID3v2.4
 *   .m4a / .aac / .mp4 — iTunes MP4 atoms (ilst)
 *   .flac — FLAC Vorbis Comment + STREAMINFO
 *   .ogg  — Ogg Vorbis Comment
 *   .wav  — ID3 chunk / LIST INFO chunk
 *
 * 返回统一的 AudioMeta 对象：
 * {
 *   title, artist, albumArtist, album, year, trackNumber, trackTotal,
 *   discNumber, discTotal, genre, composer, comment, bpm, lyrics,
 *   cover,           // base64 data URL 或 null
 *   coverMime,       // 'image/jpeg' | 'image/png' | null
 *   format,          // 'MP3' | 'M4A' | 'FLAC' | 'OGG' | 'WAV' | ...
 *   bitrate,         // kbps (若可读取)
 *   sampleRate,      // Hz
 *   channels,        // 1 | 2 | ...
 *   duration,        // 秒 (若可从标签读取)
 *   encoder,         // 编码器字符串
 *   copyright,
 *   url,             // 曲目 URL
 *   isrc,
 *   extra,           // { key: value } 其他自定义字段
 * }
 */

// ─── 工具函数 ────────────────────────────────────────────────────────────────

const u8 = (v, o) => v.getUint8(o)
const u16be = (v, o) => v.getUint16(o, false)
const u16le = (v, o) => v.getUint16(o, true)
const u32be = (v, o) => v.getUint32(o, false)
const u32le = (v, o) => v.getUint32(o, true)
const u64be = (v, o) => v.getUint32(o, false) * 0x100000000 + v.getUint32(o + 4, false)

const utf8 = (buf, s, l) => new TextDecoder('utf-8').decode(new Uint8Array(buf, s, l))
const utf16 = (buf, s, l, le = false) => new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(new Uint8Array(buf, s, l))
const latin1 = (buf, s, l) => {
  const arr = new Uint8Array(buf, s, l)
  return Array.from(arr).map(b => String.fromCharCode(b)).join('')
}

const boxType = (v, o) =>
  String.fromCharCode(u8(v, o), u8(v, o + 1), u8(v, o + 2), u8(v, o + 3))

const bytes2B64 = (arr) => Buffer.from(arr).toString('base64')

const emptyMeta = () => ({
  title: null, artist: null, albumArtist: null, album: null,
  year: null, trackNumber: null, trackTotal: null,
  discNumber: null, discTotal: null,
  genre: null, composer: null, comment: null, bpm: null,
  lyrics: null, cover: null, coverMime: null,
  format: null, bitrate: null, sampleRate: null, channels: null, duration: null,
  encoder: null, copyright: null, url: null, isrc: null, extra: {}
})

// ─── ID3v2 解析器 ────────────────────────────────────────────────────────────

const ID3_GENRES = [
  'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop', 'Jazz', 'Metal',
  'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial',
  'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop',
  'Vocal', 'Jazz+Funk', 'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid', 'House', 'Game',
  'Sound Clip', 'Gospel', 'Noise', 'Alternative Rock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative',
  'Instrumental Pop', 'Instrumental Rock', 'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial',
  'Electronic', 'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult', 'Gangsta',
  'Top 40', 'Christian Rap', 'Pop/Funk', 'Jungle', 'Native American', 'Cabaret', 'New Wave',
  'Psychadelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal', 'Acid Punk', 'Acid Jazz',
  'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock'
]

function parseID3v2(buf) {
  const view = new DataView(buf)
  const meta = emptyMeta()
  meta.format = 'MP3'

  if (buf.byteLength < 10) return meta
  // 检查 ID3 魔数
  if (u8(view, 0) !== 0x49 || u8(view, 1) !== 0x44 || u8(view, 2) !== 0x33) {
    // 尝试 ID3v1 (最后128字节)
    return parseID3v1(buf, meta)
  }

  const version = u8(view, 3)   // 2, 3, 4
  const flags = u8(view, 5)
  const hasUnsync = (flags & 0x80) !== 0
  const hasExt = (flags & 0x40) !== 0

  // Syncsafe int
  const syncSafe = (v, o) => ((u8(v, o) & 0x7f) << 21) | ((u8(v, o + 1) & 0x7f) << 14) |
    ((u8(v, o + 2) & 0x7f) << 7) | (u8(v, o + 3) & 0x7f)

  const tagSize = syncSafe(view, 6)
  let pos = 10

  // Extended header
  if (hasExt && version >= 3) {
    const extSize = version === 4 ? syncSafe(view, 10) : u32be(view, 10)
    pos += extSize
  }

  const tagEnd = Math.min(10 + tagSize, buf.byteLength)
  const frameSizeLen = version === 2 ? 3 : 4  // v2.2 uses 3-byte sizes

  while (pos + (version === 2 ? 6 : 10) <= tagEnd) {
    let frameId, frameSize, frameFlags = 0

    if (version === 2) {
      frameId = latin1(buf, pos, 3)
      frameSize = (u8(view, pos + 3) << 16) | (u8(view, pos + 4) << 8) | u8(view, pos + 5)
      pos += 6
    } else {
      frameId = latin1(buf, pos, 4)
      frameSize = version === 4 ? syncSafe(view, pos + 4) : u32be(view, pos + 4)
      frameFlags = u16be(view, pos + 8)
      pos += 10
    }

    if (frameId === '\0\0\0\0' || frameSize === 0) break
    if (frameSize > tagEnd - pos) break

    const frameEnd = pos + frameSize
    const encoding = u8(view, pos)  // 0=latin1 1=utf16 2=utf16be 3=utf8

    const readText = (start, end) => {
      if (start >= end) return ''
      const enc = u8(view, start)
      const s = start + 1, l = end - start - 1
      if (l <= 0) return ''
      try {
        if (enc === 1) {
          // UTF-16 with BOM
          const hasBom = l >= 2 && ((u8(view, s) === 0xFF && u8(view, s + 1) === 0xFE) ||
            (u8(view, s) === 0xFE && u8(view, s + 1) === 0xFF))
          const le = hasBom ? (u8(view, s) === 0xFF) : true
          const offset = hasBom ? 2 : 0
          return new TextDecoder(le ? 'utf-16le' : 'utf-16be')
            .decode(new Uint8Array(buf, s + offset, l - offset))
            .replace(/\0/g, '').trim()
        }
        if (enc === 2) return utf16(buf, s, l, false).replace(/\0/g, '').trim()
        if (enc === 3) return utf8(buf, s, l).replace(/\0/g, '').trim()
        return latin1(buf, s, l).replace(/\0/g, '').trim()
      } catch {
        return ''
      }
    }

    const fid = frameId.replace(/\0/g, '')

    if (fid === 'TIT2' || fid === 'TT2') meta.title = readText(pos, frameEnd)
    else if (fid === 'TPE1' || fid === 'TP1') meta.artist = readText(pos, frameEnd)
    else if (fid === 'TPE2' || fid === 'TP2') meta.albumArtist = readText(pos, frameEnd)
    else if (fid === 'TALB' || fid === 'TAL') meta.album = readText(pos, frameEnd)
    else if (fid === 'TDRC' || fid === 'TYER' || fid === 'TYE') meta.year = readText(pos, frameEnd).substring(0, 4)
    else if (fid === 'TRCK' || fid === 'TRK') {
      const t = readText(pos, frameEnd)
      const [n, total] = t.split('/')
      meta.trackNumber = n || null
      meta.trackTotal = total || null
    } else if (fid === 'TPOS' || fid === 'TPA') {
      const t = readText(pos, frameEnd)
      const [n, total] = t.split('/')
      meta.discNumber = n || null
      meta.discTotal = total || null
    } else if (fid === 'TCON' || fid === 'TCO') {
      let g = readText(pos, frameEnd)
      const m = g.match(/^\((\d+)\)/)
      if (m) g = ID3_GENRES[parseInt(m[1])] || g
      meta.genre = g
    } else if (fid === 'TCOM' || fid === 'TCM') meta.composer = readText(pos, frameEnd)
    else if (fid === 'TBPM' || fid === 'TBP') meta.bpm = readText(pos, frameEnd)
    else if (fid === 'TENC' || fid === 'TEN') meta.encoder = readText(pos, frameEnd)
    else if (fid === 'TCOP' || fid === 'TCR') meta.copyright = readText(pos, frameEnd)
    else if (fid === 'TSRC') meta.isrc = readText(pos, frameEnd)
    else if (fid === 'WOAS' || fid === 'WAF') meta.url = latin1(buf, pos, frameEnd - pos).replace(/\0/g, '').trim()
    else if (fid === 'COMM' || fid === 'COM') {
      // COMM: encoding(1) + lang(3) + short desc(varies) + text
      if (frameSize > 4) {
        const enc2 = u8(view, pos)
        const textStart = pos + 4  // skip encoding + lang
        // find null separator
        let nullPos = textStart
        if (enc2 === 0 || enc2 === 3) {
          while (nullPos < frameEnd && u8(view, nullPos) !== 0) nullPos++
          nullPos++
        } else {
          while (nullPos + 1 < frameEnd && !(u8(view, nullPos) === 0 && u8(view, nullPos + 1) === 0)) nullPos += 2
          nullPos += 2
        }
        if (nullPos < frameEnd) {
          const commentText = readText(nullPos - 1, frameEnd)  // re-read with encoding byte trick
          // simpler: just decode from nullPos
          try {
            const cLen = frameEnd - nullPos
            if (cLen > 0) {
              if (enc2 === 1 || enc2 === 2) {
                meta.comment = new TextDecoder('utf-16le').decode(new Uint8Array(buf, nullPos, cLen)).replace(/\0/g, '').trim()
              } else {
                meta.comment = utf8(buf, nullPos, cLen).replace(/\0/g, '').trim()
              }
            }
          } catch {
          }
        }
      }
    } else if (fid === 'USLT' || fid === 'ULT') {
      // USLT: encoding(1) + lang(3) + content desc + lyrics
      if (frameSize > 4) {
        const enc2 = u8(view, pos)
        const start2 = pos + 4
        let nullPos = start2
        if (enc2 === 0 || enc2 === 3) {
          while (nullPos < frameEnd && u8(view, nullPos) !== 0) nullPos++
          nullPos++
        } else {
          while (nullPos + 1 < frameEnd && !(u8(view, nullPos) === 0 && u8(view, nullPos + 1) === 0)) nullPos += 2
          nullPos += 2
        }
        if (nullPos < frameEnd) {
          const lLen = frameEnd - nullPos
          if (lLen > 0) {
            try {
              if (enc2 === 1 || enc2 === 2) {
                meta.lyrics = new TextDecoder('utf-16le').decode(new Uint8Array(buf, nullPos, lLen)).replace(/\0/g, '').trim()
              } else {
                meta.lyrics = utf8(buf, nullPos, lLen).replace(/\0/g, '').trim()
              }
            } catch {
            }
          }
        }
      }
    } else if (fid === 'APIC' || fid === 'PIC') {
      // APIC: encoding(1) + mime(latin1,null) + pictype(1) + desc(var,null) + data
      const enc2 = u8(view, pos)
      let scanPos = pos + 1
      // find mime null terminator
      const mimeStart = scanPos
      while (scanPos < frameEnd && u8(view, scanPos) !== 0) scanPos++
      const mime = latin1(buf, mimeStart, scanPos - mimeStart)
      scanPos++ // skip null
      scanPos++ // skip picture type byte
      // skip description
      if (enc2 === 0 || enc2 === 3) {
        while (scanPos < frameEnd && u8(view, scanPos) !== 0) scanPos++
        scanPos++
      } else {
        while (scanPos + 1 < frameEnd && !(u8(view, scanPos) === 0 && u8(view, scanPos + 1) === 0)) scanPos += 2
        scanPos += 2
      }
      if (scanPos < frameEnd) {
        const imgLen = frameEnd - scanPos
        const imgArr = new Uint8Array(buf, scanPos, imgLen)
        const mimeType = mime.includes('png') ? 'image/png' : 'image/jpeg'
        meta.cover = `data:${mimeType};base64,${bytes2B64(imgArr)}`
        meta.coverMime = mimeType
      }
    }
    // TXXX — user-defined text
    else if (fid === 'TXXX' || fid === 'TXX') {
      const enc2 = u8(view, pos)
      let scanPos = pos + 1
      const descStart = scanPos
      if (enc2 === 0 || enc2 === 3) {
        while (scanPos < frameEnd && u8(view, scanPos) !== 0) scanPos++
      } else {
        while (scanPos + 1 < frameEnd && !(u8(view, scanPos) === 0 && u8(view, scanPos + 1) === 0)) scanPos += 2
      }
      const desc = readText(descStart - 1, scanPos)
      scanPos += (enc2 === 1 || enc2 === 2) ? 2 : 1
      if (scanPos < frameEnd && desc) {
        const val = readText(scanPos - 1, frameEnd)
        meta.extra[desc] = val
      }
    }

    pos = frameEnd
  }

  // fallback: ID3v1 if no title found
  if (!meta.title) parseID3v1(buf, meta)
  return meta
}

function parseID3v1(buf, meta = emptyMeta()) {
  if (buf.byteLength < 128) return meta
  const view = new DataView(buf)
  const offset = buf.byteLength - 128
  if (u8(view, offset) !== 0x54 || u8(view, offset + 1) !== 0x41 || u8(view, offset + 2) !== 0x47) return meta

  const trim = (s) => s.replace(/\0+$/, '').trim()
  meta.title = meta.title || trim(latin1(buf, offset + 3, 30))
  meta.artist = meta.artist || trim(latin1(buf, offset + 33, 30))
  meta.album = meta.album || trim(latin1(buf, offset + 63, 30))
  meta.year = meta.year || trim(latin1(buf, offset + 93, 4))
  meta.comment = meta.comment || trim(latin1(buf, offset + 97, 30))
  const genreIdx = u8(view, offset + 127)
  meta.genre = meta.genre || (genreIdx < ID3_GENRES.length ? ID3_GENRES[genreIdx] : null)
  return meta
}

// ─── MP4/M4A 解析器 (扩展版) ─────────────────────────────────────────────────

function walkBoxes(view, start, end, cb) {
  let pos = start
  while (pos + 8 <= end) {
    let size = u32be(view, pos)
    const type = boxType(view, pos + 4)
    let hdrSize = 8
    if (size === 1) {
      if (pos + 16 > end) break
      size = u64be(view, pos + 8)
      hdrSize = 16
    } else if (size === 0) {
      size = end - pos
    }
    if (size < hdrSize || pos + size > end) break
    cb(pos, size, pos + hdrSize, size - hdrSize, type)
    pos += size
  }
}

function findBox(view, path, start = 0, end = view.byteLength) {
  if (!path.length) return [start, end - start]
  let result = null
  walkBoxes(view, start, end, (bStart, bSize, dStart, dSize, type) => {
    if (type === path[0]) {
      result = findBox(view, path.slice(1), dStart, dStart + dSize)
    }
  })
  return result
}

function readIlstAtom(view, ilstStart, ilstEnd, atomType) {
  let result = null
  walkBoxes(view, ilstStart, ilstEnd, (bStart, bSize, dStart, dSize, type) => {
    if (type !== atomType) return
    walkBoxes(view, dStart, dStart + dSize, (dStart2, dSize2, ddStart, ddSize, dtype) => {
      if (dtype !== 'data' || ddSize < 8) return
      const flags = u32be(view, ddStart) & 0xffffff
      const payloadStart = ddStart + 8
      const payloadLen = ddSize - 8
      if (payloadLen <= 0) return
      if (flags === 1 || flags === 0) {
        result = utf8(view.buffer, payloadStart, payloadLen).replace(/\0/g, '').trim()
      } else if (flags === 13 || flags === 14) {
        const arr = new Uint8Array(view.buffer, payloadStart, payloadLen)
        const mime = flags === 13 ? 'image/jpeg' : 'image/png'
        result = {cover: `data:${mime};base64,${bytes2B64(arr)}`, mime}
      } else if (flags === 21 && payloadLen >= 4) {
        result = String(u32be(view, payloadStart))
      } else if (flags === 21 && payloadLen === 2) {
        result = String(u16be(view, payloadStart))
      }
    })
  })
  return result
}

function readTrackOrDisc(view, ilstStart, ilstEnd, atomType) {
  // trkn / disk: data box contains [0,0, num, total]
  let num = null, total = null
  walkBoxes(view, ilstStart, ilstEnd, (bStart, bSize, dStart, dSize, type) => {
    if (type !== atomType) return
    walkBoxes(view, dStart, dStart + dSize, (d2, s2, dd, ds, dt) => {
      if (dt !== 'data' || ds < 10) return
      num = u16be(view, dd + 10)
      total = u16be(view, dd + 12)
    })
  })
  return {num: num || null, total: total || null}
}

function parseMP4(buf) {
  const view = new DataView(buf)
  const meta = emptyMeta()
  meta.format = 'M4A'

  const paths = [['moov', 'udta', 'meta', 'ilst'], ['moov', 'meta', 'ilst']]
  let ilstRange = null
  for (const p of paths) {
    ilstRange = findBox(view, p);
    if (ilstRange) break
  }
  if (!ilstRange) return meta

  const [ilstStart, ilstSize] = ilstRange
  const ilstEnd = ilstStart + ilstSize

  const str = (atom) => {
    const v = readIlstAtom(view, ilstStart, ilstEnd, atom);
    return typeof v === 'string' ? v : null
  }
  const num = (atom) => readIlstAtom(view, ilstStart, ilstEnd, atom)
  const img = (atom) => {
    const v = readIlstAtom(view, ilstStart, ilstEnd, atom);
    return v?.cover ? v : null
  }

  meta.title = str('\u00a9nam')
  meta.artist = str('\u00a9ART') || str('aART')
  meta.albumArtist = str('aART')
  meta.album = str('\u00a9alb')
  meta.year = str('\u00a9day')?.substring(0, 4)
  meta.genre = str('\u00a9gen') || str('gnre')
  meta.composer = str('\u00a9wrt')
  meta.comment = str('\u00a9cmt')
  meta.encoder = str('\u00a9too')
  meta.copyright = str('cprt')
  meta.lyrics = str('\u00a9lyr')
  meta.isrc = str('----') // non-standard
  meta.bpm = str('tmpo')

  const trk = readTrackOrDisc(view, ilstStart, ilstEnd, 'trkn')
  meta.trackNumber = trk.num ? String(trk.num) : null
  meta.trackTotal = trk.total ? String(trk.total) : null

  const dsk = readTrackOrDisc(view, ilstStart, ilstEnd, 'disk')
  meta.discNumber = dsk.num ? String(dsk.num) : null
  meta.discTotal = dsk.total ? String(dsk.total) : null

  const coverData = img('covr')
  if (coverData) {
    meta.cover = coverData.cover;
    meta.coverMime = coverData.mime
  }

  // 从 mvhd box 读取时长
  const mvhd = findBox(view, ['moov', 'mvhd'])
  if (mvhd) {
    const [ms, mSize] = mvhd
    const ver = u8(view, ms)
    if (ver === 0 && mSize >= 20) {
      const timescale = u32be(view, ms + 12)
      const duration = u32be(view, ms + 16)
      if (timescale > 0) meta.duration = Math.round(duration / timescale)
    } else if (ver === 1 && mSize >= 28) {
      const timescale = u32be(view, ms + 20)
      const duration = u64be(view, ms + 24)
      if (timescale > 0) meta.duration = Math.round(duration / timescale)
    }
  }

  // 读取采样率和声道数 (mp4a box)
  const mp4a = findBox(view, ['moov', 'trak', 'mdia', 'minf', 'stbl', 'stsd'])
  if (mp4a) {
    // stsd: 8 bytes header + 4 bytes entry_count, then audio sample entry
    const [ss, sSz] = mp4a
    if (sSz > 16) {
      // skip version(4) + entry_count(4) + reserved(6) + data_ref_idx(2)
      const chanOffset = ss + 16 + 2
      if (chanOffset + 6 <= ss + sSz) {
        meta.channels = u16be(view, chanOffset + 2) || null
        meta.sampleRate = Math.round(u32be(view, chanOffset + 8) / 65536) || null
      }
    }
  }

  return meta
}

// ─── FLAC 解析器 ─────────────────────────────────────────────────────────────

function parseFLAC(buf) {
  const view = new DataView(buf)
  const meta = emptyMeta()
  meta.format = 'FLAC'

  if (buf.byteLength < 4) return meta
  // fLaC magic
  if (u8(view, 0) !== 0x66 || u8(view, 1) !== 0x4c || u8(view, 2) !== 0x61 || u8(view, 3) !== 0x43) return meta

  let pos = 4
  while (pos + 4 <= buf.byteLength) {
    const blockHeader = u8(view, pos)
    const isLast = (blockHeader & 0x80) !== 0
    const blockType = blockHeader & 0x7f
    const blockLen = (u8(view, pos + 1) << 16) | (u8(view, pos + 2) << 8) | u8(view, pos + 3)
    pos += 4

    if (pos + blockLen > buf.byteLength) break

    if (blockType === 0) {
      // STREAMINFO (34 bytes)
      if (blockLen >= 18) {
        meta.sampleRate = (u8(view, pos) << 12) | (u8(view, pos + 1) << 4) | (u8(view, pos + 2) >> 4)
        meta.channels = ((u8(view, pos + 2) >> 1) & 0x07) + 1
        const totalSamples = ((u8(view, pos + 4) & 0x0f) * 0x100000000) + u32be(view, pos + 5)
        if (meta.sampleRate > 0) meta.duration = Math.round(totalSamples / meta.sampleRate)
      }
    } else if (blockType === 4) {
      // VORBIS_COMMENT
      parseVorbisComment(buf, pos, blockLen, meta)
    } else if (blockType === 6) {
      // PICTURE
      parseFlacPicture(buf, pos, blockLen, meta)
    }

    pos += blockLen
    if (isLast) break
  }
  return meta
}

function parseVorbisComment(buf, start, len, meta) {
  const view = new DataView(buf)
  let pos = start
  const end = start + len

  // vendor string
  if (pos + 4 > end) return
  const vendorLen = u32le(view, pos);
  pos += 4
  if (pos + vendorLen > end) return
  meta.encoder = utf8(buf, pos, vendorLen)
  pos += vendorLen

  if (pos + 4 > end) return
  const count = u32le(view, pos);
  pos += 4

  for (let i = 0; i < count; i++) {
    if (pos + 4 > end) break
    const commentLen = u32le(view, pos);
    pos += 4
    if (pos + commentLen > end) break
    const comment = utf8(buf, pos, commentLen)
    pos += commentLen

    const eq = comment.indexOf('=')
    if (eq < 0) continue
    const key = comment.substring(0, eq).toUpperCase()
    const val = comment.substring(eq + 1).trim()

    switch (key) {
      case 'TITLE':
        meta.title = val;
        break
      case 'ARTIST':
        meta.artist = val;
        break
      case 'ALBUMARTIST':
      case 'ALBUM ARTIST':
        meta.albumArtist = val;
        break
      case 'ALBUM':
        meta.album = val;
        break
      case 'DATE':
      case 'YEAR':
        meta.year = val.substring(0, 4);
        break
      case 'TRACKNUMBER':
      case 'TRACK': {
        const [n, t] = val.split('/')
        meta.trackNumber = n || null;
        meta.trackTotal = t || null;
        break
      }
      case 'TRACKTOTAL':
        meta.trackTotal = val;
        break
      case 'DISCNUMBER':
      case 'DISC': {
        const [n, t] = val.split('/')
        meta.discNumber = n || null;
        meta.discTotal = t || null;
        break
      }
      case 'DISCTOTAL':
        meta.discTotal = val;
        break
      case 'GENRE':
        meta.genre = val;
        break
      case 'COMPOSER':
        meta.composer = val;
        break
      case 'COMMENT':
        meta.comment = val;
        break
      case 'BPM':
      case 'TEMPO':
        meta.bpm = val;
        break
      case 'LYRICS':
      case 'UNSYNCEDLYRICS':
      case 'UNSYNCED LYRICS':
        meta.lyrics = val;
        break
      case 'ENCODER':
        meta.encoder = val;
        break
      case 'COPYRIGHT':
        meta.copyright = val;
        break
      case 'ISRC':
        meta.isrc = val;
        break
      case 'WEBSITE':
      case 'URL':
        meta.url = val;
        break
      default:
        meta.extra[key] = val
    }
  }
}

function parseFlacPicture(buf, start, len, meta) {
  const view = new DataView(buf)
  let pos = start
  if (pos + 8 > start + len) return
  // const picType = u32be(view, pos)
  pos += 4
  const mimeLen = u32be(view, pos);
  pos += 4
  if (pos + mimeLen > start + len) return
  const mime = latin1(buf, pos, mimeLen);
  pos += mimeLen
  const descLen = u32be(view, pos);
  pos += 4;
  pos += descLen  // skip desc
  pos += 16  // width, height, depth, colors
  const dataLen = u32be(view, pos);
  pos += 4
  if (pos + dataLen > start + len) return
  const arr = new Uint8Array(buf, pos, dataLen)
  const mimeType = mime.includes('png') ? 'image/png' : 'image/jpeg'
  meta.cover = `data:${mimeType};base64,${bytes2B64(arr)}`
  meta.coverMime = mimeType
}

// ─── OGG Vorbis 解析器 ───────────────────────────────────────────────────────

function parseOGG(buf) {
  const view = new DataView(buf)
  const meta = emptyMeta()
  meta.format = 'OGG'

  if (buf.byteLength < 27) return meta
  // OggS capture pattern
  if (u8(view, 0) !== 0x4f || u8(view, 1) !== 0x67 || u8(view, 2) !== 0x67 || u8(view, 3) !== 0x53) return meta

  let pos = 0
  let pageCount = 0

  while (pos + 27 <= buf.byteLength && pageCount < 20) {
    if (u8(view, pos) !== 0x4f || u8(view, pos + 1) !== 0x67) break  // OggS
    // header_type: bit 0=continued, bit 1=first, bit 2=last
    pos += 6   // capture + version + header_type
    pos += 8   // granule position
    pos += 4   // serial number
    pos += 4   // page sequence
    pos += 4   // checksum

    const segCount = u8(view, pos);
    pos++
    let pageDataLen = 0
    for (let i = 0; i < segCount; i++) {
      pageDataLen += u8(view, pos++)
    }

    const pageDataStart = pos
    pos += pageDataLen
    pageCount++

    // Check if this page contains Vorbis comment header (packet type 3)
    if (pageDataStart + 7 <= buf.byteLength) {
      const packetType = u8(view, pageDataStart)
      // Vorbis: packet type 3 = comment header
      // Opus: "OpusTags" identifier
      if (packetType === 3 &&
        u8(view, pageDataStart + 1) === 0x76 && u8(view, pageDataStart + 2) === 0x6f) {
        // Skip 7-byte vorbis header
        parseVorbisComment(buf, pageDataStart + 7, pageDataLen - 7, meta)
        return meta
      }
      // Opus tags
      const opusTag = latin1(buf, pageDataStart, Math.min(8, pageDataLen))
      if (opusTag === 'OpusTags') {
        meta.format = 'OPUS'
        parseVorbisComment(buf, pageDataStart + 8, pageDataLen - 8, meta)
        return meta
      }
    }
  }
  return meta
}

// ─── WAV 解析器 ──────────────────────────────────────────────────────────────

function parseWAV(buf) {
  const view = new DataView(buf)
  const meta = emptyMeta()
  meta.format = 'WAV'

  if (buf.byteLength < 12) return meta
  if (u8(view, 0) !== 0x52 || u8(view, view, 1) !== 0x49) return meta  // RIFF

  const fileSize = u32le(view, 4)
  // WAVE
  if (u8(view, 8) !== 0x57 || u8(view, 9) !== 0x41 || u8(view, 10) !== 0x56 || u8(view, 11) !== 0x45) return meta

  let pos = 12
  while (pos + 8 <= buf.byteLength) {
    const chunkId = latin1(buf, pos, 4)
    const chunkSz = u32le(view, pos + 4)
    const dataStart = pos + 8
    if (chunkId === 'fmt ') {
      if (chunkSz >= 16) {
        meta.channels = u16le(view, dataStart + 2)
        meta.sampleRate = u32le(view, dataStart + 4)
        const byteRate = u32le(view, dataStart + 8)
        meta.bitrate = Math.round(byteRate * 8 / 1000)
      }
    } else if (chunkId === 'id3 ' || chunkId === 'ID3 ') {
      // Embedded ID3
      const id3Meta = parseID3v2(buf.slice(dataStart, dataStart + chunkSz))
      Object.assign(meta, id3Meta)
      meta.format = 'WAV'
    } else if (chunkId === 'LIST') {
      const listType = latin1(buf, dataStart, 4)
      if (listType === 'INFO') {
        let p = dataStart + 4
        const listEnd = dataStart + chunkSz
        while (p + 8 <= listEnd) {
          const infoId = latin1(buf, p, 4)
          const infoSz = u32le(view, p + 4)
          const infoVal = latin1(buf, p + 8, infoSz).replace(/\0/g, '').trim()
          switch (infoId) {
            case 'INAM':
              meta.title = infoVal;
              break
            case 'IART':
              meta.artist = infoVal;
              break
            case 'IPRD':
              meta.album = infoVal;
              break
            case 'ICRD':
              meta.year = infoVal.substring(0, 4);
              break
            case 'IGNR':
              meta.genre = infoVal;
              break
            case 'IENG':
              meta.composer = infoVal;
              break
            case 'ICMT':
              meta.comment = infoVal;
              break
            case 'ISRC':
              meta.isrc = infoVal;
              break
            case 'ITCH':
              meta.encoder = infoVal;
              break
            case 'ICOP':
              meta.copyright = infoVal;
              break
            default:
              if (infoVal) meta.extra[infoId] = infoVal
          }
          p += 8 + infoSz + (infoSz % 2)
        }
      }
    } else if (chunkId === 'data') {
      // Calculate duration from data size
      if (meta.sampleRate && meta.channels) {
        const bitsPerSample = 16  // default
        const bytesPerSample = (meta.channels * bitsPerSample) / 8
        if (bytesPerSample > 0) meta.duration = Math.round(chunkSz / (meta.sampleRate * bytesPerSample))
      }
    }
    pos = dataStart + chunkSz + (chunkSz % 2)
  }
  return meta
}

// ─── 主入口 ──────────────────────────────────────────────────────────────────

/**
 * 根据文件扩展名和 ArrayBuffer 解析音频元数据
 * @param {ArrayBuffer} buf
 * @param {string} filename
 * @returns {AudioMeta}
 */
export function parseAudioMetadata(buf, filename = '') {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
  try {
    if (ext === '.mp3' || ext === '.wma') return parseID3v2(buf)
    if (ext === '.m4a' || ext === '.aac' || ext === '.mp4') return parseMP4(buf)
    if (ext === '.flac' || ext === '.alac') return parseFLAC(buf)
    if (ext === '.ogg' || ext === '.opus') return parseOGG(buf)
    if (ext === '.wav') return parseWAV(buf)
  } catch (e) {
    console.warn('parseAudioMetadata error:', e)
  }
  return emptyMeta()
}

export {emptyMeta}
