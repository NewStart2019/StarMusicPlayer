<script setup>
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {findCurrentLyricIndex, parseLRC} from '../utils/lrcParser.js'
import {parsePlainLyrics} from '../utils/m4aMetadata.js'
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
      '--t-bg-image': 'url("/bg/daylight.svg")',
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
      '--t-bg-image': 'url("/bg/cyber.svg")',
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
      '--t-bg-image': 'none',
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
      '--t-bg-image': 'url("/bg/forest.svg")',
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
      '--t-bg-image': 'url("/bg/Aurora.png")',
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
      '--t-bg-image': 'url("/bg/ember.svg")',
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

const currentThemeId = ref(localStorage.getItem('sm-theme') || 'daylight')
const themeVars = computed(() => THEMES.find(t => t.id === currentThemeId.value)?.vars ?? {})
const applyTheme = (id) => {
  if (THEMES.find(t => t.id === id)) {
    currentThemeId.value = id
    localStorage.setItem('sm-theme', id)
  }
}

// =============================================
// Canvas Background Animation
// =============================================
const CANVAS_THEMES = new Set(['sakura'])
const bgCanvasRef = ref(null)
let bgCtx = null, bgW = 0, bgH = 0, bgRafId = null, bgFrame = 0

// ── Perlin Noise ──────────────────────────────
const _perm = new Uint8Array(512)
;(() => {
  const t = new Uint8Array(256)
  for (let i = 0; i < 256; i++) t[i] = i
  for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [t[i], t[j]] = [t[j], t[i]]
  }
  for (let i = 0; i < 512; i++) _perm[i] = t[i & 255]
})()
const _fade = t => t * t * t * (t * (t * 6 - 15) + 10)
const _lerp = (t, a, b) => a + t * (b - a)
const _grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y)

function bgNoise(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255
  x -= Math.floor(x);
  y -= Math.floor(y)
  const u = _fade(x), v = _fade(y)
  const a = _perm[X] + Y, b = _perm[X + 1] + Y
  return _lerp(v, _lerp(u, _grad(_perm[a], x, y), _grad(_perm[b], x - 1, y)),
      _lerp(u, _grad(_perm[a + 1], x, y - 1), _grad(_perm[b + 1], x - 1, y - 1)))
}

// ── Fire (单根外焰，缓慢跳动) ─────────────────
let singleFlame = null
const initFire = () => {
  // 单根火苗，居中，参数固定
  singleFlame = {
    x: 0, // 运行时按 bgW/2 计算
    baseW: 0, // 运行时按 bgW 比例计算
    // 三层正弦叠加，频率极慢，模拟真实外焰呼吸
    ph1: 0, ph2: 1.2, ph3: 2.5,
    ph4: 0.7, ph5: 3.1,          // 额外高频微抖
    flickPh: 0,
  }
}
const drawFire = () => {
  const c = bgCtx
  c.clearRect(0, 0, bgW, bgH)
  c.fillStyle = '#060100';
  c.fillRect(0, 0, bgW, bgH)

  const fl = singleFlame
  const cx = bgW / 2
  const bw = bgW * 0.22   // 底部半宽
  const baseY = bgH

  // 极慢相位推进 —— 产生缓慢呼吸感
  fl.ph1 += 0.008
  fl.ph2 += 0.013
  fl.ph3 += 0.006
  fl.ph4 += 0.022
  fl.ph5 += 0.031
  fl.flickPh += 0.018

  // 高度：主呼吸 + 次波动，变化范围约 ±18%
  const breathe = Math.sin(fl.ph1) * 0.12 + Math.sin(fl.ph2) * 0.06 + Math.sin(fl.ph3) * 0.04
  const flicker = Math.sin(fl.ph4) * 0.025 + Math.sin(fl.ph5) * 0.015
  const h = bgH * (0.55 + breathe + flicker)

  // 火尖横向漂移：极慢，幅度小
  const sway = Math.sin(fl.ph1 * 0.8) * bgW * 0.018 + Math.sin(fl.ph2 * 1.1) * bgW * 0.010

  const tipX = cx + sway
  const tipY = baseY - h

  // 贝塞尔控制点 —— 外焰轮廓：底宽、腰收、尖细
  const cp1x = cx - bw * 0.82 + sway * 0.15, cp1y = baseY - h * 0.32
  const cp2x = tipX - bw * 0.12, cp2y = tipY + h * 0.20
  const cp3x = tipX + bw * 0.12, cp3y = tipY + h * 0.20
  const cp4x = cx + bw * 0.82 + sway * 0.15, cp4y = baseY - h * 0.32

  // 外焰渐变：底透明 → 深红 → 橙 → 黄白尖
  const brightnessBoost = 0.85 + Math.sin(fl.flickPh) * 0.15
  const gr = c.createLinearGradient(cx, baseY, tipX, tipY)
  gr.addColorStop(0, 'rgba(0,0,0,0)')
  gr.addColorStop(0.08, `rgba(180,15,0,${0.38 * brightnessBoost})`)
  gr.addColorStop(0.30, `rgba(255,55,0,${0.65 * brightnessBoost})`)
  gr.addColorStop(0.58, `rgba(255,130,15,${0.78 * brightnessBoost})`)
  gr.addColorStop(0.80, `rgba(255,205,50,${0.72 * brightnessBoost})`)
  gr.addColorStop(0.94, `rgba(255,248,160,${0.55 * brightnessBoost})`)
  gr.addColorStop(1, 'rgba(255,255,255,0)')

  c.save();
  c.globalCompositeOperation = 'screen'
  c.fillStyle = gr
  c.beginPath()
  c.moveTo(cx - bw, baseY)
  c.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tipX, tipY)
  c.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, cx + bw, baseY)
  c.closePath()
  c.fill()

  // 底部辉光晕
  const baseGlow = c.createRadialGradient(cx, baseY, 0, cx, baseY, bw * 1.6)
  baseGlow.addColorStop(0, `rgba(255,70,0,${0.22 * brightnessBoost})`)
  baseGlow.addColorStop(0.5, `rgba(200,30,0,${0.10 * brightnessBoost})`)
  baseGlow.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = baseGlow;
  c.fillRect(cx - bw * 2, baseY - bw * 1.6, bw * 4, bw * 1.6)

  c.restore()
}

// ── Aurora ────────────────────────────────────
let bgStars = [], auroraLayers = []
const initAurora = () => {
  bgStars = []
  for (let i = 0; i < 240; i++) bgStars.push({
    x: Math.random() * bgW, y: Math.random() * bgH * 0.83,
    r: 0.3 + Math.random() * 1.5, tw: Math.random() * Math.PI * 2,
    sp: 0.015 + Math.random() * 0.04, base: 0.3 + Math.random() * 0.7
  })
  auroraLayers = [
    {h: 145, s: 88, spd: 0.00042, amp: bgH * 0.16, ph: 0, fr: 1.35, yb: bgH * 0.22, wb: bgH * 0.30, al: 0.58},
    {h: 160, s: 82, spd: 0.00060, amp: bgH * 0.11, ph: 1.4, fr: 1.05, yb: bgH * 0.30, wb: bgH * 0.22, al: 0.46},
    {h: 200, s: 78, spd: 0.00030, amp: bgH * 0.13, ph: 3.1, fr: 0.88, yb: bgH * 0.18, wb: bgH * 0.25, al: 0.40},
    {h: 272, s: 65, spd: 0.00072, amp: bgH * 0.10, ph: 0.7, fr: 1.62, yb: bgH * 0.38, wb: bgH * 0.18, al: 0.32},
    {h: 125, s: 92, spd: 0.00050, amp: bgH * 0.12, ph: 2.3, fr: 1.18, yb: bgH * 0.26, wb: bgH * 0.20, al: 0.38},
  ]
}
const drawAurora = () => {
  const c = bgCtx
  c.fillStyle = '#04080f';
  c.fillRect(0, 0, bgW, bgH)
  c.save();
  c.globalCompositeOperation = 'screen'
  const steps = 110
  for (const L of auroraLayers) {
    L.ph += L.spd
    const pts = []
    for (let i = 0; i <= steps; i++) {
      const x = i / steps * bgW
      const n1 = Math.sin(x * 0.0028 * L.fr + L.ph * 2.4) * L.amp
      const n2 = Math.sin(x * 0.0052 * L.fr + L.ph * 1.6) * (L.amp * 0.38)
      const n3 = bgNoise(x * 0.003 + L.ph, L.ph * 0.8) * (L.amp * 0.55)
      pts.push({x, y: L.yb + n1 + n2 + n3})
    }
    const slices = 72
    for (let s = 0; s < slices; s++) {
      const pr = s / slices, bell = Math.pow(Math.sin(pr * Math.PI), 1.5) * L.al
      const hShift = Math.sin(pr * Math.PI * 3 + L.ph * 6) * 18
      const lum = 50 + pr * 22 + Math.sin(pr * Math.PI * 2) * 10
      c.strokeStyle = `hsla(${L.h + hShift},${L.s}%,${lum}%,${bell})`
      c.lineWidth = L.wb / slices * 3.8;
      c.beginPath()
      const yOff = (pr - 0.5) * L.wb
      for (let i = 0; i <= steps; i++) {
        const p = pts[i];
        i === 0 ? c.moveTo(p.x, p.y + yOff) : c.lineTo(p.x, p.y + yOff)
      }
      c.stroke()
    }
    c.strokeStyle = `hsla(${L.h + 15},100%,88%,${L.al * 0.5})`;
    c.lineWidth = 1.2;
    c.beginPath()
    for (let i = 0; i <= steps; i++) {
      const p = pts[i];
      const sh = Math.sin(i * 0.18 + bgFrame * 0.07 + L.ph * 5) * 5;
      i === 0 ? c.moveTo(p.x, p.y + sh) : c.lineTo(p.x, p.y + sh)
    }
    c.stroke()
  }
  c.restore()
}


// ── Sakura ────────────────────────────────────
let bgPetals = []
const mkPetal = (init) => ({
  x: Math.random() * (bgW + 160) - 80,
  y: init ? Math.random() * bgH : -(10 + Math.random() * 40),
  vx: -0.3 - Math.random() * 0.7, vy: 0.15 + Math.random() * 0.40,
  rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.018,
  swPh: Math.random() * Math.PI * 2, swAmp: 0.4 + Math.random() * 1.4,
  swFr: 0.008 + Math.random() * 0.016,
  flPh: Math.random() * Math.PI * 2, flV: 0.018 + Math.random() * 0.032,
  sz: 4 + Math.random() * 10, alpha: 0.45 + Math.random() * 0.50,
  depth: 0.35 + Math.random() * 0.65, hue: 328 + Math.random() * 28,
  sat: 55 + Math.random() * 35, lum: 78 + Math.random() * 15
})
const drawSakuraPetal = (c, p) => {
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.rot)
  const fl = Math.abs(Math.cos(p.flPh)) * 0.5 + 0.5;
  c.scale(1, fl)
  const a = p.alpha * p.depth, s = p.sz
  c.fillStyle = `hsla(${p.hue},${p.sat}%,${p.lum}%,${a})`
  c.beginPath()
  c.moveTo(0, -s);
  c.bezierCurveTo(s * 0.9, -s * 0.9, s * 1.1, s * 0.1, 0, s * 0.5)
  c.bezierCurveTo(-s * 1.1, s * 0.1, -s * 0.9, -s * 0.9, 0, -s);
  c.fill()
  c.strokeStyle = `hsla(${p.hue - 5},${p.sat - 10}%,${p.lum - 18}%,${a * 0.3})`;
  c.lineWidth = 0.5
  c.beginPath();
  c.moveTo(0, -s);
  c.lineTo(0, -s * 0.65);
  c.stroke()
  c.strokeStyle = `hsla(${p.hue - 10},${p.sat - 15}%,${p.lum - 22}%,${a * 0.2})`;
  c.lineWidth = 0.4
  c.beginPath();
  c.moveTo(0, s * 0.35);
  c.lineTo(s * 0.45, -s * 0.25);
  c.stroke()
  c.beginPath();
  c.moveTo(0, s * 0.35);
  c.lineTo(-s * 0.45, -s * 0.25);
  c.stroke()
  c.restore()
}
const initSakura = () => {
  bgPetals = []
  for (let i = 0; i < 35; i++) bgPetals.push(mkPetal(true))
}
const drawSakura = () => {
  const c = bgCtx
  c.fillStyle = '#130818';
  c.fillRect(0, 0, bgW, bgH)
  const glow = c.createRadialGradient(bgW * 0.5, bgH * 0.4, 0, bgW * 0.5, bgH * 0.4, bgW * 0.55)
  glow.addColorStop(0, 'rgba(200,100,160,0.08)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = glow;
  c.fillRect(0, 0, bgW, bgH)
  const t = bgFrame * 0.008
  const wStr = 0.8 + Math.sin(t * 0.6) * 0.25 + Math.sin(t * 1.5) * 0.1
  for (let i = bgPetals.length - 1; i >= 0; i--) {
    const p = bgPetals[i]
    p.swPh += p.swFr;
    p.flPh += p.flV;
    p.rot += p.rotV
    p.x += p.vx * wStr + Math.sin(p.swPh) * p.swAmp
    p.y += p.vy + Math.cos(p.swPh * 0.8) * 0.15
    if (p.y > bgH + 20 || p.x < -80 || p.x > bgW + 80) bgPetals[i] = mkPetal(false)
    else drawSakuraPetal(c, p)
  }
  while (bgPetals.length < 35) bgPetals.push(mkPetal(false))
}

// ── Canvas lifecycle ──────────────────────────
const startBgCanvas = (themeId) => {
  stopBgCanvas()
  const canvas = bgCanvasRef.value
  if (!canvas) return
  bgW = canvas.width = canvas.offsetWidth || window.innerWidth
  bgH = canvas.height = canvas.offsetHeight || window.innerHeight
  bgCtx = canvas.getContext('2d')
  bgFrame = 0
  if (themeId === 'ember') initFire()
  else if (themeId === 'sakura') initSakura()
  const loop = () => {
    bgFrame++
    if (themeId === 'ember') drawFire()
    else if (themeId === 'sakura') drawSakura()
    bgRafId = requestAnimationFrame(loop)
  }
  bgRafId = requestAnimationFrame(loop)
}
const stopBgCanvas = () => {
  if (bgRafId) {
    cancelAnimationFrame(bgRafId);
    bgRafId = null
  }
}
let _bgResizeTimer = null
const onBgResize = () => {
  clearTimeout(_bgResizeTimer)
  _bgResizeTimer = setTimeout(() => {
    if (CANVAS_THEMES.has(currentThemeId.value)) {
      nextTick(() => startBgCanvas(currentThemeId.value))
    }
  }, 200)
}
watch(currentThemeId, (id) => {
  stopBgCanvas()
  if (CANVAS_THEMES.has(id)) nextTick(() => startBgCanvas(id))
})

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
const volume = ref(parseFloat(localStorage.getItem('sm-volume') ?? '0.8'))
const isDragging = ref(false)
const favorites = ref(new Set())
const favoriteNames = computed(() => Array.from(favorites.value))
const lyrics = ref([])
const audioMeta = ref(null)
const audioFileSize = ref(0)
const bufferPercent = ref(0)
const currentLyricIndex = ref(-1)
const albumRotation = ref(0)
const audioRef = ref(null)
const playerViewRef = ref(null)

const playMode = ref('order')
const cyclePlayMode = () => {
  playMode.value = {order: 'shuffle', shuffle: 'repeat', repeat: 'order'}[playMode.value]
}

const sleepMinutes = ref(0)
const sleepEndTime = ref(0)
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
    audioRef.value?.pause();
    isPlaying.value = false;
    stopAlbumRotation()
    sleepMinutes.value = 0;
    sleepEndTime.value = 0;
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
  if (currentSong.value?.metaArtist) return currentSong.value.metaArtist
  if (audioMeta.value?.artist) return audioMeta.value.artist
  const i = songTitle.value.indexOf(' - ')
  return i > 0 ? songTitle.value.substring(0, i) : '未知艺术家'
})
const displayTitle = computed(() => {
  if (currentSong.value?.metaTitle) return currentSong.value.metaTitle
  if (audioMeta.value?.title) return audioMeta.value.title
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
  errorMsg.value = '';
  sourceMode.value = 'local'
  buildVirtualFS(files);
  hasFolder.value = true;
  pathStack.value = [];
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
const serverBase = ref(window.location.origin)
const buildServerUrl = (path = '') => {
  const base = serverBase.value || window.location.origin
  if (/^https?:\/\//i.test(path)) return path
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${prefix}${suffix}`
}
const connectServer = async ({url} = {}) => {
  const base = (url || window.location.origin).replace(/\/$/, '')
  fileBrowserRef.value?.setServerLoading(true)
  fileBrowserRef.value?.setServerError('')
  try {
    const res = await fetch(`${base}/api/files?flat=0`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data.success) throw new Error(data.error || '服务器返回失败')
    serverBase.value = base;
    serverTree.value = convertServerTree(data.tree, [])
    allEntries.value = serverTree.value;
    hasFolder.value = true;
    sourceMode.value = 'server'
    pathStack.value = [];
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
      type: 'folder',
      name: node.name,
      path: currentPath,
      source: 'server',
      children: (node.children || []).map(c => convertServerTree(c, currentPath))
    }
  return {
    type: 'file', name: node.name, ext: node.ext, relativePath: node.relativePath,
    url: node.url, lrc: node.lrc ?? null, isAudio: node.isAudio, isLrc: node.isLrc,
    source: 'server', path: currentPath,
    metaTitle: node.metaTitle ?? null, metaArtist: node.metaArtist ?? null,
    metaAlbum: node.metaAlbum ?? null, metaLyrics: node.metaLyrics ?? null,
    metaComposer: node.metaComposer ?? null, metaGenre: node.metaGenre ?? null, metaDate: node.metaDate ?? null,
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
  const items = (node.children || []).filter(e => e.type === 'folder' ? hasAudioInServerFolder(e) : e.isAudio)
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name)
  })
  currentEntries.value = items
  pathStack.value = pathParts.length > 0 ? pathParts.map((name, i) => ({name, path: pathParts.slice(0, i + 1)})) : []
}

const hasAudioInServerFolder = (folder) =>
    (folder.children || []).some(e => (e.type === 'file' && e.isAudio) || (e.type === 'folder' && hasAudioInServerFolder(e)))

const disconnectServer = () => {
  sourceMode.value = 'local';
  hasFolder.value = false;
  serverBase.value = ''
  serverTree.value = null;
  allEntries.value = null;
  currentEntries.value = [];
  pathStack.value = []
  exitSearchMode();
  if (showPlayer.value) closePlayer()
}

const refreshServer = () => {
  connectServer({url: serverBase.value || window.location.origin})
}

// =============================================
// 导航
// =============================================
const enterFolder = (entry) => {
  exitSearchMode();
  fileBrowserRef.value?.clearSearch()
  if (sourceMode.value === 'server') navigateToServerPath(entry.path.slice(1))
  else navigateToPath(entry.path.slice(1))
}
const goBack = () => {
  exitSearchMode();
  fileBrowserRef.value?.clearSearch()
  const nav = sourceMode.value === 'server' ? navigateToServerPath : navigateToPath
  if (pathStack.value.length <= 1) {
    pathStack.value = [];
    nav([])
  } else nav(pathStack.value[pathStack.value.length - 2].path)
}
const goRoot = () => {
  exitSearchMode();
  fileBrowserRef.value?.clearSearch();
  pathStack.value = []
  if (sourceMode.value === 'server') navigateToServerPath([])
  else navigateToPath([])
}
const breadcrumbNav = (item) => {
  exitSearchMode();
  fileBrowserRef.value?.clearSearch()
  if (sourceMode.value === 'server') navigateToServerPath(item.path)
  else navigateToPath(item.path)
}

const collectLocalAudio = (node, result = []) => {
  if (!node?.children) return result
  node.children.forEach(e => {
    if (e.isAudio) result.push(e); else if (e.type === 'folder') collectLocalAudio(e, result)
  })
  return result
}
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
  const all = sourceMode.value === 'server' ? collectServerAudio(allEntries.value) : collectLocalAudio(allEntries.value)
  searchResults.value = all.filter(e => e.name.toLowerCase().includes(q))
  isSearchMode.value = true
}
const exitSearchMode = () => {
  isSearchMode.value = false;
  searchResults.value = null
}

// =============================================
// 播放控制
// =============================================
const playAudio = async (entry, visibleList) => {
  const source = visibleList ?? currentEntries.value
  const audioList = source.filter(e => e.type === 'file' && e.isAudio)
  playlist.value = audioList
  const idx = audioList.findIndex(e => e.name === entry.name && e.url === entry.url)
  currentIndex.value = idx >= 0 ? idx : 0
  showPlayer.value = true
  await loadAndPlay(currentIndex.value)
}

const addSongToNext = async (song) => {
  if (!song) return
  if (!playlist.value.length) {
    playlist.value = [song]
    currentIndex.value = 0
    showPlayer.value = true
    await loadAndPlay(0)
    return
  }
  const insertIndex = Math.min(currentIndex.value + 1, playlist.value.length)
  playlist.value.splice(insertIndex, 0, song)
}

const CACHE_NAME = 'sm-audio-v1'
const CACHE_MAX = 25
const CACHE_KEYS_LS = 'sm-audio-cache-keys'
const MEMORY_CACHE_MAX = 12
const cacheToast = ref('')
let cacheToastTimer = null
const cacheDialogMsg = ref('')
const showCacheDialog = ref(false)
const memoryBlobCache = new Map()
const memoryCacheOrder = []

const showCacheToast = (msg, dur = 1600) => {
  cacheToast.value = msg
  if (cacheToastTimer) clearTimeout(cacheToastTimer)
  cacheToastTimer = setTimeout(() => cacheToast.value = '', dur)
}

const openCacheDialog = (msg) => {
  cacheDialogMsg.value = msg
  showCacheDialog.value = true
}
const closeCacheDialog = () => showCacheDialog.value = false

const clearCachedSongs = async () => {
  try {
    let cleared = 0
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME)
      const keys = await cache.keys()
      await Promise.all(keys.map(req => cache.delete(req)))
      cleared = keys.length
    }
    memoryBlobCache.clear()
    memoryCacheOrder.length = 0
    localStorage.removeItem(CACHE_KEYS_LS)
    const msg = cleared ? `清理成功（${cleared} 项）` : '清理成功'
    showCacheToast(msg)
    openCacheDialog(msg)
  } catch (e) {
    console.error('清除缓存失败:', e);
    const msg = '清理缓存失败'
    showCacheToast(msg)
    openCacheDialog(msg)
  }
}

const getCacheKeys = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEYS_LS) || '[]')
  } catch {
    return []
  }
}
const saveCacheKeys = (keys) => {
  localStorage.setItem(CACHE_KEYS_LS, JSON.stringify(keys))
}

const evictOldCache = async (cache, keys) => {
  while (keys.length > CACHE_MAX) {
    const old = keys.shift();
    await cache.delete(old).catch(() => {
    })
  }
}

const touchCacheKey = (url) => {
  const keys = getCacheKeys();
  const idx = keys.indexOf(url)
  if (idx !== -1) keys.splice(idx, 1);
  keys.push(url);
  saveCacheKeys(keys);
  return keys
}

const touchMemoryKey = (url) => {
  const idx = memoryCacheOrder.indexOf(url)
  if (idx !== -1) memoryCacheOrder.splice(idx, 1)
  memoryCacheOrder.push(url)
}

const rememberBlob = (url, blob) => {
  memoryBlobCache.set(url, blob)
  touchMemoryKey(url)
  while (memoryCacheOrder.length > MEMORY_CACHE_MAX) {
    const oldKey = memoryCacheOrder.shift()
    memoryBlobCache.delete(oldKey)
  }
}

const getMemoryBlobUrl = (url) => {
  const blob = memoryBlobCache.get(url)
  if (!blob) return null
  touchMemoryKey(url)
  return URL.createObjectURL(blob)
}

const MUST_PRELOAD_EXTS = new Set(['.m4a', '.aac', '.mp4'])

const resolveAudioSrc = async (song) => {
  if (song.source !== 'server') return URL.createObjectURL(song.fileObj)
  const url = buildServerUrl(song.url || '')
  const memUrl = getMemoryBlobUrl(url)
  if (memUrl) return memUrl
  const ext = song.name.substring(song.name.lastIndexOf('.')).toLowerCase()
  try {
    if (typeof caches !== 'undefined' && caches?.open) {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(url)
      if (cached) {
        touchCacheKey(url);
        const blob = await cached.blob();
        rememberBlob(url, blob)
        return URL.createObjectURL(blob)
      }
      if (MUST_PRELOAD_EXTS.has(ext)) {
        const resp = await fetch(url)
        if (!resp.ok) return url
        const blob = await resp.blob()
        cache.put(url, new Response(blob, {headers: {'Content-Type': blob.type || 'audio/mp4'}})).then(() => {
          const keys = touchCacheKey(url);
          evictOldCache(cache, keys);
          saveCacheKeys(keys.slice(-CACHE_MAX))
        }).catch(() => {
        })
        touchCacheKey(url);
        rememberBlob(url, blob)
        return URL.createObjectURL(blob)
      }
      cacheAudioInBackground(cache, url);
      return url
    }
    // Cache API 不可用时的内存兜底
    const resp = await fetch(url)
    if (!resp.ok) return url
    const blob = await resp.blob()
    rememberBlob(url, blob)
    return URL.createObjectURL(blob)
  } catch {
    if (MUST_PRELOAD_EXTS.has(ext)) {
      try {
        const blob = await fetch(url).then(r => r.blob());
        rememberBlob(url, blob)
        return URL.createObjectURL(blob)
      } catch {
        return url
      }
    }
    return url
  }
}

const cacheAudioInBackground = async (cache, url) => {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return
    await cache.put(url, resp.clone())
    const keys = touchCacheKey(url);
    await evictOldCache(cache, keys);
    saveCacheKeys(keys.slice(-CACHE_MAX))
  } catch {
  }
}

let _playPromise = null, _loadToken = 0

const loadAndPlay = async (index) => {
  if (index < 0 || index >= playlist.value.length) return
  const token = ++_loadToken
  currentIndex.value = index
  const song = playlist.value[index]
  const audio = audioRef.value
  try {
    const up = audio.play();
    audio.pause();
    if (up) up.catch(() => {
    })
  } catch (_) {
  }
  if (_playPromise) {
    try {
      await _playPromise
    } catch {
    }
    ;_playPromise = null
  }
  audio.pause()
  bufferPercent.value = 0;
  duration.value = 0;
  currentTime.value = 0
  let src
  if (song.source === 'server') {
    src = await resolveAudioSrc(song)
  } else {
    const ext = song.name.substring(song.name.lastIndexOf('.')).toLowerCase()
    if (MUST_PRELOAD_EXTS.has(ext)) {
      const mime = {'.m4a': 'audio/mp4', '.aac': 'audio/aac', '.mp4': 'audio/mp4'}[ext] || 'audio/mp4'
      const buf = await song.fileObj.arrayBuffer()
      src = URL.createObjectURL(new Blob([buf], {type: mime}))
    } else {
      src = URL.createObjectURL(song.fileObj)
    }
  }
  if (token !== _loadToken) {
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    return
  }
  if (audio.src?.startsWith('blob:')) URL.revokeObjectURL(audio.src)
  audio.src = src
  audio.volume = volume.value
  try {
    _playPromise = audio.play();
    await _playPromise;
    _playPromise = null
    isPlaying.value = true;
    startAlbumRotation()
  } catch (e) {
    _playPromise = null
    if (e?.name !== 'AbortError') console.error('播放失败:', e?.message ?? e)
    isPlaying.value = false
  }
  await loadLyrics(song)
}

const lrcRegex = /\[\d{1,3}:\d{2}/
const applyLyricsText = (text) => {
  if (!text?.trim()) return false
  if (lrcRegex.test(text)) {
    const parsed = parseLRC(text);
    if (parsed.length) {
      lyrics.value = parsed;
      return true
    }
  } else {
    const plain = parsePlainLyrics(text);
    if (plain?.length) {
      lyrics.value = plain;
      return true
    }
  }
  return false
}

const loadLyrics = async (song) => {
  lyrics.value = [];
  currentLyricIndex.value = -1;
  audioMeta.value = null;
  audioFileSize.value = 0
  if (song.source === 'server') {
    if (song.lrc) {
      try {
        const text = await fetch(buildServerUrl(song.lrc)).then(r => r.text());
        if (applyLyricsText(text)) return
      } catch (e) {
        console.warn('LRC fetch 失败:', e)
      }
    }
  } else {
    const lrcName = song.name.replace(/\.[^.]+$/, '') + '.lrc'
    const dirPath = song.path.slice(1, -1)
    let node = allEntries.value
    for (const p of dirPath) {
      if (node.children?.has(p)) node = node.children.get(p); else {
        node = null;
        break
      }
    }
    if (node?.children?.has(lrcName)) {
      try {
        const text = await node.children.get(lrcName).fileObj.text();
        if (applyLyricsText(text)) return
      } catch (e) {
        console.warn('LRC 读取失败:', e)
      }
    }
  }
  if (song.metaLyrics) {
    if (applyLyricsText(song.metaLyrics)) return
  }
  if (song.source === 'server') {
    try {
      const urlObj = new URL(buildServerUrl(song.url || ''), window.location.origin)
      const relPath = song.relativePath || urlObj.searchParams.get('path')
      if (relPath) {
        const metaResp = await fetch(buildServerUrl(`/api/metadata?path=${encodeURIComponent(relPath)}`))
        if (metaResp.ok) {
          const data = await metaResp.json()
          if (data.success) {
            audioMeta.value = data.meta
            audioFileSize.value = data.size || 0
            if (data.meta?.lyrics) applyLyricsText(data.meta.lyrics)
          }
        }
      }
    } catch (e) {
      console.warn('元数据请求失败:', e)
    }
  } else if (song.fileObj) {
    audioFileSize.value = song.fileObj.size || 0
  }
}

const togglePlay = async () => {
  const audio = audioRef.value
  if (!audio || !currentSong.value) return
  if (isPlaying.value) {
    if (_playPromise) {
      try {
        await _playPromise
      } catch {
      }
      ;_playPromise = null
    }
    audio.pause();
    isPlaying.value = false;
    stopAlbumRotation()
  } else {
    try {
      _playPromise = audio.play();
      await _playPromise;
      _playPromise = null;
      isPlaying.value = true;
      startAlbumRotation()
    } catch (e) {
      _playPromise = null;
      if (e?.name !== 'AbortError') console.error('togglePlay 失败:', e?.message ?? e)
    }
  }
}
const prevSong = () => {
  if (!playlist.value.length) return;
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
    if (playlist.value.length > 1 && idx === currentIndex.value) idx = (idx + 1) % playlist.value.length
    loadAndPlay(idx)
  } else {
    loadAndPlay((currentIndex.value + 1) % playlist.value.length)
  }
}
const toggleFavorite = async (targetSong = currentSong.value) => {
  if (!targetSong) return
  const n = targetSong.name
  const wasFav = favorites.value.has(n)
  const next = new Set(favorites.value)
  wasFav ? next.delete(n) : next.add(n)
  favorites.value = next

  if (showFavorites.value && targetSong.source === 'server') {
    if (!wasFav) {
      favoritesList.value = [targetSong, ...favoritesList.value.filter(s => s.name !== n)]
    } else {
      favoritesList.value = favoritesList.value.filter(s => s.name !== n)
    }
  }

  if (targetSong.source === 'server') {
    try {
      if (!wasFav) await fetch(buildServerUrl('/api/favorite/add'), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(targetSong)
      })
      else await fetch(buildServerUrl('/api/favorite/remove'), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({url: targetSong.url, name: targetSong.name})
      })
    } catch (e) {
      console.error('收藏接口错误:', e)
    }
  }
}

const showFavorites = ref(false)
const favoritesList = ref([])
const favLoading = ref(false)
const favError = ref('')

const loadFavorites = async () => {
  if (sourceMode.value !== 'server') {
    favError.value = '请先连接服务器';
    return
  }
  favLoading.value = true;
  favError.value = ''
  try {
    const res = await fetch(buildServerUrl('/api/favorite/data'));
    const data = await res.json()
    if (data.success) {
      favoritesList.value = data.data;
      favorites.value = new Set(data.data.map(s => s.name))
    } else favError.value = data.error || '获取收藏失败'
  } catch (e) {
    favError.value = `请求失败: ${e.message}`
  } finally {
    favLoading.value = false
  }
}

const toggleFavPanel = () => {
  if (!showFavorites.value) {
    showFavorites.value = true;
    loadFavorites()
  } else {
    showFavorites.value = false
  }
}

// 收藏面板下滑关闭（移动端）
let favSheetGesture = null
const onFavTouchStart = (e) => {
  if (e.touches.length !== 1) return
  const {clientX: x, clientY: y} = e.touches[0]
  favSheetGesture = {x, y, time: performance.now(), lastY: y, active: false}
}
const onFavTouchMove = (e) => {
  if (!favSheetGesture) return
  const {clientX: x, clientY: y} = e.touches[0]
  const dy = y - favSheetGesture.y
  const dx = x - favSheetGesture.x
  favSheetGesture.lastY = y
  if (!favSheetGesture.active && dy > 25 && dy > Math.abs(dx) * 1.2) {
    favSheetGesture.active = true
  }
  if (favSheetGesture.active) e.preventDefault()
}
const onFavTouchEnd = () => {
  if (!favSheetGesture) return
  const dy = (favSheetGesture.lastY ?? favSheetGesture.y) - favSheetGesture.y
  const dt = performance.now() - favSheetGesture.time
  if (favSheetGesture.active && dy > 80 && dt < 900) showFavorites.value = false
  favSheetGesture = null
}

const playFromFavorites = async (song) => {
  const audioList = favoritesList.value.filter(e => e.isAudio !== false)
  playlist.value = audioList
  const idx = audioList.findIndex(e => e.url === song.url || e.name === song.name)
  currentIndex.value = idx >= 0 ? idx : 0;
  showPlayer.value = true
  await loadAndPlay(currentIndex.value)
}
const closePlayer = () => {
  showPlayer.value = false
}

const updateBufferedPercent = () => {
  const audio = audioRef.value
  if (!audio) {
    bufferPercent.value = 0;
    return
  }
  const dur = audio.duration
  if (!Number.isFinite(dur) || dur <= 0) {
    bufferPercent.value = 0;
    return
  }
  try {
    const ranges = audio.buffered
    if (!ranges || ranges.length === 0) {
      bufferPercent.value = 0;
      return
    }
    let end = 0
    for (let i = 0; i < ranges.length; i++) end = Math.max(end, ranges.end(i))
    const pct = Math.min(100, (end / dur) * 100)
    bufferPercent.value = (audio.readyState >= 4 || end >= dur - 0.25) ? 100 : pct
  } catch {
    bufferPercent.value = 0
  }
}

const onAudioEnded = () => {
  if (sleepMinutes.value === -1) {
    audioRef.value?.pause();
    isPlaying.value = false;
    stopAlbumRotation();
    sleepMinutes.value = 0;
    sleepEndTime.value = 0;
    return
  }
  nextSong(true)
}
const onLoadedMetadata = () => {
  duration.value = audioRef.value?.duration || 0;
  updateBufferedPercent()
}
const onCanPlayThrough = () => {
  bufferPercent.value = 100
}
const onTimeUpdate = () => {
  if (!isDragging.value) currentTime.value = audioRef.value?.currentTime || 0;
  updateLyric();
  updateBufferedPercent()
}
const onProgress = () => updateBufferedPercent()

const updateLyric = () => {
  if (!lyrics.value.length) return
  const idx = findCurrentLyricIndex(lyrics.value, currentTime.value)
  if (idx !== currentLyricIndex.value) {
    currentLyricIndex.value = idx
    nextTick(() => {
      const pv = playerViewRef.value
      scrollLyric(pv?.lyricsContainerRef, idx);
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
  if (index === currentIndex.value) {
    audioRef.value?.pause();
    isPlaying.value = false;
    stopAlbumRotation()
    playlist.value.splice(index, 1)
    if (playlist.value.length === 0) closePlayer()
    else {
      const nextIdx = Math.min(index, playlist.value.length - 1);
      currentIndex.value = -1;
      loadAndPlay(nextIdx)
    }
  } else {
    playlist.value.splice(index, 1);
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
const getProgressEl = () => {
  const pv = playerViewRef.value;
  if (!pv) return null
  const mobile = pv.mobileProgressRef?.value ?? pv.mobileProgressRef
  const desktop = pv.progressBarRef?.value ?? pv.progressBarRef
  if (mobile && mobile.getBoundingClientRect().width > 0) return mobile
  return desktop
}
const onSeek = (event) => {
  const el = getProgressEl();
  if (!el) return;
  const ratio = getProgressRatio(event, el);
  audioRef.value.currentTime = ratio * duration.value;
  currentTime.value = ratio * duration.value
}
const onDragStart = (event) => {
  isDragging.value = true
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDragMove, {passive: false});
  document.addEventListener('touchend', stopDrag)
  onDragMove(event)
}
const onDragMove = (event) => {
  if (!isDragging.value) return;
  if (event.cancelable) event.preventDefault()
  const el = getProgressEl();
  if (!el) return
  currentTime.value = getProgressRatio(event, el) * duration.value
}
const stopDrag = () => {
  if (isDragging.value) {
    audioRef.value.currentTime = currentTime.value;
    isDragging.value = false
  }
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDragMove);
  document.removeEventListener('touchend', stopDrag)
}
const onVolumeChange = (event) => {
  volume.value = parseFloat(event.target.value)
  if (audioRef.value) audioRef.value.volume = volume.value
  localStorage.setItem('sm-volume', volume.value)
}

// =============================================
// 专辑旋转
// =============================================
const startAlbumRotation = () => {
  if (rotationRafId) return;
  lastTimestamp = null
  const animate = (ts) => {
    if (!lastTimestamp) lastTimestamp = ts
    albumRotation.value = (albumRotation.value + (ts - lastTimestamp) * 0.018) % 360
    lastTimestamp = ts;
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

const applyThemeToBody = (vars) => {
  Object.entries(vars).forEach(([k, v]) => document.body.style.setProperty(k, v))
}
watch(themeVars, applyThemeToBody, {immediate: true})

const seekBy = (delta) => {
  const audio = audioRef.value;
  if (!audio || !duration.value) return
  const next = Math.min(Math.max(audio.currentTime + delta, 0), duration.value)
  audio.currentTime = next;
  currentTime.value = next
}
const onKeyDown = (e) => {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      seekBy(3);
      break
    case 'ArrowLeft':
      e.preventDefault();
      seekBy(-3);
      break
    case ' ':
      if (currentSong.value) {
        e.preventDefault();
        togglePlay()
      }
      ;
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', onBgResize)
  if (CANVAS_THEMES.has(currentThemeId.value)) {
    nextTick(() => startBgCanvas(currentThemeId.value))
  }
})

onUnmounted(() => {
  stopAlbumRotation()
  stopBgCanvas()
  if (sleepTimerId) clearTimeout(sleepTimerId)
  if (cacheToastTimer) clearTimeout(cacheToastTimer)
  if (_bgResizeTimer) clearTimeout(_bgResizeTimer)
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', onBgResize)
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', stopDrag)
})
</script>

<template>
  <div class="app-wrapper"
       :style="{
         ...themeVars,
         '--minibar-h': (currentSong && !showPlayer) ? 'calc(100px + env(safe-area-inset-bottom, 0px))' : '0px',
         '--t-bg-image': CANVAS_THEMES.has(currentThemeId) ? 'none' : (themeVars['--t-bg-image'] || 'none')
       }">

    <!-- 动态 Canvas 背景（四大自然主题） -->
    <canvas
        v-if="CANVAS_THEMES.has(currentThemeId)"
        ref="bgCanvasRef"
        class="bg-canvas"
        aria-hidden="true"
    />

    <!-- 静态背景装饰（daylight/cyber 主题保留） -->
    <div class="bg-orb orb1"></div>
    <div class="bg-orb orb2"></div>
    <div class="bg-orb orb3"></div>
    <div class="bg-grid"></div>
    <div v-if="cacheToast" class="cache-toast">{{ cacheToast }}</div>
    <Transition name="cache-modal">
      <div v-if="showCacheDialog" class="cache-modal-mask" @click="closeCacheDialog">
        <div class="cache-modal" @click.stop>
          <div class="cache-modal-title">清理缓存</div>
          <div class="cache-modal-msg">{{ cacheDialogMsg }}</div>
          <button class="cache-modal-btn" @click="closeCacheDialog">我知道了</button>
        </div>
      </div>
    </Transition>

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
        :favorite-names="favoriteNames"
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
        @clear-cache="clearCachedSongs"
        @toggle-favorite="toggleFavorite"
        @add-next="addSongToNext"
    />

    <!-- 我的收藏面板 -->
    <Transition name="fav-slide">
      <div v-if="showFavorites" class="fav-panel"
           @touchstart="onFavTouchStart"
           @touchmove="onFavTouchMove"
           @touchend="onFavTouchEnd"
           @touchcancel="onFavTouchEnd">
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
        <div v-if="favLoading" class="fav-loading"><span class="fav-spinner"></span><span>加载中...</span></div>
        <div v-else-if="favError" class="fav-error">{{ favError }}</div>
        <div v-else-if="favoritesList.length === 0" class="fav-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <p>暂无收藏</p><span>在播放页面点击心形图标收藏歌曲</span>
        </div>
        <div v-else class="fav-list">
          <div v-for="(song, i) in favoritesList" :key="song.url || song.name" class="fav-item"
               @click="playFromFavorites(song)">
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
          :audio-meta="audioMeta"
          :file-size="audioFileSize"
          :current-filename="currentSong?.name || ''"
          :is-playing="isPlaying"
          :album-rotation="albumRotation"
          :current-time="currentTime"
          :duration="duration"
          :progress-percent="progressPercent"
          :buffer-percent="bufferPercent"
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
          @seek-by="seekBy"
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

    <!-- 底部迷你播放栏 -->
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
           @canplaythrough="onCanPlayThrough"
           @progress="onProgress"
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
  background-image: var(--t-bg-image, none);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: hidden;
  font-family: 'Rajdhani', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--t-text);
  transition: background 0.5s;
}

/* ── Canvas 全屏背景 ── */
.bg-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  display: block;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.14;
  pointer-events: none;
  transition: background 0.6s;
  z-index: 1;
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
  background: none;
  pointer-events: none;
  z-index: 1;
}

.cache-toast {
  position: fixed;
  top: 18px;
  right: 18px;
  padding: 10px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--t-bg-card, rgba(0, 0, 0, 0.6)) 80%, #000);
  color: var(--t-text);
  border: 1px solid var(--t-border, rgba(255, 255, 255, 0.15));
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  z-index: 4000;
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
}

.cache-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4500;
}

.cache-modal {
  min-width: 240px;
  max-width: 340px;
  padding: 18px 18px 16px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--t-bg-card, rgba(0, 0, 0, 0.7)) 92%, #000);
  border: 1px solid var(--t-border, rgba(255, 255, 255, 0.15));
  box-shadow: 0 14px 50px rgba(0, 0, 0, 0.38);
}

.cache-modal-title {
  font-family: 'Orbitron', monospace;
  letter-spacing: 2px;
  font-size: 0.82rem;
  color: var(--t-label-color, var(--t-text2));
}

.cache-modal-msg {
  margin-top: 10px;
  color: var(--t-text2);
  font-size: 0.95rem;
  line-height: 1.5;
}

.cache-modal-btn {
  width: 100%;
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--t-border);
  background: var(--t-overlay, rgba(255, 255, 255, 0.08));
  color: var(--t-text);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cache-modal-btn:hover {
  border-color: var(--t-accent1);
  color: var(--t-accent1);
  background: color-mix(in srgb, var(--t-accent1) 10%, transparent);
}

.cache-modal-enter-active {
  animation: cacheModalFade 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.cache-modal-leave-active {
  animation: cacheModalFade 0.18s ease reverse;
}

@keyframes cacheModalFade {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

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

.fav-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: var(--minibar-h, 0px);
  width: min(360px, 100vw);
  z-index: 50;
  background: color-mix(in srgb, var(--t-bg) 94%, white);
  border-left: 1px solid var(--t-border);
  -webkit-backdrop-filter: blur(20px);
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
