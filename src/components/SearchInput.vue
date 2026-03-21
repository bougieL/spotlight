<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import { ref, onMounted, onUnmounted } from 'vue';
import { pluginRegistry } from '../plugins';
import { samplePlugin } from '../plugins/builtins/samplePlugin';
import type { SearchResultItem } from '../plugins/types';

const editableRef = ref<HTMLDivElement | null>(null);
const searchResults = ref<SearchResultItem[]>([]);
const selectedIndex = ref(0);
const showResults = ref(false);

let debounceTimer: number | null = null;

onMounted(() => {
  pluginRegistry.register(samplePlugin);
});

onUnmounted(() => {
  pluginRegistry.unregister('sample');
});

const performSearch = async (query: string) => {
  if (!query.trim()) {
    searchResults.value = [];
    showResults.value = false;
    return;
  }

  const results = await pluginRegistry.search(query);
  searchResults.value = results;
  showResults.value = results.length > 0;
  selectedIndex.value = 0;
};

const handleInput = () => {
  const query = editableRef.value?.textContent || '';

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    performSearch(query);
  }, 150);
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
  if (editableRef.value) {
    editableRef.value.textContent = '';
  }
  searchResults.value = [];
};

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault();
  const items = event.clipboardData?.items;
  if (!items) return;

  const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));

  if (imageItems.length > 0) {
    let imageIndex = 0;
    const reader = new FileReader();

    const readNextImage = () => {
      if (imageIndex >= imageItems.length) return;

      const item = imageItems[imageIndex];
      const file = item.getAsFile();
      if (!file) {
        imageIndex++;
        readNextImage();
        return;
      }

      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;

        // Save image to temp file and get accessible URL
        let imageSrc = dataUrl;
        try {
          const { invoke, convertFileSrc } = await import('@tauri-apps/api/core');
          const filePath = await invoke<string>('save_temp_image', { dataUrl });
          // Use asset protocol to access local file
          imageSrc = convertFileSrc(filePath);
        } catch (err) {
          console.warn('Failed to save image to temp file, using data URL:', err);
        }

        const img = document.createElement('img');
        img.src = imageSrc;
        img.alt = file.name || 'pasted-image';
        img.className = 'pasted-image';

        const editable = editableRef.value;
        if (!editable) return;

        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        if (range) {
          range.deleteContents();
          range.insertNode(img);
          // Move cursor after the inserted image
          range.collapse(false);
        } else {
          editable.appendChild(img);
        }

        editable.focus();

        imageIndex++;
        readNextImage();
      };

      reader.readAsDataURL(file);
    };

    readNextImage();
  } else {
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
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
  <div class="spotlight-input-wrapper">
    <Search class="search-icon" :size="24" />
    <div
      ref="editableRef"
      contenteditable="true"
      class="spotlight-contenteditable"
      data-placeholder="Search..."
      @input="handleInput"
      @keydown="handleKeydown"
      @paste="handlePaste"
    ></div>
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
  align-items: center;
  width: 100%;
  max-width: 600px;
  height: 64px;
  margin: 0;
  padding: 0 24px;
  border: none;
  background-color: var(--spotlight-bg);
  transition: background-color 0.2s;
  position: relative;
}

.search-icon {
  color: var(--spotlight-icon);
  flex-shrink: 0;
  margin-right: 12px;
}

.spotlight-contenteditable {
  flex: 1;
  height: 64px;
  line-height: 64px;
  display: flex;
  align-items: center;
  background: transparent;
  border: none;
  outline: none;
  font-size: 18px;
  color: var(--spotlight-text);
  caret-color: var(--spotlight-text);
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

.spotlight-contenteditable::-webkit-scrollbar {
  display: none;
}

.spotlight-contenteditable:empty::before {
  content: attr(data-placeholder);
  color: var(--spotlight-placeholder);
  pointer-events: none;
}

:deep(.pasted-image) {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  margin-left: 4px;
  margin-right: 4px;
  vertical-align: middle;
  background-color: var(--spotlight-image-bg);
  box-shadow: 0 2px 8px var(--spotlight-shadow);
}

.spotlight-results-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-width: 600px;
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
