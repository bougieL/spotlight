import type { SearchPlugin, SearchResultItem } from './types';

class PluginRegistry {
  private plugins: SearchPlugin[] = [];

  register(plugin: SearchPlugin): void {
    this.plugins.push(plugin);
  }

  unregister(name: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== name);
  }

  async search(query: string): Promise<SearchResultItem[]> {
    if (!query.trim()) {
      return [];
    }

    const results = await Promise.all(this.plugins.map((plugin) => plugin.search(query)));

    return results.flat();
  }

  getPlugins(): SearchPlugin[] {
    return [...this.plugins];
  }
}

export const pluginRegistry = new PluginRegistry();
