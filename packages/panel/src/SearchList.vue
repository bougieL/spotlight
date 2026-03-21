<script setup lang="ts">
import { FileText, Image, Package } from 'lucide-vue-next';
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { FileItem, SearchResultItem } from '@spotlight/core';

interface Props {
  query: string;
  files: FileItem[];
  searchResults: SearchResultItem[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'select', item: SearchResultItem): void;
}>();

const selectedIndex = ref(0);

watch(
  () => props.searchResults,
  () => {
    selectedIndex.value = 0;
  }
);

const selectItem = (item: SearchResultItem) => {
  emit('select', item);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (props.searchResults.length === 0) return;

  // Handle Ctrl+1-9 shortcuts
  if (event.ctrlKey && event.key >= '1' && event.key <= '9') {
    const index = parseInt(event.key) - 1;
    if (index < props.searchResults.length) {
      event.preventDefault();
      selectItem(props.searchResults[index]);
    }
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % props.searchResults.length;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    selectedIndex.value = selectedIndex.value === 0
      ? props.searchResults.length - 1
      : selectedIndex.value - 1;
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const selectedItem = props.searchResults[selectedIndex.value];
    if (selectedItem) {
      selectItem(selectedItem);
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="search-list">
    <div v-if="files.length > 0" class="search-list-content">
      <div v-for="file in files" :key="file.id" class="search-list-item">
        <Image v-if="file.type === 'image'" :size="16" class="item-icon" />
        <FileText v-else :size="16" class="item-icon" />
        <span class="item-name">{{ file.name }}</span>
      </div>
    </div>
    <div v-if="searchResults.length > 0" class="spotlight-results-dropdown">
      <div
        v-for="(item, index) in searchResults"
        :key="index"
        class="spotlight-result-item"
        :class="{ 'is-selected': index === selectedIndex }"
        @click="selectItem(item)"
        @mouseenter="selectedIndex = index"
      >
        <component
          v-if="item.icon"
          :is="item.icon"
          class="result-icon"
          :size="20"
        />
        <img
          v-else-if="item.iconUrl"
          :src="item.iconUrl"
          class="result-icon-img"
        />
        <Package v-else class="result-icon" :size="20" />
        <div class="result-content">
          <div class="result-title">{{ item.title }}</div>
          <div class="result-desc">{{ item.desc }}</div>
        </div>
        <div v-if="index < 9" class="shortcut-hint">
          Ctrl + {{ index + 1 }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-list {
  display: flex;
  flex-direction: column;
  background-color: var(--spotlight-bg);
  border-top: 1px solid var(--spotlight-border);
}

.search-list-content {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 24px 12px;
}

.search-list-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: var(--spotlight-tag-bg);
  color: var(--spotlight-tag-text);
  font-size: 12px;
}

.item-icon {
  flex-shrink: 0;
}

.item-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spotlight-results-dropdown {
  padding: 8px 0;
  border-top: 1px solid var(--spotlight-border);
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

.result-icon-img {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-right: 12px;
  object-fit: contain;
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

.shortcut-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  margin-left: 8px;
  border-radius: 4px;
  border: 1px solid var(--spotlight-shortcut-border);
  font-size: 11px;
  background-color: var(--spotlight-shortcut-bg);
  color: var(--spotlight-shortcut-text);
  flex-shrink: 0;
}
</style>
