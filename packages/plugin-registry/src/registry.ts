import type { BasePlugin, SearchResultItem, SearchParams, RenderParams } from '@spotlight/core';
import type { Component } from 'vue';

export class PluginRegistry {
  private plugins: BasePlugin[] = [];

  register(plugin: BasePlugin): void {
    this.plugins.push(plugin);
  }

  unregister(name: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== name);
  }

  async search(params: SearchParams): Promise<SearchResultItem[]> {
    if (!params.query.trim()) {
      return [];
    }

    const results = await Promise.all(this.plugins.map((plugin) => plugin.search(params)));

    return results.flat();
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