/**
 * LRC 歌词解析器
 * 支持格式: [mm:ss.xx] 或 [mm:ss.xxx] 歌词内容
 */

/**
 * 解析 LRC 歌词文本
 * @param {string} lrcText - LRC 歌词原始文本
 * @returns {Array<{time: number, text: string}>} 解析后的歌词数组，按时间排序
 */
export function parseLRC(lrcText) {
  if (!lrcText) return []

  const lines = lrcText.split('\n')
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g
  const result = []

  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return

    // 提取所有时间标签（一行可能有多个时间标签）
    const timeMatches = []
    let match
    timeRegex.lastIndex = 0

    while ((match = timeRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      // 处理2位或3位毫秒
      const msStr = match[3]
      const milliseconds = msStr.length === 2
        ? parseInt(msStr) * 10
        : parseInt(msStr)

      // 转换为秒（浮点数）
      const totalSeconds = minutes * 60 + seconds + milliseconds / 1000
      timeMatches.push(totalSeconds)
    }

    if (timeMatches.length === 0) return

    // 提取歌词文本（去除所有时间标签）
    const text = trimmed.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim()

    // 为每个时间标签创建一条歌词记录
    timeMatches.forEach(time => {
      result.push({ time, text })
    })
  })

  // 按时间升序排序
  result.sort((a, b) => a.time - b.time)

  return result
}

/**
 * 根据当前播放时间找到对应的歌词索引
 * @param {Array} lyrics - 歌词数组
 * @param {number} currentTime - 当前播放时间（秒）
 * @returns {number} 当前歌词的索引，未找到返回 -1
 */
export function findCurrentLyricIndex(lyrics, currentTime) {
  if (!lyrics || lyrics.length === 0) return -1

  let index = -1
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= currentTime) {
      index = i
    } else {
      break
    }
  }
  return index
}