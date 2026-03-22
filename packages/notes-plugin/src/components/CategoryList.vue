<script setup lang="ts">
import { ref } from 'vue';
import { FolderPlus, Trash2, Folder } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
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
const deletingId = ref<string | null>(null);

function handleDelete(event: Event, categoryId: string) {
  event.stopPropagation();
  if (confirm(t('notes.confirmDeleteCategory'))) {
    deletingId.value = categoryId;
    emit('delete', categoryId);
  }
}
</script>

<template>
  <div class="category-list">
    <div class="category-header">
      <span class="header-title">{{ t('notes.categories') }}</span>
      <button class="add-btn" @click="emit('create')" :title="t('notes.addCategory')">
        <FolderPlus :size="16" />
      </button>
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
        <button
          class="delete-btn"
          @click="(e) => handleDelete(e, category.id)"
          :title="t('notes.delete')"
        >
          <Trash2 :size="14" />
        </button>
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

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  color: var(--spotlight-text-secondary, var(--spotlight-placeholder));
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-btn:hover {
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text);
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  color: var(--spotlight-text-secondary, var(--spotlight-placeholder));
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
}

.category-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background-color: var(--spotlight-danger, #dc3545);
  color: white;
}
</style>
