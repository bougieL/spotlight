<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from '@spotlight/i18n';
import type { Note, Category } from '../index';

interface Props {
  note: Note | null;
  categories: Category[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', updates: { title?: string; content?: string; categoryId?: string | null }): void;
}>();

const { t } = useI18n();
const title = ref('');
const content = ref('');
const categoryId = ref<string | null>(null);

watch(() => props.note, (newNote) => {
  if (newNote) {
    title.value = newNote.title;
    content.value = newNote.content;
    categoryId.value = newNote.categoryId;
  } else {
    title.value = '';
    content.value = '';
    categoryId.value = null;
  }
}, { immediate: true });

watch([title, content, categoryId], () => {
  if (props.note) {
    emit('update', {
      title: title.value,
      content: content.value,
      categoryId: categoryId.value,
    });
  }
});
</script>

<template>
  <div class="note-editor">
    <div class="editor-header">
      <input
        v-model="title"
        type="text"
        class="title-input"
        :placeholder="t('notes.titlePlaceholder')"
      />
      <select
        v-model="categoryId"
        class="category-select"
      >
        <option :value="null">{{ t('notes.noCategory') }}</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
          {{ cat.name }}
        </option>
      </select>
    </div>
    <div class="editor-content">
      <textarea
        v-model="content"
        class="editor-textarea"
        :placeholder="t('notes.placeholder')"
        spellcheck="false"
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
.note-editor {
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.title-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 16px;
  font-weight: 600;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-radius: 6px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  outline: none;
  transition: border-color 0.15s ease;
}

.title-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.title-input::placeholder {
  color: var(--spotlight-placeholder);
}

.category-select {
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-radius: 6px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease;
  min-width: 140px;
}

.category-select:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.editor-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-textarea {
  width: 100%;
  height: 100%;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  border: none;
  resize: none;
  background-color: transparent;
  color: var(--spotlight-text);
  outline: none;
}

.editor-textarea::placeholder {
  color: var(--spotlight-placeholder);
}
</style>
