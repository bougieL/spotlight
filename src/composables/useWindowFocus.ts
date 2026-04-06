import { onMounted, onUnmounted, nextTick, type Ref } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { on, type UnlistenFn, simulateMouseClick } from '@spotlight/api';
import { tauriApi } from '@spotlight/api';
import settingsPlugin from '@spotlight/settings-plugin';
import logger from '@spotlight/logger';

export function useWindowFocus(
  searchInputRef: Ref<{ focus: () => void; getInputRect: () => DOMRect | null } | null>,
  isDetached: Ref<boolean>
) {
  let unlistenFocus: UnlistenFn | null = null;
  let unlistenBlur: UnlistenFn | null = null;

  const focusInput = () => {
    logger.info('[useWindowFocus] focusInput called');
    nextTick(() => {
      setTimeout(() => {
        searchInputRef.value?.focus();
        logger.info('[useWindowFocus] input.focus() called');
      }, 100);
    });
  };

  // Workaround for Tauri unstable bug: setFocus does not reliably focus the input element.
  // Simulating a native mouse click on the input field ensures the input gains focus properly.
  const handleFocus = async () => {
    logger.info('[useWindowFocus] tauri://show triggered');

    focusInput();

    try {
      const window = getCurrentWindow();
      const position = await window.innerPosition();
      const scaleFactor = await window.scaleFactor();

      const rect = searchInputRef.value?.getInputRect();
      if (rect) {
        logger.info(`[useWindowFocus] position=(${position.x}, ${position.y}), scaleFactor=${scaleFactor}, rect=${JSON.stringify(rect)}`);
        const clickX = Math.round(position.x + rect.left * scaleFactor + rect.width * scaleFactor / 2);
        const clickY = Math.round(position.y + rect.top * scaleFactor + rect.height * scaleFactor / 2);
        logger.info(`[useWindowFocus] simulateMouseClick at (${clickX}, ${clickY})`);
        await simulateMouseClick(clickX, clickY);
      }
    } catch (err) {
      logger.error(`[useWindowFocus] simulateMouseClick failed: ${err}`);
    }
  };

  const handleBlur = async () => {
    logger.info('[useWindowFocus] tauri://blur triggered');
    const hideOnBlur = await settingsPlugin.getHideOnBlur();
    if (hideOnBlur) {
      setTimeout(() => {
        tauriApi.hideWindow();
      }, 100);
    }
  };

  onMounted(async () => {
    if (isDetached.value) return;

    logger.info('[useWindowFocus] mounted, setting up listeners');

    unlistenFocus = await on.onTauriShow(handleFocus);
    unlistenBlur = await on.onTauriBlur(handleBlur);
  });

  onUnmounted(() => {
    if (isDetached.value) return;

    logger.info('[useWindowFocus] unmounted, cleaning up listeners');
    unlistenFocus?.();
    unlistenBlur?.();
  });
}
