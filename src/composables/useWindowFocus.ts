import { onMounted, onUnmounted, nextTick, type Ref } from 'vue';
import { on, type UnlistenFn } from '@spotlight/api';
import { tauriApi } from '@spotlight/api';
import settingsPlugin from '@spotlight/settings-plugin';
import logger from '@spotlight/logger';

export function useWindowFocus(
  searchInputRef: Ref<{ focus: () => void } | null>,
  isDetached: Ref<boolean>
) {
  let unlistenWindowFocus: UnlistenFn | null = null;
  let unlistenWindowBlur: UnlistenFn | null = null;

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

    unlistenWindowFocus = await on.windowFocus(() => {
      logger.info('[useWindowFocus] windowFocus event received');
      focusInput();
    });

    const hideOnBlur = await settingsPlugin.getHideOnBlur();
    if (hideOnBlur) {
      unlistenWindowBlur = await on.windowBlur(() => {
        logger.info('[useWindowFocus] windowBlur event received');
        setTimeout(() => {
          tauriApi.hideWindow();
        }, 100);
      });
    }
  });

  onUnmounted(() => {
    if (isDetached.value) return;

    logger.info('[useWindowFocus] unmounted, cleaning up listeners');
    unlistenWindowFocus?.();
    unlistenWindowBlur?.();
  });
}
