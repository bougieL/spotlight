function fixUnquotedKeys(json: string): string {
  return json.replace(
    /(?<=[{,\[]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\s*:)/g,
    '"$1"',
  );
}

function findBalancedJson(text: string): string | null {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') {
      const openChar = text[i];
      const closeChar = openChar === '{' ? '}' : ']';
      let depth = 0;
      let inString = false;
      let escape = false;

      for (let j = i; j < text.length; j++) {
        const ch = text[j];
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\') {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (inString) continue;
        if (ch === openChar) depth++;
        if (ch === closeChar) depth--;
        if (depth === 0) {
          return text.substring(i, j + 1);
        }
      }
    }
  }
  return null;
}

export function parseJson(text: string): unknown {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'string') {
      try {
        return JSON.parse(parsed);
      } catch {
        return parsed;
      }
    }
    return parsed;
  } catch {
    const raw = findBalancedJson(text);
    if (!raw) {
      throw new Error('No valid JSON found');
    }
    try {
      return JSON.parse(raw);
    } catch {
      const fixed = fixUnquotedKeys(raw);
      return JSON.parse(fixed);
    }
  }
}
