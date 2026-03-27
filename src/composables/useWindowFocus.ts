import { onMounted, onUnmounted, type Ref } from 'vue';
import { on, type UnlistenFn } from '@spotlight/api';
import { tauriApi } from '@spotlight/api';

export function useWindowFocus(searchInputRef: Ref<{ focus: () => void } | null>) {
  let unlistenWindowFocus: UnlistenFn | null = null;
  let unlistenWindowBlur: UnlistenFn | null = null;

  onMounted(async () => {
    // Focus input when window is shown
    unlistenWindowFocus = await on.windowFocus(() => {
      searchInputRef.value?.focus();
    });

    // Hide window when it loses focus (check setting, skip in dev mode)
    if (!import.meta.env.DEV) {
      const { settingsPlugin } = await import('@spotlight/settings-plugin');
      const hideOnBlur = await settingsPlugin.getHideOnBlur();
      if (hideOnBlur) {
        unlistenWindowBlur = await on.windowBlur(() => {
          // Delay to avoid hiding when clicking search results
          setTimeout(() => {
            tauriApi.hideWindow();
          }, 100);
        });
      }
    }
  });

  onUnmounted(() => {
    unlistenWindowFocus?.();
    unlistenWindowBlur?.();
  });
}
