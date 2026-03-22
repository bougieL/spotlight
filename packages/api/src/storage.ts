import { invoke } from '@tauri-apps/api/core';
import logger from '@spotlight/logger';

export interface PluginStorage {
  get<T>(key: string, defaultValue: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

async function readSettings(pluginName: string): Promise<string> {
  return invoke<string>('read_plugin_settings', { pluginName });
}

async function writeSettings(pluginName: string, settings: string): Promise<void> {
  return invoke<void>('write_plugin_settings', { pluginName, settings });
}

export function createPluginStorage(pluginName: string): PluginStorage {
  return {
    async get<T>(key: string, defaultValue: T): Promise<T> {
      try {
        const data = await readSettings(pluginName);
        if (!data) {
          return defaultValue;
        }
        const parsed = JSON.parse(data);
        return parsed[key] ?? defaultValue;
      } catch {
        return defaultValue;
      }
    },

    async set<T>(key: string, value: T): Promise<void> {
      try {
        const data = await readSettings(pluginName);
        const parsed = data ? JSON.parse(data) : {};
        parsed[key] = value;
        await writeSettings(pluginName, JSON.stringify(parsed));
      } catch (error) {
        logger.error(`Failed to save setting for ${pluginName}.${key}:`, error);
      }
    },

    async remove(key: string): Promise<void> {
      try {
        const data = await readSettings(pluginName);
        if (!data) {
          return;
        }
        const parsed = JSON.parse(data);
        delete parsed[key];
        await writeSettings(pluginName, JSON.stringify(parsed));
      } catch (error) {
        logger.error(`Failed to remove setting for ${pluginName}.${key}:`, error);
      }
    },

    async clear(): Promise<void> {
      try {
        await writeSettings(pluginName, JSON.stringify({}));
      } catch (_error) {
        logger.error(`Failed to clear settings for ${pluginName}`);
      }
    },
  };
}
