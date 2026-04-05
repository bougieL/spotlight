import { onMounted, onUnmounted, nextTick, type Ref } from 'vue';
import { tauriApi } from '@spotlight/api';
import settingsPlugin from '@spotlight/settings-plugin';

export function useWindowFocus(
  searchInputRef: Ref<{ focus: () => void } | null>,
  isDetached: Ref<boolean>
) {
  const handleFocus = () => {
    nextTick(() => {
      setTimeout(() => {
        searchInputRef.value?.focus();
      }, 50);
    });
  };

  const handleBlur = async () => {
    const hideOnBlur = await settingsPlugin.getHideOnBlur();
    if (hideOnBlur) {
      setTimeout(() => {
        tauriApi.hideWindow();
      }, 100);
    }
  };

  onMounted(async () => {
    if (isDetached.value) return;

    window.addEventListener('focus', handleFocus);

    if (!import.meta.env.DEV) {
      const hideOnBlur = await settingsPlugin.getHideOnBlur();
      if (hideOnBlur) {
        window.addEventListener('blur', handleBlur);
      }
    }
  });

  onUnmounted(() => {
    if (isDetached.value) return;

    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('blur', handleBlur);
  });
}
