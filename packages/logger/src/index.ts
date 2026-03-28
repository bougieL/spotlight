import { invoke } from '@tauri-apps/api/core';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LoggerApi {
  writeLog: (level: LogLevel, message: string) => Promise<void>;
}

export const loggerApi: LoggerApi = {
  writeLog: (level: LogLevel, message: string) => invoke('write_log', { level, message }),
};

function serializeMessage(message: string, error?: unknown): string {
  if (error) {
    const errorStr = error instanceof Error
      ? `${error.message}\n${error.stack || ''}`
      : String(error);
    return `${message}\nError: ${errorStr}`;
  }
  return message;
}

interface LogOptions {
  level: LogLevel;
  message: string;
  error?: unknown;
}

export async function log({ level, message, error }: LogOptions): Promise<void> {
  try {
    const fullMessage = serializeMessage(message, error);
    await loggerApi.writeLog(level, fullMessage);
  } catch (err) {
    console.error('Failed to write log:', err);
  }
}

export const logger = {
  info: (message: string, error?: unknown) => log({ level: 'INFO', message, error }),
  warn: (message: string, error?: unknown) => log({ level: 'WARN', message, error }),
  error: (message: string, error?: unknown) => log({ level: 'ERROR', message, error }),
  debug: (message: string, error?: unknown) => log({ level: 'DEBUG', message, error }),
};

export default logger;
