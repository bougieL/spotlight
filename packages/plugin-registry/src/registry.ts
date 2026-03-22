import type { BasePlugin, SearchResultItem, SearchParams, RenderParams, SearchResultItemContext } from '@spotlight/core';
import type { Component } from 'vue';
import logger from '@spotlight/logger';

const MAX_RESULTS_PER_PLUGIN = 5;

interface ScoredResult {
  item: SearchResultItem;
  score: number;
  pluginIndex: number;
}

type ActionHandler = (data: unknown, ctx: SearchResultItemContext) => void | Promise<void>;

export class PluginRegistry {
  private plugins: BasePlugin[] = [];
  private actionHandlers: Map<string, ActionHandler> = new Map();

  register(plugin: BasePlugin): void {
    this.plugins.push(plugin);
  }

  unregister(name: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== name);
    // Clean up action handlers for this plugin
    for (const key of this.actionHandlers.keys()) {
      if (key.startsWith(name + ':')) {
        this.actionHandlers.delete(key);
      }
    }
  }

  registerAction(params: { pluginName: string; actionId: string; handler: ActionHandler }): void {
    this.actionHandlers.set(`${params.pluginName}:${params.actionId}`, params.handler);
  }

  async executeAction(params: { sourcePlugin: string; actionId: string; data: unknown; ctx: SearchResultItemContext }): Promise<void> {
    const key = `${params.sourcePlugin}:${params.actionId}`;
    const handler = this.actionHandlers.get(key);
    if (handler) {
      logger.info(`[PluginRegistry] Executing action: ${key}`);
      await handler(params.data, params.ctx);
    } else {
      logger.warn(`[PluginRegistry] No handler found for action: ${key}`);
    }
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    if (!params.query.trim()) {
      return [];
    }

    const pluginResults = await Promise.all(
      this.plugins.map((plugin) => plugin.search(params))
    );

    const scoredResults: ScoredResult[] = [];

    for (let pluginIndex = 0; pluginIndex < this.plugins.length; pluginIndex++) {
      const results = pluginResults[pluginIndex];
      const limit = params.limit ?? MAX_RESULTS_PER_PLUGIN;

      for (const item of results.slice(0, limit)) {
        const score = item.score ?? this.calculateGlobalScore(item, params.query);
        // Attach source plugin to each item
        const itemWithSource: SearchResultItem = {
          ...item,
          sourcePlugin: item.sourcePlugin ?? this.plugins[pluginIndex].name,
        };
        scoredResults.push({ item: itemWithSource, score, pluginIndex });
      }
    }

    scoredResults.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.01) {
        return b.score - a.score;
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

  private calculateGlobalScore(item: SearchResultItem, query: string): number {
    const queryLower = query.toLowerCase().trim();
    const titleLower = item.title.toLowerCase();
    let score: number;

    if (titleLower === queryLower) {
      score = 1000;
    } else if (titleLower.startsWith(queryLower)) {
      score = 900;
    } else if (titleLower.includes(queryLower)) {
      score = 800;
    } else {
      score = 700;
    }

    return score;
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