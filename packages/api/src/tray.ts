import { TrayIcon } from '@tauri-apps/api/tray';
import { Menu, MenuItem } from '@tauri-apps/api/menu';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import type { Locale } from '@spotlight/i18n';
import logger from '@spotlight/logger';

let trayInstance: TrayIcon | null = null;
let menuInstance: Menu | null = null;

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
  if (!menuInstance) {
    logger.error('Tray not ready');
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

let lastClickTime = 0;

export async function setupTray(options: TrayOptions): Promise<void> {
  // Always try to remove existing tray first (page refresh may have reset JS state)
  logger.info('Removing any existing tray...');
  try {
    await TrayIcon.removeById('main-tray');
  } catch {
    // Ignore if not found
  }
  trayInstance = null;
  menuInstance = null;

  logger.info('Setting up tray...');

  const icon = await defaultWindowIcon();
  logger.info('Default window icon:', icon ? 'loaded' : 'null');

  menuInstance = await Menu.new();

  logger.info('Creating TrayIcon...');
  trayInstance = await TrayIcon.new({
    id: 'main-tray',
    menu: menuInstance,
    showMenuOnLeftClick: false,
    tooltip: options.tooltip || 'spotlight',
    action: async (event) => {
      if (event.type === 'Click' && event.button === 'Left') {
        const now = Date.now();
        if (now - lastClickTime < 500) {
          logger.info('Tray left click ignored (debounced)');
          return;
        }
        lastClickTime = now;
        logger.info('Tray left click');
        try {
          const { tauriApi } = await import('@spotlight/api');
          await tauriApi.showWindow();
          logger.info('Main window shown and focused');
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

  await TrayIcon.removeById('main-tray');
  trayInstance = null;
  menuInstance = null;
  logger.info('Tray disposed');
}

export function getTrayInstance(): TrayIcon | null {
  return trayInstance;
}
