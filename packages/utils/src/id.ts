/**
 * Generate a unique ID using timestamp + random string.
 * Format: base36 timestamp + base36 random substring
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
