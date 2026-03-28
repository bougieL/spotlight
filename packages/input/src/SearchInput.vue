<script setup lang="ts">
import { Search, X, FileText, ArrowLeft, Settings } from 'lucide-vue-next';
import { ref, computed } from 'vue';
import { tauriApi } from '@spotlight/api';
import { useI18n } from '@spotlight/i18n';
import type { FileItem } from '@spotlight/core';

const { t } = useI18n();

export type { FileItem };

interface Props {
  modelValue: string;
  files: FileItem[];
  isPanelMode?: boolean;
  pluginName?: string;
  pluginIcon?: string;
}

const props = defineProps<Props>();

const displayPluginName = computed(() => props.pluginName ?? '');

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'update:modelValue', value: string): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'update:files', value: FileItem[]): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'search', query: string, files: FileItem[]): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'back'): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'openSettings'): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);

const handleInput = (event: InputEvent) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
  emit('search', target.value, props.files);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (props.isPanelMode) {
      emit('back');
    } else if (inputRef.value) {
      const isEmpty = !inputRef.value.value;
      inputRef.value.value = '';
      emit('update:modelValue', '');
      emit('search', '', props.files);
      if (isEmpty) {
        tauriApi.hideWindow();
      }
    }
  }
};

const handleBack = () => {
  emit('back');
};

const handleOpenSettings = () => {
  emit('openSettings');
};

const removeFile = (id: string) => {
  emit('update:files', props.files.filter((f) => f.id !== id));
};

const focus = () => {
  inputRef.value?.focus();
};

defineExpose({ focus });

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

    newFiles.push({
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name || 'pasted-image',
      path: '',
      src: dataUrl,
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
        path: filePath || '',
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
    <div class="spotlight-input-row" data-tauri-drag-region>
      <button v-if="props.isPanelMode" class="back-button" @click="handleBack" aria-label="Back">
        <ArrowLeft class="back-icon" :size="24" />
      </button>
      <Search v-else class="search-icon" :size="24" />
      <span v-if="props.isPanelMode && displayPluginName" class="plugin-name">
        <img v-if="props.pluginIcon" :src="props.pluginIcon" class="plugin-icon" />
        {{ displayPluginName }}
      </span>
      <input
        ref="inputRef"
        type="text"
        class="spotlight-input"
        :placeholder="t('input.search')"
        :value="modelValue"
        @input="handleInput"
        @paste="handlePaste"
        @keydown="handleKeydown"
      />
      <button class="settings-button" @click="handleOpenSettings" aria-label="Settings">
        <Settings class="settings-icon" :size="20" />
      </button>
    </div>
    <div v-if="props.files.length > 0" class="files-container">
      <div v-for="file in props.files" :key="file.id" class="file-item" :title="file.path">
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
  max-width: 800px;
  border-bottom: 1px solid var(--spotlight-border);
}

.spotlight-input-row {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  background-color: var(--spotlight-bg);
  cursor: move;
}

.search-icon {
  color: var(--spotlight-icon);
  flex-shrink: 0;
  margin-right: 12px;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  margin-right: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--spotlight-icon);
  flex-shrink: 0;
}

.back-button:hover {
  color: var(--spotlight-text);
}

.back-icon {
  flex-shrink: 0;
}

.plugin-name {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  margin-right: 12px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 500;
  background-color: var(--spotlight-tag-bg);
  color: var(--spotlight-tag-text);
  flex-shrink: 0;
}

.plugin-icon {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  object-fit: contain;
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

.settings-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  margin-left: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: var(--spotlight-icon);
  flex-shrink: 0;
}

.settings-button:hover {
  background-color: var(--spotlight-hover-bg);
  color: var(--spotlight-text);
}

.settings-icon {
  flex-shrink: 0;
}

.files-container {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 0 24px 12px;
  overflow-x: auto;
  background-color: var(--spotlight-bg);
  scrollbar-width: none;
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
