import { watch } from 'vue';
import { translations } from '@spotlight/i18n';
import type { Locale } from '@spotlight/i18n';
import type { Ref } from 'vue';
import {
  setupTray,
  registerTrayItem,
  tauriApi,
} from '@spotlight/api';
import logger from '@spotlight/logger';

export function useTray(isDetached: Ref<boolean>, locale: Ref<Locale>) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const doRegisterTrayItems = async () => {
    const t = translations[locale.value];
    const showLabel = t['tray.show'] || 'Show';
    const quitLabel = t['tray.quit'] || 'Quit';

    await registerTrayItem({
      id: 'show',
      text: showLabel,
      action: async () => {
        logger.info('Show menu item clicked');
        try {
          await tauriApi.showWindow();
          logger.info('Main window shown and focused');
        } catch (error) {
          logger.error('Error showing window:', error);
        }
      },
    });

    await registerTrayItem({
      id: 'quit',
      text: quitLabel,
      action: async () => {
        logger.info('Quit menu item clicked');
        try {
          const { exitApp } = await import('@spotlight/api');
          await exitApp();
        } catch (error) {
          logger.error('Error exiting app:', error);
        }
      },
    });

    logger.info('Tray menu items registered');
  };

  const doRefreshTray = async () => {
    await setupTray({ locale: locale.value });
    await doRegisterTrayItems();
    logger.info('Tray refreshed');
  };

  // Watch locale changes to refresh tray menu texts (skip if detached)
  watch(locale, () => {
    if (isDetached.value) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      doRefreshTray();
    }, 300);
  }, { immediate: true });
}
