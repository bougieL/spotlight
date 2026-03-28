import type { SearchResultItem } from '@spotlight/core';

export interface ScoreBreakdown {
  total: number;
  titleMatch: number;
  descMatch: number;
  positionBonus: number;
  continuityBonus: number;
  lengthBonus: number;
}

export function calculateScore(item: SearchResultItem, query: string): number {
  return calculateDetailedScore(item, query).total;
}

export function calculateDetailedScore(item: SearchResultItem, query: string): ScoreBreakdown {
  const queryLower = query.toLowerCase().trim();
  if (!queryLower) {
    return { total: 700, titleMatch: 0, descMatch: 0, positionBonus: 0, continuityBonus: 0, lengthBonus: 0 };
  }

  const titleLower = item.title.toLowerCase();
  const titleIndex = titleLower.indexOf(queryLower);

  let titleMatch = 0;
  let positionBonus = 0;
  let continuityBonus = 0;

  if (titleIndex === 0) {
    titleMatch = 100;
    positionBonus = 30;
  } else if (titleIndex > 0) {
    if (titleLower.startsWith(queryLower)) {
      titleMatch = 80;
      positionBonus = 20;
    } else if (titleIndex > 0) {
      titleMatch = 60;
      positionBonus = 10;
    }
    if (/[\s\-_./\\]/.test(titleLower[titleIndex - 1])) {
      positionBonus += 10;
    }
  } else {
    const fuzzyResult = fuzzyScore(queryLower, titleLower);
    if (fuzzyResult.score > 0) {
      titleMatch = 40 * (fuzzyResult.score / fuzzyResult.maxScore);
      continuityBonus = fuzzyResult.continuousBonus;
    }
  }

  let descMatch = 0;
  if (item.desc) {
    const descLower = item.desc.toLowerCase();
    const descIndex = descLower.indexOf(queryLower);
    if (descIndex === 0) {
      descMatch = 50;
    } else if (descIndex > 0) {
      descMatch = descLower.startsWith(queryLower) ? 40 : 30;
      if (/[\s\-_]/.test(descLower[descIndex - 1])) {
        descMatch += 5;
      }
    }
  }

  const lengthBonus = Math.max(0, 10 - Math.floor(item.title.length / 5));

  const total = titleMatch + descMatch + positionBonus + continuityBonus + lengthBonus;

  return { total, titleMatch, descMatch, positionBonus, continuityBonus, lengthBonus };
}

interface FuzzyResult {
  score: number;
  maxScore: number;
  continuousBonus: number;
}

function fuzzyScore(query: string, target: string): FuzzyResult {
  let queryIdx = 0;
  let targetIdx = 0;
  let score = 0;
  let continuousScore = 0;
  let lastMatchIdx = -1;
  let maxPossibleScore = query.length * 5;

  while (queryIdx < query.length && targetIdx < target.length) {
    if (query[queryIdx] === target[targetIdx]) {
      const baseScore = 1;
      if (lastMatchIdx === targetIdx - 1) {
        continuousScore += 2;
      } else {
        continuousScore = 0;
      }
      if (targetIdx === 0 || /[\s\-_./\\]/.test(target[targetIdx - 1])) {
        score += 3;
      }
      if (target[targetIdx] === target[targetIdx].toUpperCase() && query[queryIdx] === query[queryIdx].toLowerCase()) {
        score += 2;
      }
      score += baseScore + continuousScore;
      lastMatchIdx = targetIdx;
      queryIdx++;
    }
    targetIdx++;
  }

  return {
    score: queryIdx < query.length ? 0 : score,
    maxScore: maxPossibleScore,
    continuousBonus: Math.min(20, continuousScore * 2),
  };
}