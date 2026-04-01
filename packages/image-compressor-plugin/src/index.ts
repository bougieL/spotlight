import type { SearchResultItem, SearchParams, PluginActions, ActionContext } from '@spotlight/core';
import { BasePlugin } from '@spotlight/core';
import { registerTranslations, useI18n } from '@spotlight/i18n';
import { normalizeForSearch, toPinyinInitials, matchKeyword } from '@spotlight/utils/pinyin';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

registerTranslations({
  'en-US': enUS,
  'zh-CN': zhCN,
});

const imageCompressorIconUrl = new URL('./assets/image-compressor.svg', import.meta.url).href;

const ACTION_OPEN = 'open';

export interface CompressedImage {
  id: string;
  originalFile: File;
  originalSize: number;
  compressedBlob: Blob | null;
  compressedSize: number;
  compressedUrl: string | null;
  quality: number;
  format: 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp';
  isLossless: boolean;
}

export class ImageCompressorPlugin extends BasePlugin {
  private readonly i18n = useI18n();

  get name(): string {
    return this.i18n.t('imageCompressor.name');
  }

  get description(): string | undefined {
    return this.i18n.t('imageCompressor.description');
  }

  iconUrl = imageCompressorIconUrl;
  pluginId = 'image-compressor-plugin';
  version = '1.0.0';
  author = 'Spotlight Team';

  registerAction(ctx: ActionContext): PluginActions {
    return {
      [ACTION_OPEN]: async () => {
        ctx.navigateToPlugin(this.pluginId);
      },
    };
  }

  private getKeywords() {
    const keywordsStr = this.i18n.t('imageCompressor.keywords');
    return keywordsStr.split('|').map((k: string) => ({
      keyword: k,
      normalized: normalizeForSearch(k),
      pinyinInitials: toPinyinInitials(k),
    }));
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    const query = params.query.trim();

    if (matchKeyword(query, this.getKeywords())) {
      return [
        {
          iconUrl: imageCompressorIconUrl,
          title: this.name,
          score: 900,
          pluginId: this.pluginId,
          actionId: ACTION_OPEN,
          actionData: null,
        },
      ];
    }

    return [];
  }

  getPanelRoutes() {
    return [
      { name: 'main', componentLoader: () => import('./components/ImageCompressorPanel.vue') },
    ];
  }
}

export const imageCompressorPlugin = new ImageCompressorPlugin();
