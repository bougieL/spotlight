import { listen as tauriListen, emit as tauriEmit } from '@tauri-apps/api/event';

export type UnlistenFn = () => void;

export const EventName = {
  CLIPBOARD_CHANGED: 'clipboard-changed',
  TAURI_FOCUS_CHANGED: 'tauri://focus-changed',
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
  onFocusChanged: (handler: (focused: boolean) => void) =>
    listen<boolean>(EventName.TAURI_FOCUS_CHANGED, handler),
};
