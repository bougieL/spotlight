<script setup lang="ts">
import { ref } from 'vue';
import { Clock, Trash2 } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { recentPlugin, type RecentItem } from '../index';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();

const items = ref<RecentItem[]>([]);

async function loadItems() {
  const data = await recentPlugin.getData();
  items.value = data.items;
}

async function handleClear() {
  await recentPlugin.clearItems();
  items.value = [];
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

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

loadItems();
</script>

<template>
  <div class="recent-panel" tabindex="0" @keydown="handleKeydown">
    <div class="recent-header">
      <h3 class="recent-title">
        <Clock :size="16" />
        {{ t('recent') }}
      </h3>
      <button v-if="items.length > 0" class="clear-btn" @click="handleClear">
        <Trash2 :size="14" />
        {{ t('recent.clear') }}
      </button>
    </div>
    <div class="recent-list">
      <div v-if="items.length === 0" class="empty-state">
        <Clock :size="48" class="empty-icon" />
        <p class="empty-text">{{ t('recent.placeholder') }}</p>
      </div>

      <div
        v-for="item in items"
        :key="item.id"
        class="recent-item"
      >
        <div class="item-icon">
          <Clock :size="16" />
        </div>
        <div class="item-content">
          <span class="item-title">{{ item.title }}</span>
          <span v-if="item.desc" class="item-desc">{{ item.desc }}</span>
        </div>
        <span class="item-time">{{ formatTime(item.timestamp) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recent-panel {
  display: flex;
  flex-direction: column;
  height: 400px;
  background-color: var(--spotlight-bg);
  outline: none;
}

.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--spotlight-border);
}

.recent-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--spotlight-text);
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  color: var(--spotlight-placeholder);
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.clear-btn:hover {
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text);
}

.recent-list {
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

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.recent-item:hover {
  background-color: var(--spotlight-item-hover);
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

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
  font-size: 14px;
  color: var(--spotlight-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-desc {
  font-size: 12px;
  color: var(--spotlight-placeholder);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-time {
  font-size: 12px;
  color: var(--spotlight-placeholder);
  flex-shrink: 0;
}
</style>
