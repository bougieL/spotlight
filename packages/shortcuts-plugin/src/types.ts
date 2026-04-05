export interface ShortcutItem {
  id: string;
  name: string;
  command: string;
  description?: string;
  iconUrl?: string;
}

export interface ShortcutsData {
  items: ShortcutItem[];
}
