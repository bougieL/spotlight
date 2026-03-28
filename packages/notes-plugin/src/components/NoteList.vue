<script setup lang="ts">
import { FileText, Plus, Trash2 } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { BaseIconButton } from '@spotlight/components';
import type { Note } from '../index';

interface Props {
  notes: Note[];
  activeNoteId: string | null;
}

defineProps<Props>();

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'select', noteId: string): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'create'): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'delete', noteId: string): void;
}>();

const { t } = useI18n();

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diff < 7 * oneDay) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

function getPreview(content: string): string {
  const text = content.replace(/[#*_`~[\]]/g, '').trim();
  return text.length > 50 ? text.substring(0, 50) + '...' : text || t('notes.untitled');
}

function handleDelete(event: Event, noteId: string) {
  event.stopPropagation();
  if (confirm(t('notes.confirmDeleteNote'))) {
    emit('delete', noteId);
  }
}
</script>

<template>
  <div class="note-list">
    <div class="note-header">
      <span class="header-title">{{ t('notes.notes') }}</span>
      <BaseIconButton size="small" :title="t('notes.addNote')" @click="emit('create')">
        <Plus :size="16" />
      </BaseIconButton>
    </div>
    <div class="note-items">
      <div
        v-for="note in notes"
        :key="note.id"
        class="note-item"
        :class="{ 'is-active': activeNoteId === note.id }"
        @click="emit('select', note.id)"
      >
        <FileText :size="16" class="note-icon" />
        <div class="note-info">
          <span class="note-title">{{ note.title || t('notes.untitled') }}</span>
          <span class="note-preview">{{ getPreview(note.content) }}</span>
        </div>
        <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
        <BaseIconButton
          class="delete-btn"
          size="small"
          variant="danger"
          :title="t('notes.delete')"
          @click="(e: Event) => handleDelete(e, note.id)"
        >
          <Trash2 :size="14" />
        </BaseIconButton>
      </div>
      <div v-if="notes.length === 0" class="empty-state">
        {{ t('notes.noNotes') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.header-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--spotlight-text-secondary, var(--spotlight-placeholder));
}

.note-items {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.note-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-radius: 4px;
  margin: 0 4px;
}

.note-item:hover {
  background-color: var(--spotlight-item-hover);
}

.note-item.is-active {
  background-color: var(--spotlight-tag-bg);
}

.note-icon {
  flex-shrink: 0;
  color: var(--spotlight-text-secondary, var(--spotlight-placeholder));
}

.note-item.is-active .note-icon {
  color: var(--spotlight-tag-text);
}

.note-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.note-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--spotlight-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-preview {
  font-size: 11px;
  color: var(--spotlight-text-secondary, var(--spotlight-placeholder));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-date {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--spotlight-text-secondary, var(--spotlight-placeholder));
}

.delete-btn {
  opacity: 0;
}

.note-item:hover .delete-btn {
  opacity: 1;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-size: 13px;
  color: var(--spotlight-placeholder);
}
</style>
