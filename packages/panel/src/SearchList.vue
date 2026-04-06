<script setup lang="ts">
import { Package, Command } from 'lucide-vue-next';
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import type { SearchResultItem, QuickCommand } from '@spotlight/core';
import { usePanelContext } from '@spotlight/core';
import recentPlugin from '@spotlight/recent-plugin';
import { pluginRegistry } from '@spotlight/plugin-registry';

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'select', item: SearchResultItem): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'fillQuery', query: string): void;
}>();

const { query, files, placeholder } = usePanelContext();
const searchResults = ref<SearchResultItem[]>([]);
const selectedIndex = ref(0);
const listRef = ref<HTMLElement | null>(null);

const isQuickCommandMode = computed(() => query.value.startsWith('/'));

const quickCommandResults = computed<SearchResultItem[]>(() => {
  if (!isQuickCommandMode.value) return [];
  const allCommands = pluginRegistry.getQuickCommands();
  const afterSlash = query.value.slice(1);
  const spaceIndex = afterSlash.indexOf(' ');
  const triggerPart = (spaceIndex === -1 ? afterSlash : afterSlash.slice(0, spaceIndex)).toLowerCase().trim();
  const filtered = triggerPart
    ? allCommands.filter(
        (cmd) =>
          cmd.trigger.toLowerCase().includes(triggerPart) ||
          cmd.description.toLowerCase().includes(triggerPart)
      )
    : allCommands;
  return filtered.map((cmd) => ({
    iconUrl: cmd.iconUrl,
    title: `/${cmd.trigger}`,
    desc: cmd.description,
    score: 1000,
    pluginId: '__quick_command__',
    actionId: cmd.trigger,
    actionData: cmd,
  }));
});

const displayResults = computed<SearchResultItem[]>(
  () => (isQuickCommandMode.value ? quickCommandResults.value : searchResults.value)
);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const SEARCH_DEBOUNCE_MS = 150;

const performSearch = async () => {
  const q = query.value;
  const f = files.value;
  if (isQuickCommandMode.value) return;
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
    if (listRef.value) {
      listRef.value.scrollTop = 0;
    }
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(performSearch, SEARCH_DEBOUNCE_MS);
  },
  { immediate: true }
);

const selectItem = (item: SearchResultItem) => {
  if (item.pluginId === '__quick_command__') {
    const cmd = item.actionData as QuickCommand | null;
    if (cmd) {
      emit('fillQuery', `/${cmd.trigger} `);
    } else {
      emit('fillQuery', item.title as string);
    }
  } else {
    emit('select', item);
  }
};

const handleKeydown = async (event: KeyboardEvent) => {
  const results = displayResults.value;
  if (results.length === 0) return;

  // Handle Ctrl+1-9 shortcuts
  if (event.ctrlKey && event.key >= '1' && event.key <= '9') {
    const index = parseInt(event.key) - 1;
    if (index < results.length) {
      event.preventDefault();
      selectItem(results[index]);
    }
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % results.length;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    selectedIndex.value = selectedIndex.value === 0 ? results.length - 1 : selectedIndex.value - 1;
  } else if (event.key === 'Tab' && isQuickCommandMode.value) {
    event.preventDefault();
    const selectedItem = results[selectedIndex.value];
    if (selectedItem) {
      selectItem(selectedItem);
    }
  }
};

onMounted(() => {
  placeholder.value = '';
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <div
    v-if="displayResults.length > 0"
    ref="listRef"
    class="search-list"
  >
    <div
      v-for="(item, index) in displayResults"
      :key="`${item.title}-${item.actionId}-${index}`"
      class="spotlight-result-item"
      :class="{ 'is-selected': index === selectedIndex }"
      @click="selectItem(item)"
      @mouseenter="selectedIndex = index"
    >
      <img
        v-if="item.iconUrl"
        :src="item.iconUrl"
        class="result-icon-img"
      >
      <Command
        v-else-if="item.pluginId === '__quick_command__'"
        class="result-icon"
        :size="20"
      />
      <Package
        v-else
        class="result-icon"
        :size="20"
      />
      <div class="result-content">
        <div class="result-title">
          {{ item.title }}
        </div>
        <div class="result-desc">
          {{ item.desc }}
        </div>
      </div>
      <div
        v-if="index < 9"
        class="shortcut-hint"
      >
        Ctrl + {{ index + 1 }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-list {
  display: flex;
  flex-direction: column;
  background-color: var(--spotlight-bg);
  padding: 8px 0;
  overflow-y: auto;
}

.spotlight-result-item {
  display: flex;
  align-items: center;
  padding: 12px 24px;
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
