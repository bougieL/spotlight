import { readTextFile, writeTextFile, tauriApi } from '@spotlight/api';
const { openPath, revealInExplorer } = tauriApi;
import type { HostsEntry, ReadHostsResult } from './types';
import { parseHostsContent, generateHostsContent } from './parser';

function getHostsPath(): string {
  if (navigator.platform.startsWith('Win')) {
    return 'C:\\Windows\\System32\\drivers\\etc\\hosts';
  }
  return '/etc/hosts';
}

export async function readHostsFile(): Promise<ReadHostsResult> {
  const filePath = getHostsPath();
  const raw = await readTextFile(filePath);
  const entries = parseHostsContent(raw);
  return { entries, raw, filePath };
}

export async function writeHostsFile(entries: HostsEntry[]): Promise<void> {
  const filePath = getHostsPath();
  const content = generateHostsContent(entries);
  await writeTextFile(filePath, content);
}

export async function getHostsFilePath(): Promise<string> {
  return getHostsPath();
}

export async function openHostsFileLocation(): Promise<void> {
  const filePath = getHostsPath();
  if (navigator.platform.startsWith('Win')) {
    await revealInExplorer(filePath);
  } else {
    await openPath(filePath);
  }
}
