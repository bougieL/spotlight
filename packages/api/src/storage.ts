import { invoke } from '@tauri-apps/api/core';
import logger from '@spotlight/logger';

export interface PluginStorage {
  get<T>(key: string, defaultValue: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  flush(): Promise<void>;
}

async function readSettings(pluginName: string): Promise<string> {
  return invoke<string>('read_plugin_settings', { pluginName });
}

async function writeSettings(pluginName: string, settings: string): Promise<void> {
  return invoke<void>('write_plugin_settings', { pluginName, settings });
}

/**
 * Creates a cached storage instance that batches writes to reduce I/O.
 * Changes are kept in memory and flushed to disk periodically or on flush().
 */
export function createPluginStorage(pluginName: string): PluginStorage {
  let cache: Record<string, unknown> | null = null;
  let cacheLoaded = false;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  const PENDING_WRITE_DELAY_MS = 1000;

  const loadCache = async (): Promise<void> => {
    if (cacheLoaded) return;
    try {
      const data = await readSettings(pluginName);
      cache = data ? JSON.parse(data) : {};
    } catch {
      cache = {};
    }
    cacheLoaded = true;
  };

  const scheduleFlush = (): void => {
    if (flushTimer) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      try {
        await flush();
      } catch (error) {
        logger.error(`[Storage] Failed to flush for ${pluginName}:`, error);
      }
    }, PENDING_WRITE_DELAY_MS);
  };

  const flush = async (): Promise<void> => {
    if (!cacheLoaded || cache === null) return;
    try {
      await writeSettings(pluginName, JSON.stringify(cache));
    } catch (error) {
      logger.error(`Failed to flush settings for ${pluginName}:`, error);
    }
  };

  return {
    async get<T>(key: string, defaultValue: T): Promise<T> {
      await loadCache();
      return (cache?.[key] as T) ?? defaultValue;
    },

    async set<T>(key: string, value: T): Promise<void> {
      await loadCache();
      cache![key] = value;
      scheduleFlush();
    },

    async remove(key: string): Promise<void> {
      await loadCache();
      delete cache![key];
      scheduleFlush();
    },

    async clear(): Promise<void> {
      await loadCache();
      cache = {};
      scheduleFlush();
    },

    async flush(): Promise<void> {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      await flush();
    },
  };
}
