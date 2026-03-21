import type { SearchResultItem } from '@spotlight/core';

export function calculateScore(item: SearchResultItem, query: string): number {
  const queryLower = query.toLowerCase().trim();
  let score = 0;

  // Title matching
  const titleLower = item.title.toLowerCase();
  if (titleLower === queryLower) {
    score += 100; // Exact match in title
  } else if (titleLower.startsWith(queryLower)) {
    score += 80; // Prefix match in title
  } else if (titleLower.includes(queryLower)) {
    score += 60; // Partial match in title
  }

  // Description matching
  if (item.desc) {
    const descLower = item.desc.toLowerCase();
    if (descLower === queryLower) {
      score += 50; // Exact match in description
    } else if (descLower.startsWith(queryLower)) {
      score += 40; // Prefix match in description
    } else if (descLower.includes(queryLower)) {
      score += 30; // Partial match in description
    }
  }

  return score;
}