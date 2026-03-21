<script setup lang="ts">
import { Search, X, FileText } from 'lucide-vue-next';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { pluginRegistry } from '../plugins';
import type { SearchResultItem } from '../plugins/types';

interface FileItem {
  id: string;
  name: string;
  src: string;
  type: 'image' | 'file';
}

const inputRef = ref<HTMLInputElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);
const searchResults = ref<SearchResultItem[]>([]);
const selectedIndex = ref(0);
const showResults = ref(false);
const query = ref('');
const files = ref<FileItem[]>([]);

const resizeWindow = async () => {
  try {
    const wrapper = wrapperRef.value;
    if (!wrapper) return;
    const height = wrapper.scrollHeight;
    await invoke('resize_window', { height });
  } catch {
    // ignore
  }
};

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;
watch([() => files.value.length, showResults, () => searchResults.value.length], () => {
  if (!isInitialized) {
    isInitialized = true;
    return;
  }
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resizeWindow, 100);
}, { flush: 'post' });

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      searchResults.value = [];
      showResults.value = false;
      return;
    }

    const results = await pluginRegistry.search({ query: searchQuery });
    searchResults.value = results;
    showResults.value = results.length > 0;
    selectedIndex.value = 0;
  };

const handleInput = (event: InputEvent) => {
  const target = event.target as HTMLInputElement;
  query.value = target.value;
  performSearch(query.value);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (showResults.value && searchResults.value.length > 0) {
      selectItem(searchResults.value[selectedIndex.value]);
    }
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (selectedIndex.value < searchResults.value.length - 1) {
      selectedIndex.value++;
    }
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (selectedIndex.value > 0) {
      selectedIndex.value--;
    }
    return;
  }

  if (event.key === 'Escape') {
    showResults.value = false;
    return;
  }
};

const selectItem = (item: SearchResultItem) => {
  item.action();
  showResults.value = false;
  query.value = '';
  searchResults.value = [];
  if (inputRef.value) {
    inputRef.value.value = '';
  }
};

const removeFile = (id: string) => {
  files.value = files.value.filter((f) => f.id !== id);
  resizeWindow();
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
      const { invoke, convertFileSrc } = await import('@tauri-apps/api/core');
      const localPath = await invoke<string>('save_temp_image', { dataUrl });
      imageSrc = convertFileSrc(localPath);
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
      const { invoke } = await import('@tauri-apps/api/core');
      paths = await invoke<string[]>('get_clipboard_file_paths');
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

  files.value = [...files.value, ...newFiles];

  if (imageItems.length === 0 && fileItems.length === 0) {
    const text = event.clipboardData?.getData('text/plain') || '';
    if (text && inputRef.value) {
      const start = inputRef.value.selectionStart ?? 0;
      const end = inputRef.value.selectionEnd ?? 0;
      const currentValue = inputRef.value.value;
      inputRef.value.value = currentValue.substring(0, start) + text + currentValue.substring(end);
      inputRef.value.selectionStart = inputRef.value.selectionEnd = start + text.length;
      query.value = inputRef.value.value;
      performSearch(query.value);
    }
  }
};

const handleClickOutside = (event: globalThis.MouseEvent) => {
  const target = event.target as globalThis.HTMLElement;
  if (!target.closest('.spotlight-results-dropdown')) {
    showResults.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="wrapperRef" class="spotlight-input-wrapper">
    <div class="spotlight-input-row">
      <Search class="search-icon" :size="24" />
      <input
        ref="inputRef"
        type="text"
        class="spotlight-input"
        placeholder="Search..."
        @input="handleInput"
        @keydown="handleKeydown"
        @paste="handlePaste"
      />
    </div>
    <div v-if="files.length > 0" class="files-container">
      <div v-for="file in files" :key="file.id" class="file-item">
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
    <div v-if="showResults" class="spotlight-results-dropdown">
      <div
        v-for="(item, index) in searchResults"
        :key="index"
        class="spotlight-result-item"
        :class="{ 'is-selected': index === selectedIndex }"
        @click="selectItem(item)"
        @mouseenter="selectedIndex = index"
      >
        <component :is="item.icon" class="result-icon" :size="20" />
        <div class="result-content">
          <div class="result-title">{{ item.title }}</div>
          <div class="result-desc">{{ item.desc }}</div>
        </div>
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
  position: relative;
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

.spotlight-results-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 4px 0 0 0;
  padding: 8px 0;
  background-color: var(--spotlight-bg);
  border-radius: 12px;
  box-shadow: 0 4px 20px var(--spotlight-shadow);
  z-index: 1000;
  max-height: 320px;
  overflow-y: auto;
}

.spotlight-result-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.spotlight-result-item:hover,
.spotlight-result-item.is-selected {
  background-color: var(--spotlight-item-hover);
}

.result-icon {
  color: var(--spotlight-icon);
  flex-shrink: 0;
  margin-right: 12px;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--spotlight-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-desc {
  font-size: 12px;
  color: var(--spotlight-placeholder);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}
</style>
