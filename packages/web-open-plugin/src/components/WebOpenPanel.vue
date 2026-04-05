<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@spotlight/i18n';
import { Globe, Trash2, Clock, Star, StarOff } from 'lucide-vue-next';
import { webOpenPlugin, type Bookmark } from '../index';
import { closeAllChildWebviews } from '@spotlight/api';

const { t } = useI18n();
const router = useRouter();

const url = ref('');
const recentUrls = ref<string[]>([]);
const bookmarks = ref<Bookmark[]>([]);
const error = ref('');

const emit = defineEmits<{ (e: 'close'): void }>();

onMounted(async () => {
  await closeAllChildWebviews();
  recentUrls.value = await webOpenPlugin.getRecentUrls();
  bookmarks.value = await webOpenPlugin.getBookmarks();
});

function isValidUrl(string: string): boolean {
  try {
    const urlObj = new URL(string);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
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

function normalizeUrl(urlString: string): string {
  if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
    return urlString;
  }
  return 'https://' + urlString;
}

async function handleOpen() {
  error.value = '';

  let urlToOpen = url.value.trim();
  if (!urlToOpen) {
    error.value = t('webOpen.invalidUrl');
    return;
  }

  if (!isValidUrl(urlToOpen)) {
    error.value = t('webOpen.invalidUrl');
    return;
  }

  urlToOpen = normalizeUrl(urlToOpen);
  await webOpenPlugin.addRecentUrl(urlToOpen);
  recentUrls.value = await webOpenPlugin.getRecentUrls();

  router.push({ name: 'web-open-plugin:view', query: { url: urlToOpen } });
}

async function openRecentUrl(recentUrl: string) {
  router.push({ name: 'web-open-plugin:view', query: { url: recentUrl } });
}

async function openBookmark(bookmark: Bookmark) {
  router.push({ name: 'web-open-plugin:view', query: { url: bookmark.url } });
}

async function handleClearHistory() {
  await webOpenPlugin.clearRecentUrls();
  recentUrls.value = [];
}

async function toggleBookmark(urlString: string) {
  const normalized = normalizeUrl(urlString);
  const isBookmarked = await webOpenPlugin.isBookmarked(normalized);
  if (isBookmarked) {
    await webOpenPlugin.removeBookmark(normalized);
  } else {
    const title = formatUrl(normalized);
    await webOpenPlugin.addBookmark(normalized, title);
  }
  bookmarks.value = await webOpenPlugin.getBookmarks();
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}
</script>

<template>
  <div class="web-open-panel" @keydown="handleKeydown">
    <div class="url-input-container">
      <input
        v-model="url"
        type="text"
        class="url-input"
        :placeholder="t('webOpen.placeholder')"
        @keydown.enter="handleOpen"
      />
      <button
        v-if="url.trim() && isValidUrl(url.trim())"
        class="bookmark-btn"
        @click="toggleBookmark(url.trim())"
        :title="t('webOpen.addBookmark')"
      >
        <Star v-if="!bookmarks.some(b => b.url === normalizeUrl(url.trim()))" :size="18" />
        <StarOff v-else :size="18" />
      </button>
      <button class="open-btn" @click="handleOpen">
        {{ t('webOpen.open') }}
      </button>
    </div>

    <p v-if="error" class="error-message">{{ error }}</p>

    <div class="bookmarks-section">
      <div class="section-header">
        <Star :size="14" />
        <span>{{ t('webOpen.bookmarks') }}</span>
      </div>

      <div v-if="bookmarks.length === 0" class="empty-state">
        {{ t('webOpen.noBookmarks') }}
      </div>

      <ul v-else class="list">
        <li
          v-for="bookmark in bookmarks"
          :key="bookmark.url"
          class="list-item"
          @click="openBookmark(bookmark)"
        >
          <Globe :size="14" class="item-icon" />
          <div class="item-content">
            <span class="item-title">{{ bookmark.title }}</span>
            <span class="item-url">{{ formatUrl(bookmark.url) }}</span>
          </div>
          <button
            class="remove-bookmark-btn"
            @click.stop="toggleBookmark(bookmark.url)"
            :title="t('webOpen.removeBookmark')"
          >
            <StarOff :size="14" />
          </button>
        </li>
      </ul>
    </div>

    <div class="recent-section">
      <div class="section-header">
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

      <div v-if="recentUrls.length === 0" class="empty-state">
        {{ t('webOpen.noHistory') }}
      </div>

      <ul v-else class="list">
        <li
          v-for="recentUrl in recentUrls"
          :key="recentUrl"
          class="list-item"
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

.bookmark-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--icon-color, #666);
  transition: color 0.15s;
  flex-shrink: 0;
}

.bookmark-btn:hover {
  color: var(--accent-color, #007aff);
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

.bookmarks-section,
.recent-section {
  margin-top: 16px;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.bookmarks-section {
  flex: 0 0 auto;
  max-height: 40%;
}

.section-header {
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

.empty-state {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary, #999);
  font-size: 13px;
}

.list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.list-item:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.item-icon {
  flex-shrink: 0;
  color: var(--icon-color, #666);
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #1a1a1a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-url {
  font-size: 12px;
  color: var(--text-secondary, #666);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-bookmark-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: var(--icon-color, #666);
  opacity: 0;
  transition: opacity 0.15s, background-color 0.15s;
  flex-shrink: 0;
}

.list-item:hover .remove-bookmark-btn {
  opacity: 1;
}

.remove-bookmark-btn:hover {
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

@media (prefers-color-scheme: dark) {
  .url-input {
    background-color: var(--bg-secondary, #2c2c2c);
    border-color: var(--border-color, #444);
  }

  .url-input:focus {
    border-color: var(--accent-color, #0a84ff);
  }

  .list-item:hover {
    background-color: var(--hover-bg, rgba(255, 255, 255, 0.05));
  }
}
</style>
