import { pinyin } from 'pinyin-pro';

export function toPinyin(text: string): string {
  if (!text) return '';
  return pinyin(text, { toneType: 'none', segmentit: 'word' } as never).replace(/\s+/g, '');
}

export function toPinyinWithSpaces(text: string): string {
  if (!text) return '';
  return pinyin(text, { toneType: 'none', segmentit: 'word' } as never);
}

export function toPinyinInitials(text: string): string {
  if (!text) return '';
  return pinyin(text, { toneType: 'none', segmentit: 'word' } as never)
    .split(/\s+/)
    .map((syllable) => syllable[0])
    .join('');
}

export function hasChineseChars(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

export function normalizeForSearch(text: string): string {
  const lowerText = text.toLowerCase();
  const pinyinText = toPinyin(text).toLowerCase();
  return `${lowerText}|${pinyinText}`;
}