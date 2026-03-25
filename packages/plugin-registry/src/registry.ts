import type { BasePlugin, SearchResultItem, SearchParams, RenderParams, SearchResultItemContext } from '@spotlight/core';
import type { Component } from 'vue';
import logger from '@spotlight/logger';
import { calculateDetailedScore } from './scorer';

const MAX_RESULTS_PER_PLUGIN = 5;

const PLUGIN_BASE_SCORE = 500;

interface ScoredResult {
  item: SearchResultItem;
  score: number;
  pluginIndex: number;
}

export class PluginRegistry {
  private plugins: BasePlugin[] = [];
  private disabledPlugins: Set<string> = new Set();

  register(plugin: BasePlugin): void {
    this.plugins.push(plugin);
  }

  unregister(name: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== name);
  }

  async setDisabledPlugins(pluginIds: string[], skipLifecycle = false): Promise<void> {
    const newDisabledSet = new Set(pluginIds);
    const oldDisabledSet = this.disabledPlugins;

    // Find plugins that were disabled but are now enabled
    const newlyEnabled = [...oldDisabledSet].filter((id) => !newDisabledSet.has(id));
    for (const pluginId of newlyEnabled) {
      const plugin = this.getPluginById(pluginId);
      if (plugin && !skipLifecycle) {
        logger.info(`[PluginRegistry] Enabling plugin: ${plugin.name}`);
        await plugin.onMount?.();
      }
    }

    // Find plugins that were enabled but are now disabled
    const newlyDisabled = [...newDisabledSet].filter((id) => !oldDisabledSet.has(id));
    for (const pluginId of newlyDisabled) {
      const plugin = this.getPluginById(pluginId);
      if (plugin && !skipLifecycle) {
        logger.info(`[PluginRegistry] Disabling plugin: ${plugin.name}`);
        await plugin.onUnmount?.();
      }
    }

    this.disabledPlugins = newDisabledSet;
  }

  getDisabledPlugins(): string[] {
    return Array.from(this.disabledPlugins);
  }

  private getPluginById(pluginId: string): BasePlugin | undefined {
    return this.plugins.find((p) => p.pluginId === pluginId);
  }

  private isPluginDisabled(pluginId: string): boolean {
    return this.disabledPlugins.has(pluginId);
  }

  async executeAction(params: { pluginId: string; actionId: string; data: unknown; ctx: SearchResultItemContext }): Promise<void> {
    const plugin = this.getPluginById(params.pluginId);
    if (!plugin) {
      logger.warn(`[PluginRegistry] Plugin not found: ${params.pluginId}`);
      return;
    }

    const actions = plugin.registerAction();
    const handler = actions[params.actionId];
    if (handler) {
      logger.info(`[PluginRegistry] Executing action: ${params.pluginId}:${params.actionId}`);
      await handler(params.data, params.ctx);
    } else {
      logger.warn(`[PluginRegistry] No handler found for action: ${params.pluginId}:${params.actionId}`);
    }
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    if (!params.query.trim()) {
      return [];
    }

    const enabledPlugins = this.plugins.filter((p) => !this.isPluginDisabled(p.pluginId));

    const pluginResults = await Promise.all(
      enabledPlugins.map(async (plugin) => {
        try {
          return await plugin.search(params);
        } catch (error) {
          logger.error(`[PluginRegistry] Plugin "${plugin.name}" search failed:`, error);
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
          pluginId: item.pluginId ?? enabledPlugins[pluginIndex].pluginId,
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
      const key = item.title.toLowerCase();
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        uniqueResults.push(item);
      }
    }

    return uniqueResults;
  }

  async render(pluginName: string, params: RenderParams): Promise<Component | null> {
    const plugin = this.plugins.find((p) => p.name === pluginName);
    return plugin?.render(params) ?? null;
  }

  getPlugins(): BasePlugin[] {
    return [...this.plugins];
  }
}

export const pluginRegistry = new PluginRegistry();