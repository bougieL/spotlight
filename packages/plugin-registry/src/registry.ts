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

  register(plugin: BasePlugin): void {
    this.plugins.push(plugin);
  }

  unregister(name: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== name);
  }

  private getPluginById(pluginId: string): BasePlugin | undefined {
    return this.plugins.find((p) => p.pluginId === pluginId);
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

    const pluginResults = await Promise.all(
      this.plugins.map(async (plugin) => {
        try {
          return await plugin.search(params);
        } catch (error) {
          logger.error(`[PluginRegistry] Plugin "${plugin.name}" search failed:`, error);
          return [];
        }
      })
    );

    const scoredResults: ScoredResult[] = [];

    for (let pluginIndex = 0; pluginIndex < this.plugins.length; pluginIndex++) {
      const results = pluginResults[pluginIndex];
      const limit = params.limit ?? MAX_RESULTS_PER_PLUGIN;

      for (const item of results.slice(0, limit)) {
        const pluginBaseScore = item.score ?? PLUGIN_BASE_SCORE;
        const detailedScore = calculateDetailedScore(item, params.query);
        const finalScore = pluginBaseScore + detailedScore.total;
        const itemWithSource: SearchResultItem = {
          ...item,
          pluginId: item.pluginId ?? this.plugins[pluginIndex].pluginId,
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