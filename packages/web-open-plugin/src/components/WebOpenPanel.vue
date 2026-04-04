<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from '@spotlight/i18n';
import { Globe, Trash2, Clock, X } from 'lucide-vue-next';
import { webOpenPlugin } from '../index';

const { t } = useI18n();

const url = ref('');
const recentUrls = ref<string[]>([]);
const error = ref('');
const activeWebviewLabel = ref<string | null>(null);
const webviewBounds = ref({ x: 0, y: 0, width: 800, height: 600 });

const emit = defineEmits<{ (e: 'close'): void }>();

onMounted(async () => {
  recentUrls.value = await webOpenPlugin.getRecentUrls();
});

function isValidUrl(string: string): boolean {
  try {
    const urlObj = new URL(string);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    // Try adding https:// prefix
    try {
      new URL('https://' + string);
      return true;
    } catch {
      return false;
    }
  }
}

function formatUrl(urlString: string): string {
  try {
    const urlObj = new URL(urlString.startsWith('http') ? urlString : 'https://' + urlString);
    return urlObj.hostname + urlObj.pathname;
  } catch {
    return urlString;
  }
}

async function handleOpen() {
  error.value = '';

  let urlToOpen = url.value.trim();
  if (!urlToOpen) {
    error.value = t('webOpen.invalidUrl');
    return;
  }

  // Add protocol if missing
  if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://')) {
    urlToOpen = 'https://' + urlToOpen;
  }

  if (!isValidUrl(urlToOpen)) {
    error.value = t('webOpen.invalidUrl');
    return;
  }

  // Position the webview in the center of the screen
  webviewBounds.value = {
    x: 100,
    y: 100,
    width: Math.min(1200, window.innerWidth - 200),
    height: Math.min(800, window.innerHeight - 200),
  };

  await webOpenPlugin.openUrl(urlToOpen, webviewBounds.value);

  activeWebviewLabel.value = `webview-${Date.now()}`;
  url.value = '';
  recentUrls.value = await webOpenPlugin.getRecentUrls();
}

async function openRecentUrl(recentUrl: string) {
  webviewBounds.value = {
    x: 100,
    y: 100,
    width: Math.min(1200, window.innerWidth - 200),
    height: Math.min(800, window.innerHeight - 200),
  };

  await webOpenPlugin.openUrl(recentUrl, webviewBounds.value);

  activeWebviewLabel.value = `webview-${Date.now()}`;
}

async function handleClearHistory() {
  await webOpenPlugin.clearRecentUrls();
  recentUrls.value = [];
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}
</script>

<template>
  <div class="web-open-panel" @keydown="handleKeydown">
    <div class="panel-header">
      <Globe class="header-icon" />
      <span class="header-title">{{ t('webOpen.name') }}</span>
      <button class="close-btn" @click="$emit('close')">
        <X :size="18" />
      </button>
    </div>

    <div class="url-input-container">
      <input
        v-model="url"
        type="text"
        class="url-input"
        :placeholder="t('webOpen.placeholder')"
        @keydown.enter="handleOpen"
      />
      <button class="open-btn" @click="handleOpen">
        {{ t('webOpen.open') }}
      </button>
    </div>

    <p v-if="error" class="error-message">{{ error }}</p>

    <div class="recent-section">
      <div class="recent-header">
        <Clock :size="14" />
        <span>{{ t('webOpen.recentUrls') }}</span>
        <button
          v-if="recentUrls.length > 0"
          class="clear-btn"
          @click="handleClearHistory"
        >
          <Trash2 :size="14" />
          {{ t('webOpen.clearHistory') }}
        </button>
      </div>

      <div v-if="recentUrls.length === 0" class="no-history">
        {{ t('webOpen.noHistory') }}
      </div>

      <ul v-else class="recent-list">
        <li
          v-for="recentUrl in recentUrls"
          :key="recentUrl"
          class="recent-item"
          @click="openRecentUrl(recentUrl)"
        >
          <Globe :size="14" class="item-icon" />
          <span class="item-url">{{ formatUrl(recentUrl) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.web-open-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background-color: var(--bg-primary, #fff);
  color: var(--text-primary, #1a1a1a);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.header-icon {
  width: 20px;
  height: 20px;
  color: var(--icon-color, #666);
}

.header-title {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: var(--icon-color, #666);
  transition: background-color 0.15s;
}

.close-btn:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.url-input-container {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.url-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  font-size: 14px;
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #1a1a1a);
  outline: none;
  transition: border-color 0.15s;
}

.url-input:focus {
  border-color: var(--accent-color, #007aff);
}

.url-input::placeholder {
  color: var(--placeholder-color, #999);
}

.open-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background-color: var(--accent-color, #007aff);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.open-btn:hover {
  opacity: 0.9;
}

.error-message {
  margin: 0 0 12px 0;
  padding: 8px 12px;
  border-radius: 6px;
  background-color: var(--error-bg, rgba(255, 59, 48, 0.1));
  color: var(--error-color, #ff3b30);
  font-size: 12px;
}

.recent-section {
  margin-top: 16px;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.recent-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  color: var(--text-secondary, #666);
  transition: background-color 0.15s;
}

.clear-btn:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.no-history {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary, #999);
  font-size: 13px;
}

.recent-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.recent-item:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.item-icon {
  flex-shrink: 0;
  color: var(--icon-color, #666);
}

.item-url {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary, #1a1a1a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (prefers-color-scheme: dark) {
  .url-input {
    background-color: var(--bg-secondary, #2c2c2c);
    border-color: var(--border-color, #444);
  }

  .url-input:focus {
    border-color: var(--accent-color, #0a84ff);
  }

  .recent-item:hover {
    background-color: var(--hover-bg, rgba(255, 255, 255, 0.05));
  }
}
</style>
