import type { SearchResultItem, SearchParams, PluginActions, ActionContext, QuickCommand, Plugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { openPath } from '@tauri-apps/plugin-opener';
import { tauriApi, type FileResult } from '@spotlight/api';
import logger from '@spotlight/logger';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const searchIconUrl = new URL('./assets/filesearch.svg', import.meta.url).href;

const ACTION_OPEN_FILE = 'open-file';
const ACTION_OPEN_AT_LINE = 'open-at-line';
const ACTION_COPY_PATH = 'copy-path';
const ACTION_OPEN_PANEL = 'open-panel';

function getSearchQuery(input: string, prefixes: string[]): { searchQuery: string } | null {
  const lower = input.toLowerCase().trim();

  for (const prefix of prefixes) {
    if (lower.startsWith(prefix + ' ')) {
      const remainder = input.trim().slice(prefix.length + 1);
      return {
        searchQuery: remainder,
      };
    }
    if (lower === prefix) {
      return {
        searchQuery: '',
      };
    }
  }
  return null;
}

export class FileSearchPlugin implements Plugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('fileSearch.name');
  }

  get description(): string | undefined {
    return this.i18n.t('fileSearch.description');
  }

  iconUrl = searchIconUrl;
  pluginId = 'file-search-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN_PANEL]: async (data) => {
        if (typeof data === 'string') {
          ctx.navigateToPlugin(this.pluginId, { route: data });
        } else {
          ctx.navigateToPlugin(this.pluginId);
        }
      },
      [ACTION_OPEN_FILE]: async (data) => {
        if (typeof data === 'string') {
          try {
            await openPath(data);
          } catch (error) {
            logger.error('[FileSearchPlugin] Failed to open file:', error);
          }
        }
      },
      [ACTION_OPEN_AT_LINE]: async (data) => {
        if (typeof data === 'object' && data !== null) {
          const { file, line } = data as { file: string; line: number };
          try {
            await tauriApi.executeShellCommand(`code --goto "${file}:${line}"`);
          } catch (error) {
            logger.error('[FileSearchPlugin] Failed to open file at line:', error);
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
    const prefixStr = this.i18n.t('fileSearch.keywords');
    const prefixes = prefixStr.split('|');
    const searchState = getSearchQuery(query, prefixes);

    if (searchState === null) {
      return [];
    }

    if (searchState.searchQuery === '') {
      return [
        {
          iconUrl: searchIconUrl,
          title: this.name,
          desc: this.i18n.t('fileSearch.queryPlaceholder'),
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN_PANEL,
          actionData: '',
        },
      ];
    }

    try {
      // Default: search file names using ripgrep
      const results = await tauriApi.searchFilesWithRg({ query: searchState.searchQuery });

      return results.map((file: FileResult, index: number) => ({
        iconUrl: searchIconUrl,
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
          iconUrl: searchIconUrl,
          title: this.i18n.t('fileSearch.everythingNotRunning'),
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
      { name: 'main', componentLoader: () => import('./components/SearchPanel.vue') },
    ];
  }

  registerQuickCommands(ctx: ActionContext): QuickCommand[] {
    return [
      {
        trigger: 'grep',
        description: this.i18n.t('fileSearch.quickCommands.grep'),
        iconUrl: searchIconUrl,
        execute: (q: string) => {
          ctx.navigateToPlugin(this.pluginId, q ? { query: { q, mode: 'contents' } } : { query: { mode: 'contents' } });
        },
      },
      {
        trigger: 'find',
        description: this.i18n.t('fileSearch.quickCommands.find'),
        iconUrl: searchIconUrl,
        execute: (q: string) => {
          ctx.navigateToPlugin(this.pluginId, q ? { query: { q, mode: 'name' } } : { query: { mode: 'name' } });
        },
      },
    ];
  }
}

const fileSearchPlugin = new FileSearchPlugin();
export default fileSearchPlugin;
