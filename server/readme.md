# StarMusicPlayer API Server

零依赖 Node.js 服务，为前端提供本地音乐文件的目录扫描与下载功能。

## 快速启动

```bash
# 默认：扫描当前目录，监听 3000 端口
node server.js

# 指定音乐根目录和端口
node server.js --root /Users/yourname/Music --port 8080
```

> 需要 Node.js 18+（使用 ES Module，`package.json` 中已设 `"type": "module"`）

---

## 接口文档

### `GET /api/files` — 扫描目录

递归扫描指定目录下的所有音频文件（mp3/flac/wav/aac/ogg/m4a/opus/wma/ape）和歌词文件（lrc），返回 JSON 文件树。

**查询参数**

| 参数   | 必填 | 说明 |
|--------|------|------|
| `dir`  | 否   | 相对于 root 的子目录路径，默认扫描 root 根目录 |
| `flat` | 否   | `flat=1` 返回扁平文件数组（方便搜索），默认返回树形结构 |

**树形响应示例**

```
GET /api/files?dir=Jazz
```

```json
{
  "success": true,
  "root": "/Users/yourname/Music",
  "dir": "Jazz",
  "scannedAt": "2025-03-08T12:00:00.000Z",
  "tree": {
    "type": "folder",
    "name": "Jazz",
    "relativePath": "Jazz",
    "mtime": "2025-01-01T00:00:00.000Z",
    "childCount": 2,
    "children": [
      {
        "type": "file",
        "name": "Miles Davis - So What.mp3",
        "ext": ".mp3",
        "relativePath": "Jazz/Miles Davis - So What.mp3",
        "size": 8456192,
        "sizeReadable": "8.07 MB",
        "mtime": "2024-06-15T10:30:00.000Z",
        "isAudio": true,
        "isLrc": false
      },
      {
        "type": "file",
        "name": "Miles Davis - So What.lrc",
        "ext": ".lrc",
        "relativePath": "Jazz/Miles Davis - So What.lrc",
        "size": 1280,
        "sizeReadable": "1.3 KB",
        "mtime": "2024-06-15T10:31:00.000Z",
        "isAudio": false,
        "isLrc": true
      }
    ]
  }
}
```

**扁平响应示例**

```
GET /api/files?flat=1
```

```json
{
  "success": true,
  "root": "/Users/yourname/Music",
  "dir": ".",
  "scannedAt": "2025-03-08T12:00:00.000Z",
  "totalFiles": 128,
  "files": [
    {
      "type": "file",
      "name": "song.mp3",
      "ext": ".mp3",
      "relativePath": "Pop/song.mp3",
      "size": 5242880,
      "sizeReadable": "5.00 MB",
      "mtime": "...",
      "isAudio": true,
      "isLrc": false
    }
  ]
}
```

---

### `GET /api/download` — 下载 / 流式播放文件

下载指定文件，支持 HTTP Range 请求（断点续传 / 音频流播放）。

**查询参数**

| 参数   | 必填 | 说明 |
|--------|------|------|
| `path` | 是   | 相对于 root 的文件路径（使用 `/api/files` 返回的 `relativePath` 字段） |

**示例**

```
GET /api/download?path=Jazz/Miles Davis - So What.mp3
```

**响应头**

```
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Content-Length: 8456192
Accept-Ranges: bytes
Content-Disposition: attachment; filename="Miles Davis - So What.mp3"; filename*=UTF-8''Miles%20Davis%20-%20So%20What.mp3
```

**Range 请求（音频流）**

```
GET /api/download?path=song.mp3
Range: bytes=0-1048575

HTTP/1.1 206 Partial Content
Content-Range: bytes 0-1048575/8456192
Content-Length: 1048576
```

---

## 安全机制

- **路径穿越防护**：所有路径在解析后均验证是否在 `ROOT_DIR` 内，`../../etc/passwd` 类攻击会被拦截返回 403
- **扩展名白名单**：只允许访问 `.mp3 .flac .wav .aac .ogg .m4a .opus .wma .ape .alac .lrc .txt`，其他类型文件一律拒绝
- **CORS**：响应头包含 `Access-Control-Allow-Origin: *`，前端本地开发可直接跨域调用

---

## 前端集成示例

```javascript
const API = 'http://localhost:3000'

// 扫描根目录
const res = await fetch(`${API}/api/files`)
const { tree } = await res.json()

// 流式播放（直接作为 <audio> src）
audio.src = `${API}/api/download?path=${encodeURIComponent(relativePath)}`

// 下载文件
window.open(`${API}/api/download?path=${encodeURIComponent(relativePath)}`)
```