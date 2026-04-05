<script setup lang="ts">
import type { Category, Note } from '../types';
import CategoryList from './CategoryList.vue';
import NoteList from './NoteList.vue';

interface Props {
  categories: Category[];
  notes: Note[];
  activeCategoryId: string | null;
  activeNoteId: string | null;
}

defineProps<Props>();

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'selectCategory', categoryId: string | null): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'createCategory'): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'deleteCategory', categoryId: string): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'selectNote', noteId: string): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'createNote'): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'deleteNote', noteId: string): void;
}>();
</script>

<template>
  <div class="notes-sidebar">
    <CategoryList
      :categories="categories"
      :active-category-id="activeCategoryId"
      @select="emit('selectCategory', $event)"
      @create="emit('createCategory')"
      @delete="emit('deleteCategory', $event)"
    />
    <NoteList
      :notes="notes"
      :active-note-id="activeNoteId"
      @select="emit('selectNote', $event)"
      @create="emit('createNote')"
      @delete="emit('deleteNote', $event)"
    />
  </div>
</template>

<style scoped>
.notes-sidebar {
  display: flex;
  flex-direction: column;
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  background-color: var(--spotlight-bg-secondary, var(--spotlight-bg));
}
</style>
