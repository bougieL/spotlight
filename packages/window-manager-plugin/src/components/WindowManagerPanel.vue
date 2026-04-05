<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import windowManagerPlugin from '../index';
import type { WindowInfo } from '@spotlight/api';
import { minimizeWindow, maximizeWindow, restoreWindow, closeWindow, toggleAlwaysOnTop, focusWindowByHwnd } from '../windowActions';
import { usePanelContext } from '@spotlight/core';
import { useI18n } from '@spotlight/i18n';
import { toPinyinInitials } from '@spotlight/utils/pinyin';
import logger from '@spotlight/logger';
import { Minus, Square, Maximize2, X, Pin, PinOff } from 'lucide-vue-next';

const { t } = useI18n();
const { query, clearQuery } = usePanelContext();

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'close'): void;
}>();

const windows = ref<WindowInfo[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const sortedWindows = computed(() => {
  return [...windows.value].sort((a, b) => {
    const pinyinA = toPinyinInitials(a.title).toLowerCase();
    const pinyinB = toPinyinInitials(b.title).toLowerCase();
    return pinyinA.localeCompare(pinyinB);
  });
});

const filteredWindows = computed(() => {
  if (!query.value.trim()) {
    return sortedWindows.value;
  }
  const q = query.value.toLowerCase();
  return sortedWindows.value.filter(
    (w) =>
      w.title.toLowerCase().includes(q) ||
      w.processName.toLowerCase().includes(q)
  );
});

onMounted(async () => {
  clearQuery();
  await loadWindows();
});

async function loadWindows() {
  loading.value = true;
  error.value = null;
  try {
    windows.value = await windowManagerPlugin.getWindows();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load windows';
    logger.error('Failed to load windows', e);
  } finally {
    loading.value = false;
  }
}

function updateWindowState(hwnd: number, updates: Partial<WindowInfo>): void {
  windows.value = windows.value.map((w) =>
    w.hwnd === hwnd ? { ...w, ...updates } : w
  );
}

async function handleMinimize(hwnd: number) {
  try {
    await minimizeWindow(hwnd);
    updateWindowState(hwnd, { isMinimized: true, isMaximized: false });
  } catch (e) {
    logger.error('Failed to minimize window:', e);
  }
}

async function handleMaximize(hwnd: number) {
  try {
    await maximizeWindow(hwnd);
    updateWindowState(hwnd, { isMaximized: true, isMinimized: false });
  } catch (e) {
    logger.error('Failed to maximize window:', e);
  }
}

async function handleRestore(hwnd: number) {
  try {
    await restoreWindow(hwnd);
    updateWindowState(hwnd, { isMinimized: false, isMaximized: false });
  } catch (e) {
    logger.error('Failed to restore window:', e);
  }
}

async function handleClose(hwnd: number) {
  try {
    await closeWindow(hwnd);
    windows.value = windows.value.filter((w) => w.hwnd !== hwnd);
  } catch (e) {
    logger.error('Failed to close window:', e);
  }
}

async function handleToggleAlwaysOnTop(hwnd: number) {
  const windowInfo = windows.value.find((w) => w.hwnd === hwnd);
  if (!windowInfo) return;
  try {
    await toggleAlwaysOnTop(hwnd, !windowInfo.isAlwaysOnTop);
    updateWindowState(hwnd, { isAlwaysOnTop: !windowInfo.isAlwaysOnTop });
  } catch (e) {
    logger.error('Failed to toggle always on top', e);
  }
}

async function handleFocus(hwnd: number) {
  try {
    await focusWindowByHwnd(hwnd);
  } catch (e) {
    logger.error('Failed to focus window:', e);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}
</script>

<template>
  <div
    class="window-manager-panel"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <div
      v-if="loading"
      class="message"
    >
      {{ t('windowManager.window.loading') }}
    </div>

    <div
      v-else-if="error"
      class="message error"
    >
      {{ error }}
    </div>

    <div
      v-else-if="filteredWindows.length === 0"
      class="message"
    >
      {{ t('windowManager.window.noWindows') }}
    </div>

    <div
      v-else
      class="window-list"
    >
      <div
        v-for="window in filteredWindows"
        :key="window.hwnd"
        class="window-item"
        @click="handleFocus(window.hwnd)"
      >
        <div class="window-info">
          <div class="window-title">
            {{ window.title }}
          </div>
          <div class="window-meta">
            <span class="process-name">{{ window.processName }}</span>
            <span
              v-if="window.isMinimized"
              class="state-badge minimized"
            >
              {{ t('windowManager.window.minimized') }}
            </span>
            <span
              v-if="window.isMaximized"
              class="state-badge maximized"
            >
              {{ t('windowManager.window.maximized') }}
            </span>
          </div>
        </div>
        <div class="window-actions">
          <button
            v-if="window.isMinimized"
            class="action-btn"
            :title="t('windowManager.window.restore')"
            @click.stop="handleRestore(window.hwnd)"
          >
            <Maximize2 :size="16" />
          </button>
          <button
            v-else-if="window.isMaximized"
            class="action-btn"
            :title="t('windowManager.window.restore')"
            @click.stop="handleRestore(window.hwnd)"
          >
            <Square :size="16" />
          </button>
          <button
            v-else
            class="action-btn"
            :title="t('windowManager.window.maximize')"
            @click.stop="handleMaximize(window.hwnd)"
          >
            <Maximize2 :size="16" />
          </button>
          <button
            class="action-btn"
            :title="t('windowManager.window.minimize')"
            @click.stop="handleMinimize(window.hwnd)"
          >
            <Minus :size="16" />
          </button>
          <button
            class="action-btn"
            :title="
              window.isAlwaysOnTop
                ? t('windowManager.window.removeAlwaysOnTop')
                : t('windowManager.window.alwaysOnTop')
            "
            @click.stop="handleToggleAlwaysOnTop(window.hwnd)"
          >
            <PinOff
              v-if="window.isAlwaysOnTop"
              :size="16"
            />
            <Pin
              v-else
              :size="16"
            />
          </button>
          <button
            class="action-btn close"
            :title="t('windowManager.window.close')"
            @click.stop="handleClose(window.hwnd)"
          >
            <X :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.window-manager-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background-color: var(--spotlight-bg);
  outline: none;
}

.message {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  font-size: 14px;
  color: var(--spotlight-placeholder);
}

.message.error {
  color: var(--spotlight-error, #e53e3e);
}

.window-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.window-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 8px;
  background-color: var(--spotlight-bg);
  cursor: pointer;
  transition: background-color 0.15s;
}

.window-item:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.05));
}

.window-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.window-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--spotlight-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.window-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.process-name {
  font-size: 12px;
  color: var(--spotlight-placeholder);
}

.state-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
}

.state-badge.minimized {
  background-color: var(--spotlight-badge-minimized-bg, rgba(0, 0, 0, 0.1));
  color: var(--spotlight-badge-minimized-text, #666);
}

.state-badge.maximized {
  background-color: var(--spotlight-badge-maximized-bg, rgba(0, 0, 0, 0.1));
  color: var(--spotlight-badge-maximized-text, #666);
}

.window-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  color: var(--spotlight-icon, #666);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.action-btn:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.1));
  color: var(--spotlight-text);
}

.action-btn.close:hover {
  background-color: var(--spotlight-error-bg, rgba(229, 62, 62, 0.1));
  color: var(--spotlight-error, #e53e3e);
}
</style>
