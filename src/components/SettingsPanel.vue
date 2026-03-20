<script setup>
import {computed} from 'vue'
import {useI18n} from '../utils/i18n.js'

const props = defineProps({
  visible: {type: Boolean, default: false},
  appVersion: {type: String, default: 'dev'},
  serverMode: {type: Boolean, default: false},
})

const emit = defineEmits(['close', 'clear-cache'])

const {t, locale, setLocale} = useI18n()

const versionText = computed(() => t('version_label', {v: props.appVersion}))
</script>

<template>
  <Teleport to="body">
    <Transition name="settings-fade">
      <div v-if="visible" class="settings-mask" @click.self="emit('close')">
        <div class="settings-panel">
          <header class="settings-header">
            <h2>{{ t('settings_title') }}</h2>
            <button class="settings-close" @click="emit('close')" :aria-label="t('settings_title')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </header>

          <main class="settings-body">
            <!-- Language Selection -->
            <div class="settings-row settings-row--static">
              <div class="row-text">
                <div class="row-title">{{ t('language_label') }}</div>
              </div>
              <div class="lang-switch">
                <button
                    class="lang-btn"
                    :class="{ active: locale === 'zh' }"
                    @click="setLocale('zh')"
                >{{ t('lang_zh') }}
                </button>
                <button
                    class="lang-btn"
                    :class="{ active: locale === 'en' }"
                    @click="setLocale('en')"
                >{{ t('lang_en') }}
                </button>
              </div>
            </div>

            <!-- Clear Cache -->
            <button class="settings-row" :disabled="!serverMode" @click="emit('clear-cache')">
              <div class="row-text">
                <div class="row-title">{{ t('clear_cache') }}</div>
                <div class="row-sub" v-if="!serverMode">{{ t('server_required') }}</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </main>

          <footer class="settings-footer">
            <span>{{ versionText }}</span>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.settings-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  z-index: 5000;
}

.settings-panel {
  width: min(420px, 100vw);
  height: 100vh;
  background: color-mix(in srgb, var(--t-bg, #0b0b18) 95%, white);
  border-left: 1px solid var(--t-border, rgba(255, 255, 255, 0.15));
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  padding: 18px 18px 14px;
  gap: 12px;
  overflow: hidden;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--t-border, rgba(255, 255, 255, 0.15));
}

.settings-header h2 {
  margin: 0;
  font-size: 1rem;
  letter-spacing: 2px;
  font-family: 'Orbitron', monospace, sans-serif;
  color: var(--t-text, #fff);
}

.settings-close {
  background: none;
  border: none;
  padding: 6px;
  border-radius: 10px;
  color: var(--t-text3, rgba(255, 255, 255, 0.5));
  cursor: pointer;
  transition: all 0.2s;
}

.settings-close svg {
  width: 16px;
  height: 16px;
}

.settings-close:hover {
  color: var(--t-text, #fff);
  background: var(--t-overlay, rgba(255, 255, 255, 0.08));
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--t-bg-card, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--t-border, rgba(255, 255, 255, 0.12));
  color: var(--t-text2, rgba(255, 255, 255, 0.7));
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  text-align: left;
}

.settings-row--static {
  cursor: default;
}

.settings-row:hover:enabled:not(.settings-row--static) {
  border-color: var(--t-accent1, #a78bfa);
  color: var(--t-text, #fff);
  background: color-mix(in srgb, var(--t-accent1, #a78bfa) 10%, transparent);
}

.settings-row:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.settings-row svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.row-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
}

.row-title {
  font-size: 0.95rem;
  color: var(--t-text, #fff);
}

.row-sub {
  font-size: 0.82rem;
  color: var(--t-text3, rgba(255, 255, 255, 0.45));
}

/* ── Language Switch ── */
.lang-switch {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.lang-btn {
  padding: 5px 13px;
  border-radius: 20px;
  border: 1px solid var(--t-border, rgba(255, 255, 255, 0.15));
  background: var(--t-overlay, rgba(255, 255, 255, 0.05));
  color: var(--t-text2, rgba(255, 255, 255, 0.6));
  font-family: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.lang-btn:hover {
  border-color: var(--t-accent1, #a78bfa);
  color: var(--t-text, #fff);
}

.lang-btn.active {
  border-color: var(--t-accent1, #a78bfa);
  background: color-mix(in srgb, var(--t-accent1, #a78bfa) 16%, transparent);
  color: var(--t-accent1, #a78bfa);
  font-weight: 600;
}

.settings-footer {
  font-size: 0.82rem;
  color: var(--t-text3, rgba(255, 255, 255, 0.45));
  text-align: right;
  padding-top: 4px;
  border-top: 1px solid var(--t-border, rgba(255, 255, 255, 0.12));
}

.settings-fade-enter-active {
  animation: settingsIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.settings-fade-leave-active {
  animation: settingsIn 0.2s ease reverse;
}

@keyframes settingsIn {
  from {
    opacity: 0;
    transform: translateX(18px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 640px) {
  .settings-panel {
    width: 100vw;
  }
}
</style>