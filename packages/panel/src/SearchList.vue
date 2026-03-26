<script setup lang="ts">
import { Package } from 'lucide-vue-next';
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { translations, useLocale } from '@spotlight/i18n';
import type { SearchResultItem } from '@spotlight/core';
import { usePanelContext } from '@spotlight/core';
import { recentPlugin } from '@spotlight/recent-plugin';
import { pluginRegistry } from '@spotlight/plugin-registry';

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'select', item: SearchResultItem): void;
}>();

const { query, files } = usePanelContext();
const searchResults = ref<SearchResultItem[]>([]);
const selectedIndex = ref(0);
const locale = useLocale();

const translateTitle = (title: string): string => {
  return translations[locale.value][title] ?? title;
};

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const SEARCH_DEBOUNCE_MS = 150;

const performSearch = async () => {
  const q = query.value;
  const f = files.value;
  if (!q.trim()) {
    const results = await recentPlugin.search({ query: q, files: f });
    searchResults.value = results;
  } else {
    const results = await pluginRegistry.search({ query: q, files: f });
    searchResults.value = results;
  }
};

watch(
  () => query.value,
  () => {
    selectedIndex.value = 0;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(performSearch, SEARCH_DEBOUNCE_MS);
  },
  { immediate: true }
);

const selectItem = (item: SearchResultItem) => {
  emit('select', item);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (searchResults.value.length === 0) return;

  // Handle Ctrl+1-9 shortcuts
  if (event.ctrlKey && event.key >= '1' && event.key <= '9') {
    const index = parseInt(event.key) - 1;
    if (index < searchResults.value.length) {
      event.preventDefault();
      selectItem(searchResults.value[index]);
    }
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % searchResults.value.length;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    selectedIndex.value = selectedIndex.value === 0
      ? searchResults.value.length - 1
      : selectedIndex.value - 1;
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const selectedItem = searchResults.value[selectedIndex.value];
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
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <div class="search-list">
    <div v-if="searchResults.length > 0" class="spotlight-results-dropdown">
      <div
        v-for="(item, index) in searchResults"
        :key="index"
        class="spotlight-result-item"
        :class="{ 'is-selected': index === selectedIndex }"
        @click="selectItem(item)"
        @mouseenter="selectedIndex = index"
      >
        <img
          v-if="item.iconUrl"
          :src="item.iconUrl"
          class="result-icon-img"
        />
        <Package v-else class="result-icon" :size="20" />
        <div class="result-content">
          <div class="result-title">{{ translateTitle(item.title) }}</div>
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
  height: 56px;
  padding: 0 20px;
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
