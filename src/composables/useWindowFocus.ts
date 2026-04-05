import { onMounted, onUnmounted, nextTick, type Ref } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { tauriApi } from '@spotlight/api';
import settingsPlugin from '@spotlight/settings-plugin';
import logger from '@spotlight/logger';

export function useWindowFocus(
  searchInputRef: Ref<{ focus: () => void } | null>,
  isDetached: Ref<boolean>
) {
  let unlistenFocusChanged: UnlistenFn | null = null;

  const focusInput = () => {
    logger.info('[useWindowFocus] focusInput called');
    nextTick(() => {
      setTimeout(() => {
        searchInputRef.value?.focus();
        logger.info('[useWindowFocus] input.focus() called');
      }, 100);
    });
  };

  onMounted(async () => {
    if (isDetached.value) return;

    logger.info('[useWindowFocus] mounted, setting up listeners');

    const window = getCurrentWindow();

    // Check if window is already focused when mounting (e.g., on initial show)
    const alreadyFocused = await window.isFocused();
    if (alreadyFocused) {
      logger.info('[useWindowFocus] window already focused on mount, focusing input');
      focusInput();
    }

    unlistenFocusChanged = await window.onFocusChanged(async (event) => {
      const focused = event.payload;
      logger.info(`[useWindowFocus] focusChanged event received, focused: ${focused}`);
      if (focused) {
        focusInput();
      } else {
        const hideOnBlur = await settingsPlugin.getHideOnBlur();
        if (hideOnBlur) {
          setTimeout(() => {
            tauriApi.hideWindow();
          }, 100);
        }
      }
    });
  });

  onUnmounted(() => {
    if (isDetached.value) return;

    logger.info('[useWindowFocus] unmounted, cleaning up listeners');
    unlistenFocusChanged?.();
  });
}
