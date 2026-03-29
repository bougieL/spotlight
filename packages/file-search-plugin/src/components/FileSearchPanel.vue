<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useI18n } from '@spotlight/i18n';
import { tauriApi, type EverythingResult } from '@spotlight/api';
import { usePanelContext } from '@spotlight/core';
import logger from '@spotlight/logger';

const { query } = usePanelContext();

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'close'): void;
}>();

const { t } = useI18n();
const searchQuery = ref('');
const results = ref<EverythingResult[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  if (query.value && query.value.trim()) {
    searchQuery.value = query.value.trim();
    performSearch();
  }
});

watch(searchQuery, (value) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (!value.trim()) {
    results.value = [];
    errorMessage.value = '';
    return;
  }

  searchTimeout = setTimeout(() => {
    performSearch();
  }, 200);
});

async function performSearch() {
  const q = searchQuery.value.trim();
  if (!q) return;

  isLoading.value = true;
  errorMessage.value = '';

  try {
    results.value = await tauriApi.searchEverything(q);
  } catch (error) {
    logger.error('[FileSearchPanel] Search failed:', error);
    errorMessage.value = error instanceof Error ? error.message : String(error);
    results.value = [];
  } finally {
    isLoading.value = false;
  }
}

async function openFile(path: string) {
  try {
    await tauriApi.executeShellCommand(path);
  } catch (error) {
    logger.error('[FileSearchPanel] Failed to open file:', error);
  }
}

async function openFolder(path: string) {
  try {
    const normalized = path.replace(/\//g, '\\');
    await tauriApi.executeShellCommand(`explorer.exe /select,"${normalized}"`);
  } catch (error) {
    logger.error('[FileSearchPanel] Failed to open folder:', error);
  }
}

async function copyPath(path: string) {
  try {
    await tauriApi.setClipboardText(path);
  } catch (error) {
    logger.error('[FileSearchPanel] Failed to copy path:', error);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

function formatSize(size: string): string {
  if (!size) return '';
  const bytes = parseInt(size, 10);
  if (isNaN(bytes)) return size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
</script>

<template>
  <div
    class="file-search-panel"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <div class="search-input-container">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        :placeholder="t('fileSearch.queryPlaceholder')"
        autofocus
      >
    </div>

    <div
      v-if="errorMessage"
      class="error-message"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="isLoading"
      class="status-message"
    >
      {{ t('fileSearch.searching') }}
    </div>

    <div
      v-if="!isLoading && !errorMessage && searchQuery && results.length === 0"
      class="status-message"
    >
      {{ t('fileSearch.noResults') }}
    </div>

    <div class="results-list">
      <div
        v-for="file in results"
        :key="file.path"
        class="result-item"
      >
        <div class="result-info">
          <div class="result-name">
            {{ file.name }}
          </div>
          <div class="result-meta">
            <span class="result-path">{{ file.path }}</span>
            <span
              v-if="file.size"
              class="result-size"
            >{{ formatSize(file.size) }}</span>
            <span
              v-if="file.date_modified"
              class="result-date"
            >{{ file.date_modified }}</span>
          </div>
        </div>
        <div class="result-actions">
          <button
            class="action-btn"
            :title="t('fileSearch.openFile')"
            @click="openFile(file.path)"
          >
            {{ t('fileSearch.openFile') }}
          </button>
          <button
            class="action-btn"
            :title="t('fileSearch.openFolder')"
            @click="openFolder(file.path)"
          >
            {{ t('fileSearch.openFolder') }}
          </button>
          <button
            class="action-btn"
            :title="t('fileSearch.copyPath')"
            @click="copyPath(file.path)"
          >
            {{ t('fileSearch.copyPath') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-search-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background-color: var(--spotlight-bg);
  outline: none;
}

.search-input-container {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  font-size: 16px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 8px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.search-input::placeholder {
  color: var(--spotlight-placeholder);
}

.error-message {
  padding: 8px 12px;
  font-size: 13px;
  color: #dc2626;
  background-color: rgba(220, 38, 38, 0.1);
  border-radius: 6px;
  margin-bottom: 8px;
}

.status-message {
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--spotlight-placeholder);
}

.results-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  transition: background-color 0.1s;
  gap: 12px;
}

.result-item:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.05));
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--spotlight-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--spotlight-placeholder);
}

.result-path {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-size,
.result-date {
  flex-shrink: 0;
}

.result-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.1s;
}

.result-item:hover .result-actions {
  opacity: 1;
}

.action-btn {
  padding: 4px 8px;
  font-size: 11px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 4px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.1s;
}

.action-btn:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.08));
}
</style>
