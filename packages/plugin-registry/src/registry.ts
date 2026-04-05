import type { Plugin, PluginActions, SearchResultItem, SearchParams, ActionContext, QuickCommand, NavigateToPluginOptions } from '@spotlight/core';
import logger from '@spotlight/logger';
import { calculateDetailedScore } from './scorer';

const MAX_RESULTS_PER_PLUGIN = 5;

const PLUGIN_BASE_SCORE = 500;

interface ScoredResult {
  item: SearchResultItem;
  score: number;
  pluginIndex: number;
}

interface RegisteredPlugin {
  plugin: Plugin;
  actions: PluginActions;
}

export class PluginRegistry {
  private plugins: RegisteredPlugin[] = [];
  private disabledPlugins: Set<string> = new Set();
  private navigateToPlugin: ((pluginId: string, options?: NavigateToPluginOptions) => void) | null = null;

  setNavigateToPlugin(fn: (pluginId: string, options?: NavigateToPluginOptions) => void): void {
    this.navigateToPlugin = fn;
  }

  private buildActionContext(): ActionContext {
    return {
      navigateToPlugin: this.navigateToPlugin ?? (() => {}),
    };
  }

  register(plugin: Plugin): void {
    if (!this.navigateToPlugin) {
      logger.warn('[PluginRegistry] navigateToPlugin not set, cannot register plugin');
      return;
    }

    const ctx = this.buildActionContext();
    const actions = plugin.registerAction(ctx);

    this.plugins.push({ plugin, actions });
  }

  unregister(pluginId: string): void {
    this.plugins = this.plugins.filter((p) => p.plugin.pluginId !== pluginId);
  }

  async setDisabledPlugins(pluginIds: string[], skipLifecycle = false): Promise<void> {
    const newDisabledSet = new Set(pluginIds);
    const oldDisabledSet = this.disabledPlugins;

    // Find plugins that were disabled but are now enabled
    const newlyEnabled = [...oldDisabledSet].filter((id) => !newDisabledSet.has(id));
    for (const pluginId of newlyEnabled) {
      const entry = this.getPluginEntryById(pluginId);
      if (entry && !skipLifecycle) {
        logger.info(`[PluginRegistry] Enabling plugin: ${entry.plugin.name}`);
        await entry.plugin.onMount?.();
      }
    }

    // Find plugins that were enabled but are now disabled
    const newlyDisabled = [...newDisabledSet].filter((id) => !oldDisabledSet.has(id));
    for (const pluginId of newlyDisabled) {
      const entry = this.getPluginEntryById(pluginId);
      if (entry && !skipLifecycle) {
        logger.info(`[PluginRegistry] Disabling plugin: ${entry.plugin.name}`);
        await entry.plugin.onUnmount?.();
      }
    }

    this.disabledPlugins = newDisabledSet;
  }

  getDisabledPlugins(): string[] {
    return Array.from(this.disabledPlugins);
  }

  private getPluginEntryById(pluginId: string): RegisteredPlugin | undefined {
    return this.plugins.find((p) => p.plugin.pluginId === pluginId);
  }

  private getPluginById(pluginId: string): Plugin | undefined {
    return this.getPluginEntryById(pluginId)?.plugin;
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.getPluginById(pluginId);
  }

  private isPluginDisabled(pluginId: string): boolean {
    return this.disabledPlugins.has(pluginId);
  }

  async executeAction(params: { pluginId: string; actionId: string; data: unknown }): Promise<void> {
    const entry = this.getPluginEntryById(params.pluginId);
    if (!entry) {
      logger.warn(`[PluginRegistry] Plugin not found: ${params.pluginId}`);
      return;
    }

    const handler = entry.actions[params.actionId];
    if (handler) {
      logger.info(`[PluginRegistry] Executing action: ${params.pluginId}:${params.actionId}`);
      await handler(params.data);
    } else {
      logger.warn(`[PluginRegistry] No handler found for action: ${params.pluginId}:${params.actionId}`);
    }
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    if (!params.query.trim()) {
      return [];
    }

    const enabledPlugins = this.plugins.filter((p) => !this.isPluginDisabled(p.plugin.pluginId));

    const pluginResults = await Promise.all(
      enabledPlugins.map(async (entry) => {
        try {
          return await entry.plugin.search(params);
        } catch (error) {
          logger.error(`[PluginRegistry] Plugin "${entry.plugin.name}" search failed:`, error);
          return [];
        }
      })
    );

    const scoredResults: ScoredResult[] = [];

    for (let pluginIndex = 0; pluginIndex < enabledPlugins.length; pluginIndex++) {
      const results = pluginResults[pluginIndex];
      const limit = params.limit ?? MAX_RESULTS_PER_PLUGIN;

      for (const item of results.slice(0, limit)) {
        const pluginBaseScore = item.score ?? PLUGIN_BASE_SCORE;
        const detailedScore = calculateDetailedScore(item, params.query);
        const finalScore = pluginBaseScore + detailedScore.total;
        const itemWithSource: SearchResultItem = {
          ...item,
          pluginId: item.pluginId ?? enabledPlugins[pluginIndex].plugin.pluginId,
          score: finalScore,
        };
        scoredResults.push({ item: itemWithSource, score: finalScore, pluginIndex });
      }
    }

    scoredResults.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.01) {
        return b.score - a.score;
      }
      if (a.item.title.length !== b.item.title.length) {
        return a.item.title.length - b.item.title.length;
      }
      return a.pluginIndex - b.pluginIndex;
    });

    const finalResults = scoredResults.map((r) => r.item);
    const uniqueResults: SearchResultItem[] = [];
    const seenTitles = new Set<string>();

    for (const item of finalResults) {
      const key = `${item.title.toLowerCase()}::${item.pluginId}::${item.actionId}`;
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        uniqueResults.push(item);
      }
    }

    return uniqueResults;
  }

  getPlugins(): Plugin[] {
    return this.plugins.map((p) => p.plugin);
  }

  getQuickCommands(): QuickCommand[] {
    const ctx = this.buildActionContext();
    return this.plugins
      .filter((p) => !this.isPluginDisabled(p.plugin.pluginId))
      .flatMap((p) => p.plugin.registerQuickCommands?.(ctx) ?? []);
  }
}

export const pluginRegistry = new PluginRegistry();