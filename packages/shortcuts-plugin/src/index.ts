import type { SearchResultItem, SearchParams, PluginActions, ActionContext, Plugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { createPluginStorage, executeShellCommand, type PluginStorage } from '@spotlight/api';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import { generateId } from '@spotlight/utils';
import logger from '@spotlight/logger';
import type { ShortcutItem, ShortcutsData } from './types';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const shortcutsIconUrl = new URL('./assets/terminal.svg', import.meta.url).href;

const STORAGE_KEY = 'shortcuts';
const ACTION_OPEN = 'open';
const ACTION_EXECUTE = 'execute';

class ShortcutsPlugin implements Plugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('shortcuts.name');
  }

  get description(): string | undefined {
    return this.i18n.t('shortcuts.description');
  }

  iconUrl = shortcutsIconUrl;
  pluginId = 'shortcuts-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  private storage: PluginStorage = createPluginStorage(this.pluginId);

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
      },
      [ACTION_EXECUTE]: async (data) => {
        if (!data || typeof data !== 'object') return;
        const shortcut = data as ShortcutItem;

        try {
          logger.info(`Executing shortcut: ${shortcut.name} - ${shortcut.command}`);
          await this.executeCommand(shortcut.command);
          ctx.navigateToPlugin(this.pluginId);
        } catch (error) {
          logger.error(`Failed to execute shortcut: ${shortcut.name}`, error);
        }
      },
    };
  }

  async executeCommand(command: string): Promise<void> {
    await executeShellCommand(command);
  }

  async getShortcuts(): Promise<ShortcutsData> {
    const data = await this.storage.get<ShortcutsData>(STORAGE_KEY, { items: [] });
    return data;
  }

  async saveShortcuts(data: ShortcutsData): Promise<void> {
    await this.storage.set(STORAGE_KEY, data);
  }

  async addShortcut(shortcut: Omit<ShortcutItem, 'id'>): Promise<ShortcutItem> {
    const data = await this.getShortcuts();
    const newShortcut: ShortcutItem = {
      ...shortcut,
      id: generateId(),
    };
    data.items.push(newShortcut);
    await this.saveShortcuts(data);
    return newShortcut;
  }

  async updateShortcut(id: string, updates: Partial<ShortcutItem>): Promise<void> {
    const data = await this.getShortcuts();
    const index = data.items.findIndex(item => item.id === id);
    if (index !== -1) {
      data.items[index] = { ...data.items[index], ...updates };
      await this.saveShortcuts(data);
    }
  }

  async deleteShortcut(id: string): Promise<void> {
    const data = await this.getShortcuts();
    data.items = data.items.filter(item => item.id !== id);
    await this.saveShortcuts(data);
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim();

    const keywords = [
      { keyword: 'shortcuts', normalized: normalizeForSearch('shortcuts') },
      { keyword: 'shortcut', normalized: normalizeForSearch('shortcut') },
      { keyword: 'command', normalized: normalizeForSearch('command') },
      { keyword: 'commands', normalized: normalizeForSearch('commands') },
      { keyword: '快捷命令', normalized: normalizeForSearch('快捷命令'), pinyinInitials: toPinyinInitials('快捷命令') },
      { keyword: '命令', normalized: normalizeForSearch('命令'), pinyinInitials: toPinyinInitials('命令') },
      { keyword: 'terminal', normalized: normalizeForSearch('terminal') },
      { keyword: '终端', normalized: normalizeForSearch('终端'), pinyinInitials: toPinyinInitials('终端') },
    ];

    if (!query || matchKeyword(query.toLowerCase(), keywords)) {
      const data = await this.getShortcuts();
      const items = data.items;

      if (items.length === 0) {
        return [
          {
            iconUrl: shortcutsIconUrl,
            title: this.name,
            desc: this.i18n.t('shortcuts.empty'),
            score: 900,
            pluginId: this.pluginId,
            actionId: ACTION_OPEN,
            actionData: null,
          },
        ];
      }

      return items.map(item => ({
        iconUrl: shortcutsIconUrl,
        title: item.name,
        desc: item.description || item.command,
        score: 900,
        pluginId: this.pluginId,
        actionId: ACTION_EXECUTE,
        actionData: item,
      }));
    }

    const data = await this.getShortcuts();
    const searchTerms = query.toLowerCase().split(/\s+/);

    return data.items
      .filter(item => {
        const nameLower = item.name.toLowerCase();
        const commandLower = item.command.toLowerCase();
        const descLower = (item.description || '').toLowerCase();
        return searchTerms.some(term =>
          nameLower.includes(term) ||
          commandLower.includes(term) ||
          descLower.includes(term)
        );
      })
      .map(item => ({
        iconUrl: shortcutsIconUrl,
        title: item.name,
        desc: item.description || item.command,
        score: 950,
        pluginId: this.pluginId,
        actionId: ACTION_EXECUTE,
        actionData: item,
      }));
  }

  getPanelRoutes() {
    return [
      { name: 'main', componentLoader: () => import('./components/ShortcutsPanel.vue') },
    ];
  }
}

const shortcutsPlugin = new ShortcutsPlugin();
export default shortcutsPlugin;
