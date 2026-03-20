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
const searchQuery = ref('');

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
  searchQuery.value = query;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    performSearch(query);
  }, 150);
};

const handleBeforeInput = (event: InputEvent) => {
  if (event.inputType !== 'insertText' || !event.data) return;

  // Check if selection contains an image (don't wrap images in spans)
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const container = range.startContainer;

  // If selection contains an image, let browser handle it normally
  if (range.cloneContents().querySelector?.('img')) return;

  event.preventDefault();

  // Check if cursor is inside a text-node
  if (container.nodeType === Node.TEXT_NODE && container.parentElement?.classList.contains('text-node')) {
    const textNode = container as Text;
    const cursorPos = range.startOffset;
    const existingText = textNode.textContent || '';
    const before = existingText.substring(0, cursorPos);
    const after = existingText.substring(cursorPos);
    textNode.textContent = before + event.data + after;
    range.setStart(textNode, cursorPos + event.data.length);
    range.collapse(true);
    return;
  }

  // Check if cursor is right after a text-node
  if (container.previousSibling?.nodeType === Node.ELEMENT_NODE && (container.previousSibling as HTMLElement).classList.contains('text-node')) {
    const textNode = container.previousSibling as HTMLElement;
    textNode.textContent = (textNode.textContent || '') + event.data;
    range.setStartAfter(textNode);
    range.collapse(true);
    return;
  }

  // Check if cursor is at the end and last child is a text-node
  const editable = editableRef.value;
  if (editable && range.startOffset === editable.childNodes.length) {
    const lastChild = editable.lastChild;
    if (lastChild?.nodeType === Node.ELEMENT_NODE && (lastChild as HTMLElement).classList.contains('text-node')) {
      const textNode = lastChild as HTMLElement;
      textNode.textContent = (textNode.textContent || '') + event.data;
      range.setStartAfter(textNode);
      range.collapse(true);
      return;
    }
  }

  // Create new text-node
  const span = document.createElement('span');
  span.className = 'text-node';
  span.textContent = event.data;
  range.deleteContents();
  range.insertNode(span);
  const newRange = document.createRange();
  newRange.setStartAfter(span);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
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

  if (event.key === 'Backspace') {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = editableRef.value;

    if (!container) return;

    const isAtStart =
      range.startOffset === 0 && range.startContainer === container && container.childNodes.length === 0;

    if (isAtStart || (range.collapsed && range.startContainer === container && range.startOffset === 0)) {
      event.preventDefault();
      if (container.childNodes.length > 0) {
        container.removeChild(container.lastChild!);
      }
    }
  }
};

const selectItem = (item: SearchResultItem) => {
  item.action();
  showResults.value = false;
  if (editableRef.value) {
    editableRef.value.textContent = '';
  }
  searchQuery.value = '';
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

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = file.name || 'pasted-image';
        img.className = 'pasted-image';
        img.dataset.id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(img);
          range.collapse(false);
        } else {
          editableRef.value?.appendChild(img);
        }

        editableRef.value?.focus();

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

defineExpose({});
</script>

<template>
  <div class="spotlight-input-wrapper">
    <Search class="search-icon" :size="24" />
    <div
      ref="editableRef"
      contenteditable="true"
      class="spotlight-contenteditable"
      data-placeholder="Search..."
      @beforeinput="handleBeforeInput"
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
  background-color: var(--spotlight-image-bg);
  box-shadow: 0 2px 8px var(--spotlight-shadow);
}

:deep(.text-node) {
  display: inline-block;
  white-space: nowrap;
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
