<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Clipboard, FileText, Image, Copy, Check, LayoutGrid, Star } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { formatTime } from '@spotlight/utils';
import clipboardPlugin from '../index';
import type { ClipboardItem, ClipboardItemType } from '../types';
import { on, type UnlistenFn } from '@spotlight/api';
import logger from '@spotlight/logger';
import { usePanelContext } from '@spotlight/core';

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'close'): void;
}>();

const { t } = useI18n();
const { query } = usePanelContext();

const items = ref<ClipboardItem[]>([]);
const favorites = ref<ClipboardItem[]>([]);
const copiedId = ref<string | null>(null);
const selectedType = ref<'all' | 'favorites' | ClipboardItemType>('all');
let unlistenClipboard: UnlistenFn | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const filteredItems = computed(() => {
  const sourceItems = selectedType.value === 'favorites' ? favorites.value : items.value;

  if (selectedType.value !== 'favorites' && selectedType.value !== 'all') {
    return sourceItems.filter(item => item.type === selectedType.value);
  }

  if (query.value.trim()) {
    const q = query.value.toLowerCase();
    return sourceItems.filter(item => item.content.toLowerCase().includes(q));
  }

  return sourceItems;
});

const filterTabs = computed(() => [
  { key: 'all' as const, icon: LayoutGrid, label: t('clipboard.all') },
  { key: 'favorites' as const, icon: Star, label: t('clipboard.favorites') },
  { key: 'text' as const, icon: FileText, label: t('clipboard.text') },
  { key: 'image' as const, icon: Image, label: t('clipboard.image') },
  { key: 'files' as const, icon: FileText, label: t('clipboard.files') },
]);

function getTypeIcon(type: ClipboardItemType) {
  switch (type) {
    case 'text':
      return FileText;
    case 'image':
      return Image;
    case 'files':
      return FileText;
    default:
      return Clipboard;
  }
}

function getTypeLabel(type: ClipboardItemType) {
  switch (type) {
    case 'text':
      return t('clipboard.text');
    case 'image':
      return t('clipboard.image');
    case 'files':
      return t('clipboard.files');
    default:
      return type;
  }
}

function formatContent(item: ClipboardItem): string {
  if (item.type === 'image') {
    return t('clipboard.image');
  }
  if (item.type === 'files') {
    const files = item.content.split('\n').filter(f => f.trim());
    if (files.length === 1) {
      return files[0].split(/[\\/]/).pop() || files[0];
    }
    return `${files.length} files`;
  }
  const text = item.content;
  if (text.length > 200) {
    return text.substring(0, 200) + '...';
  }
  return text;
}

function isImage(item: ClipboardItem): boolean {
  return item.type === 'image' && item.content.startsWith('data:image');
}

function isFiles(item: ClipboardItem): boolean {
  return item.type === 'files';
}

function getFiles(item: ClipboardItem): string[] {
  if (item.type !== 'files') return [];
  return item.content.split('\n').filter(f => f.trim());
}

function getFileName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function getFileExtension(path: string): string {
  const name = getFileName(path);
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.substring(dotIndex + 1).toLowerCase() : '';
}

async function handleCopy(item: ClipboardItem) {
  await clipboardPlugin.copyToClipboard(item);
  copiedId.value = item.id;
  setTimeout(() => {
    copiedId.value = null;
  }, 3000);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    query.value = '';
    emit('close');
    return;
  }
}

onMounted(async () => {
  query.value = '';
  await loadItems();
  unlistenClipboard = await on.clipboardChanged(async () => {
    await loadItems();
  });
  refreshTimer = setInterval(loadItems, 5000);
});

onUnmounted(() => {
  if (unlistenClipboard) {
    unlistenClipboard();
    unlistenClipboard = null;
  }
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
});

async function loadItems() {
  try {
    const data = await clipboardPlugin.getData();
    items.value = [...(data.items || [])];
    favorites.value = [...(data.favorites || [])];
  } catch (error) {
    logger.error('Failed to load clipboard items:', error);
  }
}

async function handleItemClick(item: ClipboardItem) {
  await handleCopy(item);
}

async function handleToggleFavorite(item: ClipboardItem) {
  const isFav = favorites.value.some(f => f.content === item.content);

  if (isFav) {
    favorites.value = favorites.value.filter(f => f.content !== item.content);
  } else {
    favorites.value = [{ ...item, favorite: true, timestamp: Date.now() }, ...favorites.value];
  }

  try {
    await clipboardPlugin.toggleFavorite(item);
  } catch (error) {
    logger.error('Failed to toggle favorite:', error);
    await loadItems();
  }
}

const favoriteContents = computed(() => new Set(favorites.value.map(f => f.content)));
</script>

<template>
  <div
    class="clipboard-panel"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <div class="clipboard-tabs">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: selectedType === tab.key }"
        @click="selectedType = tab.key"
      >
        <component
          :is="tab.icon"
          :size="14"
        />
        <span>{{ tab.label }}</span>
      </button>
    </div>
    <div class="clipboard-list">
      <div
        v-if="filteredItems.length === 0"
        class="empty-state"
      >
        <Clipboard
          :size="48"
          class="empty-icon"
        />
        <p class="empty-text">
          {{ t('clipboard.empty') }}
        </p>
      </div>

      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="clipboard-item"
        :class="{ copied: copiedId === item.id }"
        @click="handleItemClick(item)"
      >
        <div class="item-icon">
          <component
            :is="getTypeIcon(item.type)"
            :size="16"
          />
        </div>
        <div class="item-content">
          <img
            v-if="isImage(item)"
            :src="item.content"
            class="item-image-preview"
            alt="preview"
          >
          <div
            v-else-if="isFiles(item)"
            class="item-files"
          >
            <div
              v-for="file in getFiles(item)"
              :key="file"
              class="file-item"
            >
              <FileText
                :size="14"
                class="file-icon"
              />
              <span class="file-name">{{ getFileName(file) }}</span>
              <span class="file-ext">{{ getFileExtension(file) }}</span>
            </div>
          </div>
          <template v-else>
            <span class="item-text">{{ formatContent(item) }}</span>
          </template>
          <span class="item-meta">
            <span class="item-type">{{ getTypeLabel(item.type) }}</span>
            <span class="item-time">{{ formatTime(item.timestamp) }}</span>
          </span>
        </div>
        <div
          class="item-action favorite-action"
          @click.stop="handleToggleFavorite(item)"
        >
          <Star
            :size="14"
            :class="{ starred: favoriteContents.has(item.content) }"
          />
        </div>
        <div
          class="item-action"
          :class="{ 'copied-action': copiedId === item.id }"
        >
          <Check
            v-if="copiedId === item.id"
            :size="14"
          />
          <Copy
            v-else
            :size="14"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clipboard-panel {
  display: flex;
  flex-direction: column;
  background-color: var(--spotlight-bg);
  outline: none;
}

.clipboard-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--spotlight-placeholder);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-item:hover {
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text);
}

.tab-item.active {
  background-color: var(--spotlight-tag-bg);
  color: var(--spotlight-text);
}

.clipboard-list {
  flex: 1;
  min-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 16px;
  color: var(--spotlight-placeholder);
}

.empty-icon {
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  margin: 0;
}

.clipboard-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.clipboard-item:hover {
  background-color: var(--spotlight-item-hover);
}

.clipboard-item.copied {
  background-color: var(--spotlight-tag-bg);
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-icon);
  flex-shrink: 0;
}

.item-image-preview {
  max-width: 100%;
  max-height: 80px;
  border-radius: 4px;
  object-fit: contain;
}

.item-files {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--spotlight-text);
}

.file-icon {
  color: var(--spotlight-icon);
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-ext {
  font-size: 11px;
  color: var(--spotlight-placeholder);
  text-transform: uppercase;
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.item-text {
  font-size: 14px;
  color: var(--spotlight-text);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--spotlight-placeholder);
}

.item-type {
  padding: 2px 6px;
  background-color: var(--spotlight-tag-bg);
  border-radius: 4px;
}

.item-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--spotlight-placeholder);
  opacity: 0;
  transition: opacity 0.15s;
}

.favorite-action {
  cursor: pointer;
}

.favorite-action:hover {
  color: var(--spotlight-text);
}

.starred {
  color: #f59e0b;
  fill: #f59e0b;
}

.clipboard-item:hover .item-action {
  opacity: 1;
}
</style>
