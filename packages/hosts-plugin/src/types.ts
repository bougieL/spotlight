export interface HostsEntry {
  ip: string;
  domain: string;
  comment?: string;
  enabled: boolean;
  lineNumber: number;
}

export interface ReadHostsResult {
  entries: HostsEntry[];
  raw: string;
  filePath: string;
}
