<script setup lang="ts">
import { Search, X, FileText } from 'lucide-vue-next';
import { ref } from 'vue';
import { tauriApi } from '@spotlight/api';
import type { FileItem } from '@spotlight/core';

export type { FileItem };

interface Props {
  modelValue: string;
  files: FileItem[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'update:modelValue', value: string): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'update:files', value: FileItem[]): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'search', query: string, files: FileItem[]): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);

const handleInput = (event: InputEvent) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
  emit('search', target.value, props.files);
};

const removeFile = (id: string) => {
  emit('update:files', props.files.filter((f) => f.id !== id));
};

const handlePaste = async (event: ClipboardEvent) => {
  event.preventDefault();
  const items = event.clipboardData?.items;
  if (!items) return;

  const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));
  const fileItems = Array.from(items).filter((item) => !item.type.startsWith('image/') && item.kind === 'file');

  const newFiles: FileItem[] = [];

  for (const item of imageItems) {
    const file = item.getAsFile();
    if (!file) continue;

    const reader = new FileReader();
    const imgPromise = new Promise<string>((resolve) => {
      reader.onload = (e) => resolve(e.target?.result as string);
    });
    reader.readAsDataURL(file);
    const dataUrl = await imgPromise;

    let imageSrc = dataUrl;
    try {
      const localPath = await tauriApi.saveTempImage(dataUrl);
      imageSrc = tauriApi.convertFileSrc(localPath);
    } catch {
      // fallback to data url
    }

    newFiles.push({
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name || 'pasted-image',
      src: imageSrc,
      type: 'image',
    });
  }

  if (fileItems.length > 0) {
    let paths: string[] = [];
    try {
      paths = await tauriApi.getClipboardFilePaths();
    } catch {
      // fallback to filename
    }

    for (let i = 0; i < fileItems.length; i++) {
      const filePath = paths[i];
      const fileName = filePath ? filePath.split(/[\\/]/).pop() ?? 'file' : fileItems[i].getAsFile()?.name ?? 'file';

      newFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: fileName,
        src: filePath || '',
        type: 'file',
      });
    }
  }

  emit('update:files', [...props.files, ...newFiles]);

  if (imageItems.length === 0 && fileItems.length === 0) {
    const text = event.clipboardData?.getData('text/plain') || '';
    if (text && inputRef.value) {
      const start = inputRef.value.selectionStart ?? 0;
      const end = inputRef.value.selectionEnd ?? 0;
      const currentValue = inputRef.value.value;
      inputRef.value.value = currentValue.substring(0, start) + text + currentValue.substring(end);
      inputRef.value.selectionStart = inputRef.value.selectionEnd = start + text.length;
      emit('update:modelValue', inputRef.value.value);
      emit('search', inputRef.value.value, props.files);
    }
  }
};

</script>

<template>
  <div class="spotlight-input-wrapper">
    <div class="spotlight-input-row">
      <Search class="search-icon" :size="24" />
      <input
        ref="inputRef"
        type="text"
        class="spotlight-input"
        placeholder="Search..."
        @input="handleInput"
        @paste="handlePaste"
      />
    </div>
    <div v-if="props.files.length > 0" class="files-container">
      <div v-for="file in props.files" :key="file.id" class="file-item">
        <img v-if="file.type === 'image'" :src="file.src" :alt="file.name" class="file-image" />
        <template v-else>
          <FileText class="file-icon" :size="20" />
          <span class="file-name">{{ file.name }}</span>
        </template>
        <button class="remove-btn" @click="removeFile(file.id)" aria-label="Remove">
          <X :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spotlight-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 600px;
}

.spotlight-input-row {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  background-color: var(--spotlight-bg);
}

.search-icon {
  color: var(--spotlight-icon);
  flex-shrink: 0;
  margin-right: 12px;
}

.spotlight-input {
  flex: 1;
  height: 64px;
  line-height: 64px;
  background: transparent;
  border: none;
  outline: none;
  font-size: 18px;
  color: var(--spotlight-text);
  caret-color: var(--spotlight-text);
}

.spotlight-input::placeholder {
  color: var(--spotlight-placeholder);
}

.files-container {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 0 24px 12px;
  overflow-x: auto;
  background-color: var(--spotlight-bg);
  border-top: 1px solid var(--spotlight-border);
}

.files-container::-webkit-scrollbar {
  display: none;
}

.file-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background-color: var(--spotlight-tag-bg);
  color: var(--spotlight-tag-text);
  font-size: 13px;
  font-weight: 500;
}

.file-image {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  background-color: var(--spotlight-image-bg);
}

.file-icon {
  flex-shrink: 0;
}

.file-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  margin-left: 2px;
  border: none;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.2);
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.remove-btn:hover {
  opacity: 1;
}
</style>
