<script setup>
import {ref, watch, onMounted, onUnmounted, computed} from 'vue'

const props = defineProps({
  sleepMinutes: {type: Number, default: 0},
  sleepEndTime: {type: Number, default: 0},
  variant: {type: String, default: 'player'},
})
const emit = defineEmits(['set-sleep-timer', 'cancel-sleep-timer'])

const showPanel = ref(false)
const wrapRef = ref(null)
const isMobile = ref(false)
const customInput = ref('')

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 640
}
onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const onDocClick = (e) => {
  if (wrapRef.value && !wrapRef.value.contains(e.target)) showPanel.value = false
}
watch(showPanel, (v) => {
  if (v && !isMobile.value) document.addEventListener('click', onDocClick, true)
  else document.removeEventListener('click', onDocClick, true)
})
onUnmounted(() => document.removeEventListener('click', onDocClick, true))

const toggle = () => {
  showPanel.value = !showPanel.value
}
const close = () => {
  showPanel.value = false;
  customInput.value = ''
}

// 倒计时
const sleepCountdown = ref('')
let countdownTimer = null
const updateCountdown = () => {
  if (!props.sleepEndTime) {
    sleepCountdown.value = '';
    return
  }
  const diff = Math.max(0, props.sleepEndTime - Date.now())
  const m = Math.floor(diff / 60000), s = Math.floor((diff % 60000) / 1000)
  sleepCountdown.value = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
watch(() => props.sleepEndTime, (v) => {
  clearInterval(countdownTimer)
  if (v) {
    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 1000)
  } else sleepCountdown.value = ''
}, {immediate: true})
onUnmounted(() => clearInterval(countdownTimer))

const presetOptions = [15, 30, 45, 60, 90]
const isActive = computed(() => props.sleepMinutes !== 0)

const select = (min) => {
  customInput.value = '';
  emit('set-sleep-timer', min);
  close()
}
const confirmCustom = () => {
  const v = parseInt(customInput.value)
  if (!v || v < 1 || v > 999) return
  emit('set-sleep-timer', v);
  close()
}
const cancel = () => {
  emit('cancel-sleep-timer');
  close()
}

const btnTitle = computed(() =>
    isActive.value
        ? (props.sleepMinutes === -1 ? '定时停止：本曲结束后' : `定时停止：${sleepCountdown.value}`)
        : '定时停止'
)
</script>

<template>
  <div class="st-wrap" ref="wrapRef">
    <button class="st-btn" :class="[`st-btn--${variant}`, { 'st-active': isActive }]"
            :title="btnTitle" @click.stop="toggle">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <span v-if="isActive && sleepCountdown" class="st-badge">{{ sleepCountdown }}</span>
    </button>

    <!-- 桌面浮窗 -->
    <Transition name="st-pop">
      <div v-if="showPanel && !isMobile" class="st-panel">
        <div class="st-panel-header">
          <span class="st-panel-title">定时停止播放</span>
          <button v-if="isActive" class="st-cancel-link" @click="cancel">取消</button>
        </div>
        <div v-if="isActive" class="st-active-row">
          <div class="st-countdown">{{ sleepMinutes === -1 ? '本曲结束' : sleepCountdown }}</div>
          <div class="st-hint">将在此时间后停止播放</div>
        </div>
        <div class="st-options">
          <button v-for="min in presetOptions" :key="min"
                  class="st-opt" :class="{ 'st-opt--active': sleepMinutes === min }"
                  @click="select(min)">{{ min }} 分钟
          </button>
          <button class="st-opt st-opt--end" :class="{ 'st-opt--active': sleepMinutes === -1 }"
                  @click="select(-1)">本曲结束后
          </button>
        </div>
        <div class="st-custom-row">
          <input class="st-custom-input" type="number" min="1" max="999"
                 placeholder="自定义分钟" v-model="customInput"
                 @keydown.enter="confirmCustom" @click.stop/>
          <button class="st-custom-confirm" @click.stop="confirmCustom">确定</button>
        </div>
      </div>
    </Transition>
  </div>

  <!-- 手机 Sheet -->
  <Teleport to="body">
    <Transition name="st-sheet-anim">
      <div v-if="showPanel && isMobile" class="st-overlay" @click.self="close">
        <div class="st-sheet">
          <div class="st-sheet-header">
            <span class="st-panel-title">定时停止播放</span>
            <button class="st-close-btn" @click="close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div v-if="isActive" class="st-sheet-active">
            <div class="st-sheet-cd">{{ sleepMinutes === -1 ? '本曲结束后' : sleepCountdown }}</div>
            <div class="st-sheet-hint">将在此时间后停止播放</div>
            <button class="st-sheet-cancel" @click="cancel">取消定时</button>
          </div>
          <div class="st-sheet-opts">
            <button v-for="min in presetOptions" :key="min"
                    class="st-opt" :class="{ 'st-opt--active': sleepMinutes === min }"
                    @click="select(min)">{{ min }} 分钟
            </button>
            <button class="st-opt st-opt--end" :class="{ 'st-opt--active': sleepMinutes === -1 }"
                    @click="select(-1)">本曲结束后
            </button>
          </div>
          <div class="st-sheet-custom-row">
            <input class="st-custom-input st-custom-input--sheet" type="number" min="1" max="999"
                   placeholder="自定义分钟数 (1-999)" v-model="customInput"
                   @keydown.enter="confirmCustom" @click.stop/>
            <button class="st-custom-confirm st-custom-confirm--sheet" @click.stop="confirmCustom">确定</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.st-wrap {
  position: relative;
  display: inline-flex;
}

.st-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--t-text3);
  border-radius: 8px;
  transition: color 0.2s, background 0.2s, transform 0.18s;
}

.st-btn:hover {
  color: var(--t-accent3);
  background: color-mix(in srgb, var(--t-accent3) 8%, transparent);
  transform: scale(1.08);
}

.st-active {
  color: var(--t-accent3) !important;
}

.st-btn--player {
  width: 34px;
  height: 34px;
}

.st-btn--player svg {
  width: 17px;
  height: 17px;
}

.st-btn--minibar {
  width: 36px;
  height: 36px;
  padding: 7px;
}

.st-btn--minibar svg {
  width: 18px;
  height: 18px;
}

.st-badge {
  font-size: 0.46rem;
  font-family: 'Orbitron', monospace;
  color: var(--t-accent3);
  line-height: 1;
  pointer-events: none;
  white-space: nowrap;
}

/* 桌面浮窗 */
.st-panel {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  width: 232px;
  background: color-mix(in srgb, var(--t-bg) 94%, white);
  border: 1px solid var(--t-border);
  border-radius: 14px;
  box-shadow: 0 -16px 52px var(--t-shadow, rgba(0, 0, 0, 0.5));
  backdrop-filter: blur(20px);
  overflow: hidden;
  z-index: 200;
}

.st-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px 9px;
  border-bottom: 1px solid var(--t-border);
}

.st-panel-title {
  font-family: 'Orbitron', monospace;
  font-size: 0.62rem;
  letter-spacing: 2px;
  color: var(--t-label-color);
}

.st-cancel-link {
  background: none;
  border: none;
  cursor: pointer;
  color: #ff5555;
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 6px;
  font-family: inherit;
  transition: background 0.2s;
}

.st-cancel-link:hover {
  background: rgba(255, 85, 85, 0.1);
}

.st-active-row {
  text-align: center;
  padding: 12px 14px 4px;
}

.st-countdown {
  font-family: 'Orbitron', monospace;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--t-accent3);
  letter-spacing: 3px;
}

.st-hint {
  font-size: 0.68rem;
  color: var(--t-text3);
  margin-top: 3px;
}

.st-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 10px 12px 8px;
}

.st-opt {
  padding: 8px 4px;
  border-radius: 8px;
  border: 1px solid var(--t-border);
  background: var(--t-overlay);
  color: var(--t-text2);
  font-family: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.18s;
  text-align: center;
}

.st-opt:hover {
  border-color: var(--t-accent3);
  color: var(--t-accent3);
  background: color-mix(in srgb, var(--t-accent3) 8%, transparent);
}

.st-opt--active {
  border-color: var(--t-accent3) !important;
  color: var(--t-accent3) !important;
  background: color-mix(in srgb, var(--t-accent3) 12%, transparent) !important;
  font-weight: 600;
}

.st-opt--end {
  grid-column: 1 / -1;
}

/* 自定义行（桌面） */
.st-custom-row {
  display: flex;
  gap: 6px;
  padding: 0 12px 12px;
  align-items: center;
}

.st-custom-input {
  flex: 1;
  height: 32px;
  border-radius: 7px;
  border: 1px solid var(--t-border);
  background: var(--t-overlay);
  color: var(--t-text2);
  font-family: inherit;
  font-size: 0.78rem;
  padding: 0 8px;
  outline: none;
  transition: border-color 0.2s;
  -moz-appearance: textfield;
}

.st-custom-input::-webkit-inner-spin-button,
.st-custom-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

.st-custom-input::placeholder {
  color: var(--t-text3);
}

.st-custom-input:focus {
  border-color: var(--t-accent3);
}

.st-custom-confirm {
  height: 32px;
  padding: 0 12px;
  border-radius: 7px;
  border: 1px solid var(--t-accent3);
  background: color-mix(in srgb, var(--t-accent3) 10%, transparent);
  color: var(--t-accent3);
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
}

.st-custom-confirm:hover {
  background: color-mix(in srgb, var(--t-accent3) 22%, transparent);
}

.st-pop-enter-active {
  animation: stPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.st-pop-leave-active {
  animation: stPop 0.15s ease reverse;
}

@keyframes stPop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96)
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1)
  }
}

/* 手机 Sheet */
.st-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
}

.st-sheet {
  width: 100%;
  background: color-mix(in srgb, var(--t-bg) 96%, white);
  border-top: 1px solid var(--t-border);
  border-radius: 20px 20px 0 0;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.st-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--t-border);
}

.st-sheet-header .st-panel-title {
  font-size: 0.72rem;
  letter-spacing: 2.5px;
}

.st-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--t-text3);
  padding: 3px;
  border-radius: 5px;
  display: flex;
  transition: color 0.2s;
}

.st-close-btn svg {
  width: 16px;
  height: 16px;
}

.st-close-btn:hover {
  color: var(--t-text);
}

.st-sheet-active {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 20px 10px;
  text-align: center;
}

.st-sheet-cd {
  font-family: 'Orbitron', monospace;
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--t-accent3);
  letter-spacing: 4px;
  line-height: 1;
}

.st-sheet-hint {
  font-size: 0.75rem;
  color: var(--t-text3);
  margin-top: 6px;
}

.st-sheet-cancel {
  margin-top: 14px;
  padding: 9px 32px;
  border-radius: 22px;
  border: 1px solid #ff5555;
  background: rgba(255, 85, 85, 0.08);
  color: #ff5555;
  font-family: inherit;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s;
}

.st-sheet-cancel:hover {
  background: rgba(255, 85, 85, 0.18);
}

.st-sheet-opts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 14px 16px 8px;
}

.st-sheet-opts .st-opt {
  padding: 12px 4px;
  border-radius: 10px;
  font-size: 0.85rem;
}

/* 自定义行（Sheet） */
.st-sheet-custom-row {
  display: flex;
  gap: 8px;
  padding: 8px 16px 24px;
  align-items: center;
}

.st-custom-input--sheet {
  height: 42px;
  font-size: 0.9rem;
  border-radius: 10px;
}

.st-custom-confirm--sheet {
  height: 42px;
  padding: 0 18px;
  font-size: 0.9rem;
  border-radius: 10px;
}

.st-sheet-anim-enter-active {
  animation: stSheetUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.st-sheet-anim-leave-active {
  animation: stSheetUp 0.2s ease reverse;
}

@keyframes stSheetUp {
  from {
    opacity: 0;
    transform: translateY(100%)
  }
  to {
    opacity: 1;
    transform: translateY(0)
  }
}
</style>