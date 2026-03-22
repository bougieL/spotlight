function fixUnquotedKeys(json: string): string {
  return json.replace(
    /(?<=[{,\[]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\s*:)/g,
    '"$1"',
  );
}

function fixSingleQuotes(json: string): string {
  let result = '';
  let inString = false;
  let escape = false;
  let stringChar = '';

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escape) {
      result += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      result += ch;
      escape = true;
      continue;
    }
    if (!inString && (ch === '"' || ch === "'")) {
      inString = true;
      stringChar = ch;
      result += '"';
      continue;
    }
    if (inString && ch === stringChar) {
      inString = false;
      result += '"';
      continue;
    }
    result += ch;
  }
  return result;
}

function fixTrailingCommas(json: string): string {
  return json
    .replace(/,\s*(?=[}\]])/g, '')
    .replace(/,\s*$/gm, '');
}

function unescapeQuotes(json: string): string {
  return json.replace(/\\"/g, '"');
}

function normalizeJson(raw: string): string {
  let result = unescapeQuotes(raw);
  result = fixSingleQuotes(result);
  result = fixUnquotedKeys(result);
  result = fixTrailingCommas(result);
  return result;
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
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('No valid JSON found');
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
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
    const normalized = normalizeJson(raw);
    return JSON.parse(normalized);
  }
}
