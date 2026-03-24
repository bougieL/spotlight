// Color name to hex mapping
export const COLOR_NAMES: Record<string, string> = {
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  yellow: '#FFFF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  white: '#FFFFFF',
  black: '#000000',
  orange: '#FFA500',
  purple: '#800080',
  pink: '#FFC0CB',
  brown: '#A52A2A',
  gray: '#808080',
  grey: '#808080',
};

// Regex patterns for color formats
const HEX_PATTERN = /^#?([a-f\d]{6}|[a-f\d]{3})$/i;
const RGB_PATTERN = /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
const HSL_PATTERN = /^hsl\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?\s*\)$/i;

/**
 * Check if input string is a valid color format
 */
export function isColorString(input: string): boolean {
  const trimmed = input.trim().toLowerCase();
  return (
    HEX_PATTERN.test(trimmed) ||
    RGB_PATTERN.test(trimmed) ||
    HSL_PATTERN.test(trimmed) ||
    trimmed.toLowerCase() in COLOR_NAMES
  );
}

/**
 * Normalize various color formats to HEX
 */
export function normalizeColor(input: string): string {
  const trimmed = input.trim();

  // Already hex
  if (HEX_PATTERN.test(trimmed)) {
    const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    // Expand 3-char hex
    if (hex.length === 4) {
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase();
    }
    return hex.toUpperCase();
  }

  // RGB
  const rgbMatch = trimmed.match(RGB_PATTERN);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  }

  // HSL
  const hslMatch = trimmed.match(HSL_PATTERN);
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10);
    const s = parseInt(hslMatch[2], 10) / 100;
    const l = parseInt(hslMatch[3], 10) / 100;
    return hslToHex({ h, s, l });
  }

  // Color name
  const colorName = trimmed.toLowerCase();
  if (colorName in COLOR_NAMES) {
    return COLOR_NAMES[colorName].toUpperCase();
  }

  return trimmed.toUpperCase();
}

/**
 * Convert HSL to HEX color
 */
export function hslToHex(hsl: { h: number; s: number; l: number }): string {
  const { h, s, l } = hsl;
  const sNorm = Math.max(0, Math.min(1, s));
  const lNorm = Math.max(0, Math.min(1, l));
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/**
 * Convert HSL to RGB string
 */
export function hslToRgbString(hsl: { h: number; s: number; l: number }): string {
  const { h, s, l } = hsl;
  const sNorm = Math.max(0, Math.min(1, s / 100));
  const lNorm = Math.max(0, Math.min(1, l / 100));
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return `rgb(${f(0)}, ${f(8)}, ${f(4)})`;
}

/**
 * Convert HEX to HSL values
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}
