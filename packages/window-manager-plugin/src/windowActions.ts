import {
  minimizeWindow as apiMinimizeWindow,
  maximizeWindow as apiMaximizeWindow,
  restoreWindow as apiRestoreWindow,
  closeWindow as apiCloseWindow,
  setWindowAlwaysOnTop,
  focusWindow,
} from '@spotlight/api';
import logger from '@spotlight/logger';

export async function minimizeWindow(hwnd: number): Promise<void> {
  if (typeof hwnd !== 'number') return;
  try {
    await apiMinimizeWindow(hwnd);
    logger.info(`Window minimized: hwnd=${hwnd}`);
  } catch (error) {
    logger.error('Failed to minimize window', error);
  }
}

export async function maximizeWindow(hwnd: number): Promise<void> {
  if (typeof hwnd !== 'number') return;
  try {
    await apiMaximizeWindow(hwnd);
    logger.info(`Window maximized: hwnd=${hwnd}`);
  } catch (error) {
    logger.error('Failed to maximize window', error);
  }
}

export async function restoreWindow(hwnd: number): Promise<void> {
  if (typeof hwnd !== 'number') return;
  try {
    await apiRestoreWindow(hwnd);
    logger.info(`Window restored: hwnd=${hwnd}`);
  } catch (error) {
    logger.error('Failed to restore window', error);
  }
}

export async function closeWindow(hwnd: number): Promise<void> {
  if (typeof hwnd !== 'number') return;
  try {
    await apiCloseWindow(hwnd);
    logger.info(`Window closed: hwnd=${hwnd}`);
  } catch (error) {
    logger.error('Failed to close window', error);
  }
}

export async function toggleAlwaysOnTop(hwnd: number, onTop: boolean): Promise<void> {
  if (typeof hwnd !== 'number' || typeof onTop !== 'boolean') return;
  try {
    await setWindowAlwaysOnTop(hwnd, onTop);
    logger.info(`Window always on top set: hwnd=${hwnd}, onTop=${onTop}`);
  } catch (error) {
    logger.error('Failed to set window always on top', error);
  }
}

export async function focusWindowByHwnd(hwnd: number): Promise<void> {
  if (typeof hwnd !== 'number') return;
  try {
    await focusWindow(hwnd);
    logger.info(`Window focused: hwnd=${hwnd}`);
  } catch (error) {
    logger.error('Failed to focus window', error);
  }
}
