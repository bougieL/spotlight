<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { SearchInput } from "@spotlight/input";
import { SearchList } from "@spotlight/panel";
import { pluginRegistry } from "@spotlight/plugin-registry";
import { samplePlugin } from "@spotlight/sample-plugin";
import { appSearchPlugin } from "@spotlight/app-search-plugin";
import { calculatorPlugin } from "@spotlight/calculator-plugin";
import { tauriApi } from "@spotlight/api";
import type { FileItem } from "@spotlight/input";
import type { SearchResultItem } from "@spotlight/core";

pluginRegistry.register(samplePlugin);
pluginRegistry.register(appSearchPlugin);
pluginRegistry.register(calculatorPlugin);

const query = ref('');
const files = ref<FileItem[]>([]);
const searchResults = ref<SearchResultItem[]>([]);

const handleSearch = async (searchQuery: string, searchFiles: FileItem[]) => {
  const results = await pluginRegistry.search({ query: searchQuery, files: searchFiles });
  searchResults.value = results;
};

const handleSelect = (item: SearchResultItem) => {
  item.action();
  query.value = '';
};

let resizeObserver: ResizeObserver | null = null;
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let lastHeight: number | null = null;

const performResize = () => {
  const height = document.documentElement.offsetHeight;
  if (lastHeight === height) return;
  lastHeight = height;
  tauriApi.resizeWindow(height).catch(() => {
    lastHeight = null;
  });
};

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(performResize, 16);
  });
  resizeObserver.observe(document.documentElement);
  performResize();
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  if (resizeTimer) clearTimeout(resizeTimer);
});
</script>

<template>
  <main class="spotlight-container">
    <SearchInput
      v-model="query"
      v-model:files="files"
      @search="handleSearch"
    />
    <SearchList
      :query="query"
      :files="files"
      :search-results="searchResults"
      @select="handleSelect"
    />
  </main>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  width: 600px;
  height: fit-content;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: transparent;
}

body {
  background-color: transparent;
}
</style>

<style scoped>
#app {
  width: 100%;
  height: fit-content;
}

.spotlight-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 600px;
  margin: 0 auto;
  padding: 0;
  border: none;
  background-color: transparent;
}
</style>
