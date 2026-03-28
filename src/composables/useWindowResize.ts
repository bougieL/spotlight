import { onMounted, onUnmounted, type Ref } from 'vue';
import { tauriApi } from '@spotlight/api';

let resizeObserver: ResizeObserver | null = null;
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let lastHeight: number | null = null;

function isDetachedWindow(): boolean {
  return new URLSearchParams(window.location.search).get('detached') === 'true';
}

export function useWindowResize(mainRef: Ref<HTMLElement | null>) {
  const performResize = () => {
    if (!mainRef.value) return;
    const height = mainRef.value.offsetHeight;
    if (lastHeight === height) return;
    lastHeight = height;
    tauriApi.resizeWindow(height).catch(() => {
      lastHeight = null;
    });
  };

  onMounted(() => {
    if (isDetachedWindow()) return;

    if (!mainRef.value) return;

    resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(performResize, 16);
    });
    resizeObserver.observe(mainRef.value);
    performResize();
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    if (resizeTimer) clearTimeout(resizeTimer);
  });
}
