import { captureFullScreen, tauriApi } from '@spotlight/api';
import logger from '@spotlight/logger';

function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 2), 16);
  const b = parseInt(hex.slice(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

function getColorAtPosition(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): string | null {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = Math.floor((clientX - rect.left) * scaleX);
  const y = Math.floor((clientY - rect.top) * scaleY);

  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
    return null;
  }

  const pixel = ctx.getImageData(x, y, 1, 1).data;
  return '#' + [pixel[0], pixel[1], pixel[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
}

async function closePicker(): Promise<void> {
  try {
    await tauriApi.closeOverlayWindow('color-picker-overlay');
  } catch (err) {
    console.error('Failed to close picker:', err);
  }
}

async function captureScreen(
  canvas: HTMLCanvasElement,
  loading: HTMLElement
): Promise<CanvasRenderingContext2D | null> {
  const startTotal = performance.now();
  try {
    const startCapture = performance.now();
    const capture = await captureFullScreen();
    logger.info(`[Performance] captureFullScreen: ${(performance.now() - startCapture).toFixed(1)} ms`);

    canvas.width = capture.width;
    canvas.height = capture.height;
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startFetch = performance.now();
    // Use fetch to load file via asset protocol
    const assetUrl = tauriApi.convertFileSrc(capture.filePath);
    const res = await fetch(assetUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch image: ${res.status}`);
    }
    const blob = await res.blob();
    logger.info(`[Performance] fetch blob: ${(performance.now() - startFetch).toFixed(1)} ms`);

    const startBitmap = performance.now();
    // Create image bitmap from blob - this avoids canvas tainting
    const imageBitmap = await createImageBitmap(blob);
    logger.info(`[Performance] createImageBitmap: ${(performance.now() - startBitmap).toFixed(1)} ms`);

    const startDraw = performance.now();
    ctx.drawImage(imageBitmap, 0, 0);
    imageBitmap.close();
    logger.info(`[Performance] drawImage: ${(performance.now() - startDraw).toFixed(1)} ms`);

    loading.style.display = 'none';
    logger.info(`[Performance] TOTAL captureScreen: ${(performance.now() - startTotal).toFixed(1)} ms`);

    return ctx;
  } catch (err) {
    console.error('Failed to capture screen:', err);
    loading.textContent = 'Failed: ' + String(err);
    return null;
  }
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const crosshair = document.getElementById('crosshair') as HTMLElement;
const info = document.getElementById('info') as HTMLElement;
const loading = document.getElementById('loading') as HTMLElement;

let lastColor = '#000000';
let ctx: CanvasRenderingContext2D | null = null;

function handleMouseMove(e: MouseEvent) {
  crosshair.style.left = e.clientX + 'px';
  crosshair.style.top = e.clientY + 'px';
  info.style.left = (e.clientX + 15) + 'px';
  info.style.top = (e.clientY + 15) + 'px';

  if (!ctx) return;

  const color = getColorAtPosition(ctx, canvas, e.clientX, e.clientY);
  if (color) {
    lastColor = color;
    info.textContent = color;
    info.classList.add('show');
    crosshair.style.borderColor = isLightColor(color) ? '#000' : '#fff';
  }
}

async function handleClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  try {
    await navigator.clipboard.writeText(lastColor);
  } catch (err) {
    console.error('Failed to copy color:', err);
  }
  await closePicker();
}

async function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    await closePicker();
  }
}

document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('click', handleClick);
document.addEventListener('keydown', handleKeyDown);

captureScreen(canvas, loading).then((result) => {
  if (result) {
    ctx = result;
  }
});

window.focus();
