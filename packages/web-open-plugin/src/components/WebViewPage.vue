<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { createChildWebview, closeChildWebview } from '@spotlight/api';

const route = useRoute();

const webviewLabel = ref<string | null>(null);
const containerRef = ref<HTMLElement | null>(null);

function getPanelBounds(): { x: number; y: number; width: number; height: number } {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }
  return {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

onMounted(async () => {
  const url = route.query.url as string;
  if (!url) {
    return;
  }

  const bounds = getPanelBounds();
  webviewLabel.value = await createChildWebview(url, `webview-${Date.now()}`, bounds);
});

onUnmounted(async () => {
  if (webviewLabel.value) {
    await closeChildWebview(webviewLabel.value);
  }
});
</script>

<template>
  <div ref="containerRef" class="webview-page"></div>
</template>

<style scoped>
.webview-page {
  width: 100%;
  height: 100%;
  min-height: 800px;
  background-color: var(--bg-primary, #fff);
}
</style>
