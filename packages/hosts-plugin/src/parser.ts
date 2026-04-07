import type { HostsEntry } from './types';

function isValidIp(ip: string): boolean {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every(p => p >= 0 && p <= 255);
  }

  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Pattern.test(ip);
}

export function parseHostsLine(line: string, lineNumber: number): HostsEntry | null {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('#')) {
    const content = trimmed.slice(1).trim();
    const parts = content.split(/\s+/);

    if (parts.length >= 2 && isValidIp(parts[0])) {
      return {
        ip: parts[0],
        domain: parts[1],
        comment: parts.length > 2 ? parts.slice(2).join(' ') : undefined,
        enabled: false,
        lineNumber,
      };
    }
    return null;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2 && isValidIp(parts[0])) {
    const commentIndex = parts.findIndex((p, i) => i >= 2 && p.startsWith('#'));
    return {
      ip: parts[0],
      domain: parts[1],
      comment: commentIndex > 2 ? parts.slice(commentIndex).join(' ').slice(1) : undefined,
      enabled: true,
      lineNumber,
    };
  }

  return null;
}

export function parseHostsContent(content: string): HostsEntry[] {
  const entries: HostsEntry[] = [];
  const lines = content.split('\n');
  let lineNumber = 0;

  for (const line of lines) {
    const entry = parseHostsLine(line, lineNumber);
    if (entry) {
      entries.push(entry);
    }
    lineNumber++;
  }

  return entries;
}

export function generateHostsContent(entries: HostsEntry[]): string {
  const lines: string[] = [];

  for (const entry of entries) {
    let line = entry.enabled ? '' : '# ';
    line += `${entry.ip} ${entry.domain}`;
    if (entry.comment) {
      line += ` #${entry.comment}`;
    }
    lines.push(line);
  }

  return lines.join('\n');
}
