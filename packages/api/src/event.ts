import { listen as tauriListen, emit as tauriEmit } from '@tauri-apps/api/event';

export type UnlistenFn = () => void;

export const EventName = {
  CLIPBOARD_CHANGED: 'clipboard-changed',
  TAURI_FOCUS: 'focus',
  TAURI_BLUR: 'blur',
} as const;

export type EventNameType = typeof EventName[keyof typeof EventName];

export async function listen<T>(event: EventNameType | (string & {}), handler: (event: T) => void): Promise<UnlistenFn> {
  const unlisten = await tauriListen<T>(event, (event) => {
    handler(event.payload);
  });
  return unlisten;
}

export async function emit(event: EventNameType | (string & {}), payload?: unknown): Promise<void> {
  await tauriEmit(event, payload);
}

export const on = {
  clipboardChanged: <T = void>(handler: (event: T) => void) => listen<T>(EventName.CLIPBOARD_CHANGED, handler),
  windowFocus: <T = void>(handler: (event: T) => void) => listen<T>(EventName.TAURI_FOCUS, handler),
  windowBlur: <T = void>(handler: (event: T) => void) => listen<T>(EventName.TAURI_BLUR, handler),
};
