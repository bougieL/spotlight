<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useI18n } from '@spotlight/i18n';
import { tauriApi, type RipgrepResult, type SearchOptions, type EverythingResult } from '@spotlight/api';
import { usePanelContext } from '@spotlight/core';
import logger from '@spotlight/logger';

const { query } = usePanelContext();

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'close'): void;
}>();

const { t } = useI18n();

const searchQuery = ref('');
const searchPath = ref('');
const results = ref<(EverythingResult | RipgrepResult)[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');

const searchInContents = ref(false);
const caseSensitive = ref(false);
const wholeWord = ref(false);
const useRegex = ref(true);
const fileType = ref('');

const searchOptions = computed<SearchOptions>(() => ({
  case_sensitive: caseSensitive.value,
  whole_word: wholeWord.value,
  regex: useRegex.value,
  file_type: fileType.value || undefined,
}));

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  if (query.value && query.value.trim()) {
    const parts = query.value.trim().split(/\s+/);
    if (parts.length > 1) {
      searchQuery.value = parts.slice(1).join(' ');
    }
    performSearch();
  }
});

watch([searchQuery, searchPath, searchInContents, caseSensitive, wholeWord, useRegex, fileType], () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (!searchQuery.value.trim()) {
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
    if (searchInContents.value) {
      // Search file contents with ripgrep
      results.value = await tauriApi.searchWithRg(
        q,
        searchPath.value || undefined,
        searchOptions.value
      );
    } else {
      // Search file names with Everything
      results.value = await tauriApi.searchEverything(q);
    }
  } catch (error) {
    logger.error('[SearchPanel] Search failed:', error);
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
    logger.error('[SearchPanel] Failed to open file:', error);
  }
}

async function openAtLine(file: string, line: number) {
  try {
    await tauriApi.executeShellCommand(`code --goto "${file}:${line}"`);
  } catch (error) {
    logger.error('[SearchPanel] Failed to open file at line:', error);
  }
}

async function openInExplorer(path: string) {
  try {
    const normalized = path.replace(/\//g, '\\');
    await tauriApi.executeShellCommand(`explorer.exe /select,"${normalized}"`);
  } catch (error) {
    logger.error('[SearchPanel] Failed to open in explorer:', error);
  }
}

async function copyPath(path: string) {
  try {
    await tauriApi.setClipboardText(path);
  } catch (error) {
    logger.error('[SearchPanel] Failed to copy path:', error);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

function isRipgrepResult(result: EverythingResult | RipgrepResult): result is RipgrepResult {
  return 'content' in result && 'line' in result;
}

function isEverythingResult(result: EverythingResult | RipgrepResult): result is EverythingResult {
  return 'size' in result && 'date_modified' in result;
}

function truncateContent(content: string, maxLength: number = 120): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

function highlightMatch(content: string, query: string): string {
  if (!query) return content;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return content.replace(regex, '<mark>$1</mark>');
}
</script>

<template>
  <div
    class="search-panel"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <div class="search-input-section">
      <div class="search-input-container">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="t('search.queryPlaceholder')"
          autofocus
        >
        <input
          v-model="searchPath"
          type="text"
          class="path-input"
          :placeholder="t('search.searchPath')"
        >
      </div>

      <div class="search-options">
        <label class="option-checkbox">
          <input
            v-model="searchInContents"
            type="checkbox"
          >
          <span>{{ t('search.searchInContents') }}</span>
        </label>
        <template v-if="searchInContents">
          <label class="option-checkbox">
            <input
              v-model="caseSensitive"
              type="checkbox"
            >
            <span>{{ t('search.caseSensitive') }}</span>
          </label>
          <label class="option-checkbox">
            <input
              v-model="wholeWord"
              type="checkbox"
            >
            <span>{{ t('search.wholeWord') }}</span>
          </label>
          <label class="option-checkbox">
            <input
              v-model="useRegex"
              type="checkbox"
            >
            <span>{{ t('search.useRegex') }}</span>
          </label>
          <input
            v-model="fileType"
            type="text"
            class="file-type-input"
            :placeholder="t('search.fileType')"
          >
        </template>
      </div>
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
      {{ t('search.searching') }}
    </div>

    <div
      v-if="!isLoading && !errorMessage && searchQuery && results.length === 0"
      class="status-message"
    >
      {{ t('search.noResults') }}
    </div>

    <!-- File name search results (Everything) -->
    <div
      v-if="!searchInContents"
      class="results-list"
    >
      <div class="results-header">
        {{ t('search.results') }} ({{ results.length }})
      </div>
      <div
        v-for="(result, index) in results"
        :key="`file-${index}`"
        class="result-item"
      >
        <template v-if="isEverythingResult(result)">
          <div class="result-info">
            <div class="result-name">
              {{ result.name }}
            </div>
            <div class="result-meta">
              <span
                class="result-path"
                :title="result.path"
              >{{ result.path }}</span>
            </div>
          </div>
          <div class="result-actions">
            <button
              class="action-btn"
              :title="t('search.openFile')"
              @click="openFile(result.path)"
            >
              {{ t('search.openFile') }}
            </button>
            <button
              class="action-btn"
              :title="t('search.openInExplorer')"
              @click="openInExplorer(result.path)"
            >
              {{ t('search.openInExplorer') }}
            </button>
            <button
              class="action-btn"
              :title="t('search.copyPath')"
              @click="copyPath(result.path)"
            >
              {{ t('search.copyPath') }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Content search results (ripgrep) -->
    <div
      v-if="searchInContents"
      class="results-list"
    >
      <div class="results-header">
        {{ t('search.results') }} ({{ results.length }})
      </div>
      <div
        v-for="(result, index) in results"
        :key="`content-${index}`"
        class="result-item"
      >
        <template v-if="isRipgrepResult(result)">
          <div class="result-location">
            <span
              class="result-file"
              :title="result.file"
              @click="openInExplorer(result.file)"
            >{{ result.file }}</span>
            <span class="result-line">:{{ result.line }}</span>
          </div>
          <div
            class="result-content"
            v-html="highlightMatch(truncateContent(result.content), searchQuery)"
          />
          <div class="result-actions">
            <button
              class="action-btn"
              :title="t('search.openAtLine')"
              @click="openAtLine(result.file, result.line)"
            >
              {{ t('search.openAtLine') }}
            </button>
            <button
              class="action-btn"
              :title="t('search.copyPath')"
              @click="copyPath(`${result.file}:${result.line}`)"
            >
              {{ t('search.copyPath') }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--spotlight-bg);
  outline: none;
}

.search-input-section {
  padding: 12px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
}

.search-input-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.search-input,
.path-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  font-size: 14px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 6px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.search-input:focus,
.path-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.search-input::placeholder,
.path-input::placeholder {
  color: var(--spotlight-placeholder);
}

.search-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.option-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--spotlight-text);
  cursor: pointer;
}

.option-checkbox input {
  cursor: pointer;
}

.file-type-input {
  width: 100px;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 4px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  outline: none;
}

.error-message {
  padding: 12px;
  font-size: 13px;
  color: #dc2626;
  background-color: rgba(220, 38, 38, 0.1);
  border-radius: 6px;
  margin: 12px;
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
}

.results-header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--spotlight-placeholder);
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.03));
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.08));
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

.result-location {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  min-width: 0;
}

.result-file {
  color: var(--spotlight-primary, #666);
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-file:hover {
  text-decoration: underline;
}

.result-line {
  color: var(--spotlight-placeholder);
  flex-shrink: 0;
}

.result-content {
  flex: 1;
  font-size: 13px;
  color: var(--spotlight-text);
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.result-content :deep(mark) {
  background-color: rgba(255, 200, 0, 0.4);
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
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
