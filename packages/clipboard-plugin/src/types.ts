export type ClipboardItemType = 'text' | 'image' | 'files';

export interface ClipboardItem {
  id: string;
  type: ClipboardItemType;
  content: string;
  timestamp: number;
  favorite?: boolean;
}

export interface ClipboardData {
  items: ClipboardItem[];
  favorites: ClipboardItem[];
}
