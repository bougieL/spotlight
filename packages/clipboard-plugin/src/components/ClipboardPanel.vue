<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Clipboard, FileText, Image, Copy, Check } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { clipboardPlugin, type ClipboardItem, type ClipboardItemType } from '../index';
import { on, type UnlistenFn } from '@spotlight/api';

interface Props {
  query: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();

const items = ref<ClipboardItem[]>([]);
const copiedId = ref<string | null>(null);
let unlistenClipboard: UnlistenFn | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const filteredItems = computed(() => {
  if (!props.query.trim()) {
    return items.value;
  }
  const query = props.query.toLowerCase();
  return items.value.filter(item => item.content.toLowerCase().includes(query));
});

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
  if (text.length > 100) {
    return text.substring(0, 100) + '...';
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

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return 'Just now';
  }
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  return date.toLocaleDateString();
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
    emit('close');
    return;
  }
}

onMounted(async () => {
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
  const data = await clipboardPlugin.getData();
  items.value = data.items;
}

async function handleItemClick(item: ClipboardItem) {
  await handleCopy(item);
}
</script>

<template>
  <div class="clipboard-panel" tabindex="0" @keydown="handleKeydown">
    <div class="clipboard-list">
      <div v-if="filteredItems.length === 0" class="empty-state">
        <Clipboard :size="48" class="empty-icon" />
        <p class="empty-text">{{ t('clipboard.empty') }}</p>
      </div>

      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="clipboard-item"
        :class="{ copied: copiedId === item.id }"
        @click="handleItemClick(item)"
      >
        <div class="item-icon">
          <component :is="getTypeIcon(item.type)" :size="16" />
        </div>
        <div class="item-content">
          <img v-if="isImage(item)" :src="item.content" class="item-image-preview" alt="preview" />
          <div v-else-if="isFiles(item)" class="item-files">
            <div v-for="file in getFiles(item)" :key="file" class="file-item">
              <FileText :size="14" class="file-icon" />
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
        <div class="item-action" :class="{ 'copied-action': copiedId === item.id }">
          <Check v-if="copiedId === item.id" :size="14" />
          <Copy v-else :size="14" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clipboard-panel {
  display: flex;
  flex-direction: column;
  height: 400px;
  background-color: var(--spotlight-bg);
  outline: none;
}

.clipboard-list {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
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
  white-space: nowrap;
  overflow: hidden;
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

.clipboard-item:hover .item-action {
  opacity: 1;
}
</style>
