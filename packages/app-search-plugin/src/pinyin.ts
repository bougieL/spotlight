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

/**
 * Fuzzy matching - checks if query characters appear in order in the target string.
 * For example, "vs" matches "visual studio" because 'v' and 's' appear in order.
 * Returns a score (higher is better), or -1 if no match.
 */
export function fuzzyMatch(query: string, target: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();

  let queryIdx = 0;
  let targetIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;

  while (queryIdx < lowerQuery.length && targetIdx < lowerTarget.length) {
    if (lowerQuery[queryIdx] === lowerTarget[targetIdx]) {
      // Bonus points for consecutive matches
      if (lastMatchIdx === targetIdx - 1) {
        score += 2;
      } else {
        score += 1;
      }
      // Bonus for matching at word boundary (start of target or after separator)
      if (targetIdx === 0 || /[\s\-_.]/.test(lowerTarget[targetIdx - 1])) {
        score += 3;
      }
      // Bonus for matching uppercase letter when query is lowercase
      if (target[targetIdx] === target[targetIdx].toUpperCase() &&
          lowerQuery[queryIdx] === lowerQuery[queryIdx].toLowerCase()) {
        score += 2;
      }
      lastMatchIdx = targetIdx;
      queryIdx++;
    }
    targetIdx++;
  }

  // All query characters must be found
  if (queryIdx < lowerQuery.length) {
    return -1;
  }

  return score;
}