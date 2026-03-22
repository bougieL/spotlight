<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { marked } from 'marked';
import { FileText, Eye, EyeOff } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { notesPlugin, type Note, type Category } from '../index';
import NotesSidebar from './NotesSidebar.vue';

interface Props {
  query: string;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();

const categories = ref<Category[]>([]);
const notes = ref<Note[]>([]);
const activeNoteId = ref<string | null>(null);
const isPreview = ref(false);

const activeNote = computed(() => {
  if (!activeNoteId.value) return null;
  return notes.value.find(n => n.id === activeNoteId.value) || null;
});

const filteredNotes = computed(() => {
  if (activeCategoryId.value === null) {
    return notes.value;
  }
  return notes.value.filter(n => n.categoryId === activeCategoryId.value);
});

const activeCategoryId = ref<string | null>(null);

const renderedContent = computed(() => {
  if (!activeNote.value || !activeNote.value.content.trim()) {
    return '<p class="empty-hint">' + t('notes.placeholder') + '</p>';
  }
  return marked(activeNote.value.content);
});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  const data = await notesPlugin.getNotesData();
  categories.value = data.categories;
  notes.value = data.notes;
  activeNoteId.value = data.activeNoteId;

  if (data.activeNoteId) {
    const note = data.notes.find(n => n.id === data.activeNoteId);
    if (note) {
      activeCategoryId.value = note.categoryId;
    }
  }
}

async function selectCategory(categoryId: string | null) {
  activeCategoryId.value = categoryId;
}

async function handleCreateCategory() {
  const name = prompt(t('notes.categoryNamePrompt'));
  if (name && name.trim()) {
    await notesPlugin.createCategory(name.trim());
    await loadData();
  }
}

async function handleDeleteCategory(categoryId: string) {
  await notesPlugin.deleteCategory(categoryId);
  await loadData();
}

async function handleSelectNote(noteId: string) {
  activeNoteId.value = noteId;
  const note = notes.value.find(n => n.id === noteId);
  if (note) {
    activeCategoryId.value = note.categoryId;
  }
  await notesPlugin.setActiveNote(noteId);
}

async function handleCreateNote() {
  const note = await notesPlugin.createNote(activeCategoryId.value);
  notes.value.push(note);
  activeNoteId.value = note.id;
}

async function handleDeleteNote(noteId: string) {
  await notesPlugin.deleteNote(noteId);
  await loadData();
}

async function handleUpdateNote(updates: { title?: string; content?: string; categoryId?: string | null }) {
  if (!activeNoteId.value) return;
  await notesPlugin.updateNote(activeNoteId.value, updates);
  await loadData();
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
    return;
  }
}

</script>

<template>
  <div class="notes-panel" tabindex="0" @keydown="handleKeydown">
    <NotesSidebar
      :categories="categories"
      :notes="filteredNotes"
      :activeCategoryId="activeCategoryId"
      :activeNoteId="activeNoteId"
      @selectCategory="selectCategory"
      @createCategory="handleCreateCategory"
      @deleteCategory="handleDeleteCategory"
      @selectNote="handleSelectNote"
      @createNote="handleCreateNote"
      @deleteNote="handleDeleteNote"
    />

    <div class="notes-main">
      <div v-if="activeNote" class="editor-container">
        <div class="editor-header">
          <input
            :value="activeNote.title"
            @input="handleUpdateNote({ title: ($event.target as HTMLInputElement).value })"
            type="text"
            class="title-input"
            :placeholder="t('notes.titlePlaceholder')"
          />
          <select
            :value="activeNote.categoryId"
            @change="handleUpdateNote({ categoryId: ($event.target as HTMLSelectElement).value || null })"
            class="category-select"
          >
            <option :value="null">{{ t('notes.noCategory') }}</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          <button
            class="preview-toggle"
            @click="isPreview = !isPreview"
            :title="isPreview ? t('notes.edit') : t('notes.preview')"
          >
            <component :is="isPreview ? EyeOff : Eye" :size="16" />
          </button>
        </div>

        <div class="notes-content">
          <textarea
            v-if="!isPreview"
            :value="activeNote.content"
            @input="handleUpdateNote({ content: ($event.target as HTMLTextAreaElement).value })"
            class="notes-editor"
            :placeholder="t('notes.placeholder')"
            spellcheck="false"
          ></textarea>
          <div
            v-else
            class="notes-preview"
            v-html="renderedContent"
          ></div>
        </div>
      </div>

      <div v-else class="empty-state">
        <FileText :size="48" class="empty-icon" />
        <p class="empty-text">{{ t('notes.selectNoteOrCreate') }}</p>
        <button class="create-button" @click="handleCreateNote">
          {{ t('notes.addNote') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notes-panel {
  display: flex;
  height: 450px;
  background-color: var(--spotlight-bg);
  outline: none;
}

.notes-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-header {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  align-items: center;
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

.preview-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-radius: 6px;
  background-color: transparent;
  color: var(--spotlight-text-secondary, var(--spotlight-placeholder));
  cursor: pointer;
  transition: all 0.15s ease;
}

.preview-toggle:hover {
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text);
}

.notes-content {
  flex: 1;
  overflow: hidden;
}

.notes-editor {
  width: 100%;
  height: 100%;
  padding: 16px;
  border: none;
  resize: none;
  background-color: transparent;
  color: var(--spotlight-text);
  outline: none;
}

.notes-editor::placeholder {
  color: var(--spotlight-placeholder);
}

.notes-preview {
  width: 100%;
  height: 100%;
  padding: 16px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
  color: var(--spotlight-text);
}

.notes-preview :deep(h1) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.notes-preview :deep(h2) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 16px 0 8px 0;
}

.notes-preview :deep(h3) {
  font-size: 1.1em;
  font-weight: 600;
  margin: 12px 0 6px 0;
}

.notes-preview :deep(p) {
  margin: 0 0 12px 0;
}

.notes-preview :deep(p.empty-hint) {
  color: var(--spotlight-placeholder);
  font-style: italic;
}

.notes-preview :deep(ul),
.notes-preview :deep(ol) {
  margin: 0 0 12px 0;
  padding-left: 24px;
}

.notes-preview :deep(li) {
  margin-bottom: 4px;
}

.notes-preview :deep(code) {
  padding: 2px 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
  background-color: var(--spotlight-item-hover);
  border-radius: 4px;
}

.notes-preview :deep(pre) {
  margin: 0 0 12px 0;
  padding: 12px;
  background-color: var(--spotlight-item-hover);
  border-radius: 6px;
  overflow-x: auto;
}

.notes-preview :deep(pre code) {
  padding: 0;
  background-color: transparent;
}

.notes-preview :deep(blockquote) {
  margin: 0 0 12px 0;
  padding: 8px 16px;
  border-left: 4px solid var(--spotlight-tag-bg);
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text-secondary, var(--spotlight-placeholder));
}

.notes-preview :deep(a) {
  color: var(--spotlight-primary, var(--spotlight-icon, #666));
  text-decoration: none;
}

.notes-preview :deep(a:hover) {
  text-decoration: underline;
}

.notes-preview :deep(hr) {
  margin: 16px 0;
  border: none;
  border-top: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.notes-preview :deep(table) {
  width: 100%;
  margin: 0 0 12px 0;
  border-collapse: collapse;
}

.notes-preview :deep(th),
.notes-preview :deep(td) {
  padding: 8px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  text-align: left;
}

.notes-preview :deep(th) {
  background-color: var(--spotlight-item-hover);
  font-weight: 600;
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

.create-button {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-radius: 6px;
  background-color: var(--spotlight-tag-bg);
  color: var(--spotlight-tag-text);
  cursor: pointer;
  transition: all 0.15s ease;
}

.create-button:hover {
  opacity: 0.9;
}
</style>
