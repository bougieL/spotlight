import type { Component } from 'vue';

export interface SearchResultItem {
  icon: Component;
  title: string;
  desc: string;
  action: () => void;
}

export interface SearchPlugin {
  name: string;
  search(_query: string): Promise<SearchResultItem[]>;
}
