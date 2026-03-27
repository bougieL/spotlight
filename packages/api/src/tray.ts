import { TrayIcon } from '@tauri-apps/api/tray';
import { Menu, MenuItem } from '@tauri-apps/api/menu';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import type { Locale } from '@spotlight/i18n';
import logger from '@spotlight/logger';

let trayInstance: TrayIcon | null = null;
let menuInstance: Menu | null = null;
let refreshInProgress = false;

export interface TrayItem {
  id: string;
  text: string;
  action: () => void;
}

export interface TrayOptions {
  locale: Locale;
  tooltip?: string;
}

export async function registerTrayItem(item: TrayItem): Promise<void> {
  // Wait for tray to be ready
  let attempts = 0;
  while (!menuInstance && attempts < 100) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    attempts++;
  }

  if (!menuInstance) {
    logger.error('Tray not ready after waiting');
    return;
  }

  const items = await menuInstance.items();
  const existing = items.find((i) => i.id === item.id);
  if (existing) {
    // Update text if item exists
    await existing.setText(item.text);
    return;
  }

  const menuItem = await MenuItem.new({
    id: item.id,
    text: item.text,
    action: item.action,
  });

  await menuInstance.append(menuItem);
  logger.info(`Tray item ${item.id} registered`);
}

export async function unRegisterTrayItem(id: string): Promise<void> {
  if (!menuInstance) {
    return;
  }

  const items = await menuInstance.items();
  const item = items.find((i) => i.id === id);
  if (item) {
    await menuInstance.remove(item);
    logger.info(`Tray item ${id} unregistered`);
  }
}

export async function setupTray(options: TrayOptions): Promise<void> {
  if (trayInstance) {
    logger.info('Tray already initialized, skipping');
    return;
  }

  logger.info('Setting up tray...');

  const icon = await defaultWindowIcon();
  logger.info('Default window icon:', icon ? 'loaded' : 'null');

  menuInstance = await Menu.new();

  logger.info('Creating TrayIcon...');
  trayInstance = await TrayIcon.new({
    id: 'main-tray',
    menu: menuInstance,
    tooltip: options.tooltip || 'spotlight',
    action: async (event) => {
      if (event.type === 'Click' && event.button === 'Left') {
        logger.info('Tray left click');
        try {
          const { getAllWindows } = await import('@tauri-apps/api/window');
          const windows = await getAllWindows();
          logger.info('Windows count:', windows.length);
          const mainWindow = windows.find((w) => w.label === 'main');
          if (mainWindow) {
            logger.info('Found main window, showing...');
            await mainWindow.show();
            await mainWindow.setFocus();
            logger.info('Main window shown and focused');
          } else {
            logger.error('Main window not found');
          }
        } catch (error) {
          logger.error('Error showing window:', error);
        }
      }
    },
  });
  logger.info('TrayIcon created');

  if (icon) {
    logger.info('Setting tray icon...');
    await trayInstance.setIcon(icon);
    logger.info('Tray icon set');
  }

  logger.info('Tray setup complete');
}

export async function disposeTray(): Promise<void> {
  if (!trayInstance) {
    return;
  }

  trayInstance = null;
  menuInstance = null;
  await TrayIcon.removeById('main-tray');
  logger.info('Tray disposed');
}

export async function refreshTray(options: TrayOptions): Promise<void> {
  if (refreshInProgress) {
    logger.info('refreshTray already in progress, skipping');
    return;
  }

  refreshInProgress = true;
  try {
    // Atomic: dispose then setup
    await disposeTray();
    await setupTray(options);
  } finally {
    refreshInProgress = false;
  }
}

export function getTrayInstance(): TrayIcon | null {
  return trayInstance;
}
