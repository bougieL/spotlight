import { onMounted, onUnmounted, type Ref } from 'vue';
import { on, type UnlistenFn } from '@spotlight/api';
import { tauriApi } from '@spotlight/api';
import { settingsPlugin } from '@spotlight/settings-plugin';

export function useWindowFocus(
  searchInputRef: Ref<{ focus: () => void } | null>,
  isDetached: Ref<boolean>
) {
  let unlistenWindowFocus: UnlistenFn | null = null;
  let unlistenWindowBlur: UnlistenFn | null = null;

  onMounted(async () => {
    if (isDetached.value) return;

    // Focus input when window is shown
    unlistenWindowFocus = await on.windowFocus(() => {
      searchInputRef.value?.focus();
    });

    // Hide window when it loses focus (check setting, skip in dev mode)
    if (!import.meta.env.DEV) {
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
    if (isDetached.value) return;

    unlistenWindowFocus?.();
    unlistenWindowBlur?.();
  });
}
