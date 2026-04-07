<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@spotlight/i18n';
import { Folder, ChevronDown } from 'lucide-vue-next';
import { openPath } from '@tauri-apps/plugin-opener';
import { tauriApi, getUserHome, openDirectoryDialog, createPluginStorage, type RipgrepResult, type SearchOptions, type FileResult } from '@spotlight/api';
import { usePanelContext } from '@spotlight/core';
import { BaseInput, BaseCheckbox, BaseIconButton } from '@spotlight/components';
import logger from '@spotlight/logger';

const { query, placeholder } = usePanelContext();
const route = useRoute();

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'close'): void;
}>();

const { t } = useI18n();

const storage = createPluginStorage('file-search-plugin');

interface SearchSettings {
  searchPath: string;
  searchInContents: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  recentPaths: string[];
}

const defaultSettings: SearchSettings = {
  searchPath: '',
  searchInContents: false,
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
  recentPaths: [],
};

const MAX_RECENT_PATHS = 10;

const searchPath = ref('');
const results = ref<(FileResult | RipgrepResult)[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const userHome = ref('');
const recentPaths = ref<string[]>([]);
const showRecentDropdown = ref(false);

const searchInContents = ref(false);
const caseSensitive = ref(false);
const wholeWord = ref(false);
const useRegex = ref(false);

const searchOptions = computed<SearchOptions>(() => ({
  case_sensitive: caseSensitive.value,
  whole_word: wholeWord.value,
  regex: useRegex.value,
}));

const isWindows = navigator.platform.toLowerCase().includes('win');

const defaultPathPlaceholder = computed(() => {
  return userHome.value || (isWindows ? 'C:\\Users\\...' : '~/');
});

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

async function loadSettings() {
  try {
    const saved = await storage.get<SearchSettings>('searchSettings', defaultSettings);
    searchPath.value = saved.searchPath;
    searchInContents.value = saved.searchInContents;
    caseSensitive.value = saved.caseSensitive;
    wholeWord.value = saved.wholeWord;
    useRegex.value = saved.useRegex;
    recentPaths.value = saved.recentPaths || [];
  } catch (error) {
    logger.error('[SearchPanel] Failed to load settings:', error);
  }
}

async function saveSettings() {
  try {
    await storage.set<SearchSettings>('searchSettings', {
      searchPath: searchPath.value,
      searchInContents: searchInContents.value,
      caseSensitive: caseSensitive.value,
      wholeWord: wholeWord.value,
      useRegex: useRegex.value,
      recentPaths: recentPaths.value,
    });
  } catch (error) {
    logger.error('[SearchPanel] Failed to save settings:', error);
  }
}

function addRecentPath(path: string) {
  if (!path.trim()) return;

  // Remove if already exists
  const filtered = recentPaths.value.filter(p => p !== path);
  // Add to front
  filtered.unshift(path);
  // Keep only MAX_RECENT_PATHS
  recentPaths.value = filtered.slice(0, MAX_RECENT_PATHS);
  saveSettings();
}

onMounted(async () => {
  placeholder.value = t('fileSearch.placeholder');
  try {
    userHome.value = await getUserHome();
  } catch (error) {
    logger.error('[SearchPanel] Failed to get user home:', error);
  }
  await loadSettings();

  const routeQuery = route.query.q as string | undefined;
  const routeMode = route.query.mode as string | undefined;
  if (routeMode === 'contents') {
    searchInContents.value = true;
  } else if (routeMode === 'name') {
    searchInContents.value = false;
  }
  if (routeQuery) {
    query.value = routeQuery;
  }
  if (query.value && query.value.trim()) {
    performSearch();
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.recent-paths-dropdown') && !target.closest('.path-input-wrapper')) {
      showRecentDropdown.value = false;
    }
  });
});

watch([query, searchPath, searchInContents, caseSensitive, wholeWord, useRegex], () => {
  // Save settings when they change (immediate, no debounce)
  saveSettings();

  // Debounce search
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (!query.value.trim()) {
    results.value = [];
    errorMessage.value = '';
    return;
  }

  searchTimeout = setTimeout(() => {
    performSearch();
  }, 300);
});

async function performSearch() {
  const q = query.value.trim();
  if (!q) {
    results.value = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    if (searchInContents.value) {
      // Search file contents with ripgrep
      results.value = await tauriApi.searchWithRg({
        query: q,
        path: searchPath.value || undefined,
        options: searchOptions.value,
      });
    } else {
      // Search file names with ripgrep
      results.value = await tauriApi.searchFilesWithRg({
        query: q,
        path: searchPath.value || undefined,
      });
    }
    // Add path to recent paths if search was successful
    if (searchPath.value.trim()) {
      addRecentPath(searchPath.value);
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
    await openPath(path);
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
    await tauriApi.revealInExplorer(path);
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

function isRipgrepResult(result: FileResult | RipgrepResult): result is RipgrepResult {
  return 'content' in result && 'line' in result;
}

function isFileResult(result: FileResult | RipgrepResult): result is FileResult {
  return 'name' in result && 'path' in result && !('content' in result);
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

function selectRecentPath(path: string) {
  searchPath.value = path;
  showRecentDropdown.value = false;
}

async function openFolderDialog() {
  try {
    const selected = await openDirectoryDialog(searchPath.value || undefined);
    if (selected) {
      searchPath.value = selected;
      showRecentDropdown.value = false;
    }
  } catch (error) {
    logger.error('[SearchPanel] Failed to open folder dialog:', error);
  }
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
        <label class="path-label">{{ t('fileSearch.searchPathLabel') }}</label>
        <div class="path-input-wrapper">
          <BaseInput
            v-model="searchPath"
            type="text"
            :placeholder="defaultPathPlaceholder"
            style="flex: 1"
            @focus="showRecentDropdown = true"
          />
          <BaseIconButton
            size="medium"
            :title="t('fileSearch.recentPaths')"
            @click="showRecentDropdown = !showRecentDropdown"
          >
            <ChevronDown :size="16" />
          </BaseIconButton>
          <BaseIconButton
            size="medium"
            :title="t('fileSearch.selectFolder')"
            @click="openFolderDialog"
          >
            <Folder :size="16" />
          </BaseIconButton>
          <div
            v-if="showRecentDropdown"
            class="recent-paths-dropdown"
          >
            <div
              v-if="recentPaths.length === 0"
              class="recent-path-item recent-path-empty"
            >
              {{ t('fileSearch.noRecentPaths') }}
            </div>
            <div
              v-for="path in recentPaths"
              :key="path"
              class="recent-path-item"
              @click="selectRecentPath(path)"
            >
              {{ path }}
            </div>
          </div>
        </div>
      </div>

      <div class="search-options">
        <label class="options-label">{{ t('fileSearch.options') }}</label>
        <BaseCheckbox
          v-model="searchInContents"
          :label="t('fileSearch.searchInContents')"
        />
        <template v-if="searchInContents">
          <BaseCheckbox
            v-model="caseSensitive"
            :label="t('fileSearch.caseSensitive')"
          />
          <BaseCheckbox
            v-model="wholeWord"
            :label="t('fileSearch.wholeWord')"
          />
          <BaseCheckbox
            v-model="useRegex"
            :label="t('fileSearch.useRegex')"
          />
        </template>
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="error-message"
    >
      {{ errorMessage }}
    </div>

    <!-- File name search results (Everything) -->
    <div
      v-if="!searchInContents"
      class="results-list"
    >
      <div class="results-header">
        {{ t('fileSearch.results') }} ({{ results.length }})
      </div>
      <div
        v-if="isLoading"
        class="status-message"
      >
        {{ t('fileSearch.searching') }}
      </div>
      <div
        v-else-if="!query"
        class="status-message"
      >
        {{ t('fileSearch.enterSearchQuery') }}
      </div>
      <div
        v-else-if="results.length === 0"
        class="status-message"
      >
        {{ t('fileSearch.noResults') }}
      </div>
      <div
        v-for="(result, index) in results"
        :key="`file-${index}`"
        class="result-item"
      >
        <template v-if="isFileResult(result)">
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
              :title="t('fileSearch.openFile')"
              @click="openFile(result.path)"
            >
              {{ t('fileSearch.openFile') }}
            </button>
            <button
              class="action-btn"
              :title="t('fileSearch.openInExplorer')"
              @click="openInExplorer(result.path)"
            >
              {{ t('fileSearch.openInExplorer') }}
            </button>
            <button
              class="action-btn"
              :title="t('fileSearch.copyPath')"
              @click="copyPath(result.path)"
            >
              {{ t('fileSearch.copyPath') }}
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
        {{ t('fileSearch.results') }} ({{ results.length }})
      </div>
      <div
        v-if="isLoading"
        class="status-message"
      >
        {{ t('fileSearch.searching') }}
      </div>
      <div
        v-else-if="!query"
        class="status-message"
      >
        {{ t('fileSearch.enterSearchQuery') }}
      </div>
      <div
        v-else-if="results.length === 0"
        class="status-message"
      >
        {{ t('fileSearch.noResults') }}
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
            v-html="highlightMatch(truncateContent(result.content), query)"
          />
          <div class="result-actions">
            <button
              class="action-btn"
              :title="t('fileSearch.openAtLine')"
              @click="openAtLine(result.file, result.line)"
            >
              {{ t('fileSearch.openAtLine') }}
            </button>
            <button
              class="action-btn"
              :title="t('fileSearch.copyPath')"
              @click="copyPath(`${result.file}:${result.line}`)"
            >
              {{ t('fileSearch.copyPath') }}
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
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.path-label {
  font-size: 13px;
  color: var(--spotlight-text);
  white-space: nowrap;
  width: 80px;
  text-align: right;
  flex-shrink: 0;
}

.path-input-wrapper {
  display: flex;
  position: relative;
  flex: 1;
}

.path-input-wrapper :deep(.base-input) {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

.path-input-wrapper :deep(.base-icon-button:nth-of-type(1)) {
  border-radius: 0;
  border-left: none;
  border-right: none;
}

.path-input-wrapper :deep(.base-icon-button:nth-of-type(2)) {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.recent-paths-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--spotlight-bg);
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 4px;
}

.recent-path-item {
  padding: 8px 12px;
  font-size: 13px;
  color: var(--spotlight-text);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-path-item:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.05));
}

.recent-path-empty {
  color: var(--spotlight-placeholder);
  cursor: default;
}

.recent-path-empty:hover {
  background-color: transparent;
}

.search-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.options-label {
  font-size: 13px;
  color: var(--spotlight-text);
  width: 80px;
  text-align: right;
  flex-shrink: 0;
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
  min-height: 100px;
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
