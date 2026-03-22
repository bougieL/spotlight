import { pinyin } from 'pinyin-pro';

const pinyinCache = new Map<string, { full: string; initials: string }>();

export function toPinyin(text: string): string {
  if (!text) return '';
  const cached = pinyinCache.get(text);
  if (cached) return cached.full;
  const result = pinyin(text, { toneType: 'none', segmentit: 'word' } as never).replace(/\s+/g, '');
  pinyinCache.set(text, { full: result, initials: '' });
  return result;
}

export function toPinyinInitials(text: string): string {
  if (!text) return '';
  const cached = pinyinCache.get(text);
  if (cached) {
    if (!cached.initials) {
      cached.initials = cached.full.split(/\s+/).map((s) => s[0]).join('');
    }
    return cached.initials;
  }
  const full = pinyin(text, { toneType: 'none', segmentit: 'word' } as never);
  const initials = full.split(/\s+/).map((s) => s[0]).join('');
  pinyinCache.set(text, { full: full.replace(/\s+/g, ''), initials });
  return initials;
}

export function clearPinyinCache(): void {
  pinyinCache.clear();
}

export function hasChineseChars(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

export function normalizeForSearch(text: string): string {
  const lowerText = text.toLowerCase();
  const pinyinText = toPinyin(text).toLowerCase();
  return `${lowerText}|${pinyinText}`;
}

export function fuzzyMatch(query: string, target: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();

  let queryIdx = 0;
  let targetIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;

  while (queryIdx < lowerQuery.length && targetIdx < lowerTarget.length) {
    if (lowerQuery[queryIdx] === lowerTarget[targetIdx]) {
      if (lastMatchIdx === targetIdx - 1) {
        score += 2;
      } else {
        score += 1;
      }
      if (targetIdx === 0 || /[\s\-_.]/.test(lowerTarget[targetIdx - 1])) {
        score += 3;
      }
      if (
        target[targetIdx] === target[targetIdx].toUpperCase() &&
        lowerQuery[queryIdx] === lowerQuery[queryIdx].toLowerCase()
      ) {
        score += 2;
      }
      lastMatchIdx = targetIdx;
      queryIdx++;
    }
    targetIdx++;
  }

  if (queryIdx < lowerQuery.length) {
    return -1;
  }

  return score;
}