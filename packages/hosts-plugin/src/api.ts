import { platform } from '@tauri-apps/plugin-os';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { openPath } from '@tauri-apps/plugin-opener';
import { tauriApi } from '@spotlight/api';
import type { HostsEntry, ReadHostsResult } from './types';
import { parseHostsContent, generateHostsContent } from './parser';

const { revealInExplorer } = tauriApi;

async function getHostsPath(): Promise<string> {
  const os = await platform();
  if (os === 'windows') {
    return 'C:\\Windows\\System32\\drivers\\etc\\hosts';
  }
  return '/etc/hosts';
}

export async function readHostsFile(): Promise<ReadHostsResult> {
  const filePath = await getHostsPath();
  const raw = await readTextFile(filePath);
  const entries = parseHostsContent(raw);
  return { entries, raw, filePath };
}

export async function writeHostsFile(entries: HostsEntry[]): Promise<void> {
  const filePath = await getHostsPath();
  const content = generateHostsContent(entries);
  await writeTextFile(filePath, content);
}

export async function getHostsFilePath(): Promise<string> {
  return await getHostsPath();
}

export async function openHostsFileLocation(): Promise<void> {
  const filePath = await getHostsPath();
  const os = await platform();
  if (os === 'windows') {
    await revealInExplorer(filePath);
  } else {
    await openPath(filePath);
  }
}
