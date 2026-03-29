import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { tauriApi, type EverythingResult } from '@spotlight/api';
import { registerTranslations, translations, getLocale } from '@spotlight/i18n';
import { normalizeForSearch, toPinyinInitials } from '@spotlight/utils/pinyin';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const fileSearchIconUrl = new URL('./assets/file-search.svg', import.meta.url).href;

const ACTION_OPEN_FILE = 'open-file';
const ACTION_OPEN_FOLDER = 'open-folder';
const ACTION_COPY_PATH = 'copy-path';
const ACTION_OPEN_PANEL = 'open-panel';

const PREFIXES = [
  { keyword: 'file', normalized: normalizeForSearch('file') },
  { keyword: 'files', normalized: normalizeForSearch('files') },
  { keyword: 'find', normalized: normalizeForSearch('find') },
  { keyword: 'search', normalized: normalizeForSearch('search') },
  { keyword: '搜索', normalized: normalizeForSearch('搜索'), pinyinInitials: toPinyinInitials('搜索') },
  { keyword: '文件', normalized: normalizeForSearch('文件'), pinyinInitials: toPinyinInitials('文件') },
  { keyword: '查找', normalized: normalizeForSearch('查找'), pinyinInitials: toPinyinInitials('查找') },
];

function getSearchQuery(input: string): string | null {
  const lower = input.toLowerCase().trim();
  for (const prefix of PREFIXES) {
    if (lower.startsWith(prefix.keyword + ' ')) {
      return input.trim().slice(prefix.keyword.length + 1);
    }
    if (lower === prefix.keyword) {
      return '';
    }
  }
  return null;
}

export class FileSearchPlugin extends BasePlugin {
  get name(): string {
    return translations[getLocale()]['plugin.file-search'] ?? 'File Search';
  }
  get description(): string | undefined {
    return translations[getLocale()]['plugin.description.fileSearch'];
  }
  iconUrl = fileSearchIconUrl;
  pluginId = 'file-search-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN_PANEL]: async (data) => {
        if (typeof data === 'string') {
          ctx.navigateToPlugin(this.pluginId, data);
        } else {
          ctx.navigateToPlugin(this.pluginId);
        }
      },
      [ACTION_OPEN_FILE]: async (data) => {
        if (typeof data === 'string') {
          try {
            await tauriApi.executeShellCommand(data);
          } catch (error) {
            logger.error('[FileSearchPlugin] Failed to open file:', error);
          }
        }
      },
      [ACTION_OPEN_FOLDER]: async (data) => {
        if (typeof data === 'string') {
          try {
            const folder = data.replace(/\//g, '\\');
            await tauriApi.executeShellCommand(`explorer.exe /select,"${folder}"`);
          } catch (error) {
            logger.error('[FileSearchPlugin] Failed to open folder:', error);
          }
        }
      },
      [ACTION_COPY_PATH]: async (data) => {
        if (typeof data === 'string') {
          try {
            await tauriApi.setClipboardText(data);
          } catch (error) {
            logger.error('[FileSearchPlugin] Failed to copy path:', error);
          }
        }
      },
    };
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim();
    const searchQuery = getSearchQuery(query);

    if (searchQuery === null) {
      return [];
    }

    if (searchQuery === '') {
      return [
        {
          iconUrl: fileSearchIconUrl,
          title: this.name,
          desc: translations[getLocale()]['fileSearch.queryPlaceholder'],
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN_PANEL,
          actionData: '',
        },
      ];
    }

    try {
      const results = await tauriApi.searchEverything(searchQuery);

      return results.map((file: EverythingResult, index: number) => ({
        iconUrl: fileSearchIconUrl,
        title: file.name,
        desc: file.path,
        score: 800 - index,
        pluginId: this.pluginId,
        actionId: ACTION_OPEN_FILE,
        actionData: file.path,
      }));
    } catch (error) {
      logger.error('[FileSearchPlugin] Search failed:', error);
      return [
        {
          iconUrl: fileSearchIconUrl,
          title: translations[getLocale()]['fileSearch.everythingNotRunning'],
          desc: error instanceof Error ? error.message : String(error),
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN_PANEL,
          actionData: '',
        },
      ];
    }
  }

  getPanelRoutes() {
    return [
      { name: 'main', componentLoader: () => import('./components/FileSearchPanel.vue') },
    ];
  }
}

export const fileSearchPlugin = new FileSearchPlugin();
