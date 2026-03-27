import { useI18n, translations } from '@spotlight/i18n';
import {
  setupTray,
  registerTrayItem,
  unRegisterTrayItem,
} from '@spotlight/api';
import logger from '@spotlight/logger';

export function useTray() {
  const { locale } = useI18n();
  let initialized = false;
  let initInProgress = false;

  const initializeTray = async () => {
    if (initInProgress) {
      logger.info('Tray initialization already in progress, waiting...');
      // Wait a bit for the in-progress init to finish
      while (initInProgress) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return;
    }

    if (initialized) {
      logger.info('Tray already initialized, skipping');
      return;
    }

    initInProgress = true;
    try {
      await setupTray({ locale: locale.value });

      const t = translations[locale.value];
      const showLabel = t['tray.show'] || 'Show';
      const quitLabel = t['tray.quit'] || 'Quit';

      await registerTrayItem({
        id: 'show',
        text: showLabel,
        action: async () => {
          logger.info('Show menu item clicked');
          try {
            const { getAllWindows } = await import('@tauri-apps/api/window');
            const windows = await getAllWindows();
            logger.info('Windows count:', windows.length);
            const mainWindow = windows.find((w) => w.label === 'main');
            if (mainWindow) {
              await mainWindow.show();
              await mainWindow.setFocus();
              logger.info('Main window shown and focused');
            } else {
              logger.error('Main window not found');
            }
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

      initialized = true;
      logger.info('Tray initialized');
    } finally {
      initInProgress = false;
    }
  };

  const doRefreshTray = async () => {
    if (initInProgress) {
      logger.info('Init in progress, skipping refresh');
      return;
    }

    if (!initialized) {
      await initializeTray();
      return;
    }

    // If locale changed, update menu item texts
    const t = translations[locale.value];
    const showLabel = t['tray.show'] || 'Show';
    const quitLabel = t['tray.quit'] || 'Quit';

    // registerTrayItem checks for existing items and updates text
    await registerTrayItem({
      id: 'show',
      text: showLabel,
      action: async () => {
        logger.info('Show menu item clicked');
        try {
          const { getAllWindows } = await import('@tauri-apps/api/window');
          const windows = await getAllWindows();
          logger.info('Windows count:', windows.length);
          const mainWindow = windows.find((w) => w.label === 'main');
          if (mainWindow) {
            await mainWindow.show();
            await mainWindow.setFocus();
            logger.info('Main window shown and focused');
          } else {
            logger.error('Main window not found');
          }
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

    logger.info('Tray menu texts updated');
  };

  return {
    initializeTray,
    refreshTray: doRefreshTray,
    registerTrayItem,
    unRegisterTrayItem,
  };
}
