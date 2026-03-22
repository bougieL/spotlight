<script setup lang="ts">
import { FolderPlus, Trash2, Folder } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { BaseIconButton } from '@spotlight/components';
import type { Category } from '../index';

interface Props {
  categories: Category[];
  activeCategoryId: string | null;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'select', categoryId: string | null): void;
  (e: 'create'): void;
  (e: 'delete', categoryId: string): void;
}>();

const { t } = useI18n();

function handleDelete(event: Event, categoryId: string) {
  event.stopPropagation();
  if (confirm(t('notes.confirmDeleteCategory'))) {
    emit('delete', categoryId);
  }
}
</script>

<template>
  <div class="category-list">
    <div class="category-header">
      <span class="header-title">{{ t('notes.categories') }}</span>
      <BaseIconButton size="small" :title="t('notes.addCategory')" @click="emit('create')">
        <FolderPlus :size="16" />
      </BaseIconButton>
    </div>
    <div class="category-items">
      <div
        class="category-item"
        :class="{ 'is-active': activeCategoryId === null }"
        @click="emit('select', null)"
      >
        <Folder :size="16" class="category-icon" />
        <span class="category-name">{{ t('notes.allNotes') }}</span>
      </div>
      <div
        v-for="category in categories"
        :key="category.id"
        class="category-item"
        :class="{ 'is-active': activeCategoryId === category.id }"
        @click="emit('select', category.id)"
      >
        <Folder :size="16" class="category-icon" />
        <span class="category-name">{{ category.name }}</span>
        <BaseIconButton
          class="delete-btn"
          size="small"
          variant="danger"
          :title="t('notes.delete')"
          @click="(e: Event) => handleDelete(e, category.id)"
        >
          <Trash2 :size="14" />
        </BaseIconButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-list {
  display: flex;
  flex-direction: column;
}

.category-header {
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

.category-items {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  overflow-y: auto;
  max-height: 200px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-radius: 4px;
  margin: 0 4px;
}

.category-item:hover {
  background-color: var(--spotlight-item-hover);
}

.category-item.is-active {
  background-color: var(--spotlight-tag-bg);
}

.category-icon {
  flex-shrink: 0;
  color: var(--spotlight-text-secondary, var(--spotlight-placeholder));
}

.category-item.is-active .category-icon {
  color: var(--spotlight-tag-text);
}

.category-name {
  flex: 1;
  font-size: 13px;
  color: var(--spotlight-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-btn {
  opacity: 0;
}

.category-item:hover .delete-btn {
  opacity: 1;
}
</style>
