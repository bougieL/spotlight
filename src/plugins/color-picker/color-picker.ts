import { invoke } from '@tauri-apps/api/core';

const OVERLAY_WINDOW_LABEL = 'color-picker-overlay';

let lastColor = '#000000';
let crosshair: HTMLElement | null = null;
let info: HTMLElement | null = null;

export function initColorPicker() {
  crosshair = document.getElementById('crosshair');
  info = document.getElementById('info');
  const overlay = document.getElementById('overlay');
  const testBtn = document.getElementById('test-btn');

  if (!crosshair || !info || !overlay) {
    console.error('Required elements not found');
    return;
  }

  // Ensure window has focus
  window.focus();

  // Test button click
  testBtn?.addEventListener('click', () => {
    console.log('Test button clicked!');
    alert('Test button works!');
  });

  // Overlay click
  overlay.addEventListener('click', () => {
    console.log('Overlay clicked!');
  });

  // Mouse move - update crosshair and get color
  document.addEventListener('mousemove', handleMouseMove);

  // Click - copy color and close
  document.addEventListener('click', handleClick);

  // Escape - close
  document.addEventListener('keydown', handleKeyDown);
}

async function handleMouseMove(e: MouseEvent) {
  if (!crosshair || !info) return;

  crosshair.style.left = e.clientX + 'px';
  crosshair.style.top = e.clientY + 'px';
  info.style.left = (e.clientX + 15) + 'px';
  info.style.top = (e.clientY + 15) + 'px';

  try {
    const color = await invoke<string>('get_color_at_position', { x: e.screenX, y: e.screenY });
    if (color) {
      lastColor = color;
      info.textContent = color;
      info.classList.add('show');
      if (crosshair) {
        crosshair.style.borderColor = isLightColor(color) ? '#000' : '#fff';
      }
    }
  } catch (err) {
    console.error('Failed to get color:', err);
  }
}

async function handleClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  console.log('Document clicked!');

  try {
    await invoke('copy_color_to_clipboard', { color: lastColor });
  } catch (err) {
    console.error('Failed to copy color:', err);
  }

  await closePicker();
}

async function handleKeyDown(e: KeyboardEvent) {
  console.log('Key pressed:', e.key);
  if (e.key === 'Escape') {
    await closePicker();
  }
}

async function closePicker() {
  try {
    await invoke('close_overlay_window', { label: OVERLAY_WINDOW_LABEL });
  } catch (err) {
    console.error('Failed to close picker:', err);
  }
}

function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

// Auto-init when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initColorPicker);
}
