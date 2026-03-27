import { onMounted, onUnmounted } from 'vue';
import { tauriApi } from '@spotlight/api';

let resizeObserver: ResizeObserver | null = null;
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let lastHeight: number | null = null;

export function useWindowResize() {
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
}
