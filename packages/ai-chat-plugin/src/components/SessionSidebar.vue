<script setup lang="ts">
import { MessageCircle, Trash2, Plus } from 'lucide-vue-next';
import { BaseIconButton } from '@spotlight/components';
import type { ChatSession } from '../index';
import { translations, getLocale } from '@spotlight/i18n';

const t = translations[getLocale()];

interface Props {
  sessions: ChatSession[];
  currentSessionId: string | null;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'delete', id: string, event: Event): void;
  (e: 'new'): void;
}>();
</script>

<template>
  <div class="session-sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">{{ t['chatHistory'] || 'Chat History' }}</span>
      <BaseIconButton size="small" :title="t['newChat'] || 'New Chat'" @click="$emit('new')">
        <Plus :size="14" />
      </BaseIconButton>
    </div>
    <div class="session-list">
      <div
        v-for="session in sessions"
        :key="session.id"
        :class="['session-item', { active: session.id === currentSessionId }]"
        @click="$emit('select', session.id)"
      >
        <MessageCircle :size="14" />
        <span class="session-title">{{ session.title }}</span>
        <BaseIconButton
          size="small"
          variant="default"
          class="delete-btn"
          @click="$emit('delete', session.id, $event)"
        >
          <Trash2 :size="12" />
        </BaseIconButton>
      </div>
      <div v-if="sessions.length === 0" class="empty-sessions">
        {{ t['newChat'] || 'No chats yet' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-sidebar {
  width: 180px;
  border-right: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  display: flex;
  flex-direction: column;
  background-color: var(--spotlight-bg-secondary, var(--spotlight-bg));
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.sidebar-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--spotlight-text-secondary);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
  color: var(--spotlight-text-secondary);
  font-size: 13px;
}

.session-item:hover {
  background-color: var(--spotlight-item-hover);
}

.session-item.active {
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text);
}

.session-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.15s;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.empty-sessions {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--spotlight-placeholder);
}
</style>
