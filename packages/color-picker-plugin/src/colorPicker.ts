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
    logger.error('Failed to close picker:', err);
  }
}

async function captureScreen(
  canvas: HTMLCanvasElement
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

    const startLoad = performance.now();
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = capture.dataUrl;
    });
    logger.info(`[Performance] load image: ${(performance.now() - startLoad).toFixed(1)} ms`);

    const startDraw = performance.now();
    ctx.drawImage(img, 0, 0);
    logger.info(`[Performance] drawImage: ${(performance.now() - startDraw).toFixed(1)} ms`);

    crosshair.classList.add('show');
    magnifier.classList.add('show');
    imageLoaded = true;
    logger.info(`[Performance] TOTAL captureScreen: ${(performance.now() - startTotal).toFixed(1)} ms`);

    return ctx;
  } catch (err) {
    logger.error('Failed to capture screen:', err);
    crosshair.classList.remove('show');
    magnifier.classList.remove('show');
    imageLoaded = false;
    return null;
  }
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const crosshair = document.getElementById('crosshair') as HTMLElement;
const magnifier = document.getElementById('magnifier') as HTMLElement;
const magnifierCanvas = document.getElementById('magnifier-canvas') as HTMLCanvasElement;
const magnifierColor = document.getElementById('magnifier-color') as HTMLElement;
const magnifierHex = document.getElementById('magnifier-hex') as HTMLElement;
const magnifierCtx = magnifierCanvas.getContext('2d', { alpha: true })!;

let lastColor = '#000000';
let ctx: CanvasRenderingContext2D | null = null;
let imageLoaded = false;

const MAGNIFIER_SIZE = 120;
const ZOOM_LEVEL = 8; // 8x zoom
const CAPTURE_SIZE = MAGNIFIER_SIZE / ZOOM_LEVEL; // 15 pixels

function handleMouseMove(e: MouseEvent) {
  crosshair.style.left = e.clientX + 'px';
  crosshair.style.top = e.clientY + 'px';

  // Position magnifier below and to the right of cursor
  const offsetX = 25;
  const offsetY = 25;
  let magnifierX = e.clientX + offsetX;
  let magnifierY = e.clientY + offsetY;

  // Keep magnifier on screen (120 circle + ~35 info below = ~160 total height)
  const totalHeight = 165;
  const totalWidth = 130;
  if (magnifierX + totalWidth > window.innerWidth) {
    magnifierX = window.innerWidth - totalWidth - 10;
  }
  if (magnifierY + totalHeight > window.innerHeight) {
    // Show above cursor instead
    magnifierY = e.clientY - totalHeight - offsetY;
  }
  if (magnifierY < 0) {
    magnifierY = 10;
  }

  magnifier.style.left = magnifierX + 'px';
  magnifier.style.top = magnifierY + 'px';

  if (!ctx || !imageLoaded) return;

  const color = getColorAtPosition(ctx, canvas, e.clientX, e.clientY);
  if (color) {
    lastColor = color;
    magnifierColor.style.backgroundColor = color;
    magnifierHex.textContent = color;
    crosshair.style.borderColor = isLightColor(color) ? '#000' : '#fff';
  }

  // Update magnifier with zoomed view
  updateMagnifier(e.clientX, e.clientY);
}

function updateMagnifier(clientX: number, clientY: number) {
  if (!ctx || !imageLoaded) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // Calculate the center point in canvas coordinates
  const centerX = Math.floor((clientX - rect.left) * scaleX);
  const centerY = Math.floor((clientY - rect.top) * scaleY);

  // Source rectangle for the magnifier (in canvas coordinates)
  const halfSize = Math.floor(CAPTURE_SIZE / 2);
  const sourceX = centerX - halfSize;
  const sourceY = centerY - halfSize;

  // Make sure we don't go out of bounds
  const safeSourceX = Math.max(0, Math.min(sourceX, canvas.width - CAPTURE_SIZE));
  const safeSourceY = Math.max(0, Math.min(sourceY, canvas.height - CAPTURE_SIZE));

  // Clear and draw zoomed region
  magnifierCtx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);

  // Disable smoothing for pixelated look
  magnifierCtx.imageSmoothingEnabled = false;

  // Draw the zoomed region
  magnifierCtx.drawImage(
    canvas,
    safeSourceX,
    safeSourceY,
    CAPTURE_SIZE,
    CAPTURE_SIZE,
    0,
    0,
    MAGNIFIER_SIZE,
    MAGNIFIER_SIZE
  );
}

async function handleClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  try {
    await navigator.clipboard.writeText(lastColor);
  } catch (err) {
    logger.error('Failed to copy color:', err);
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

captureScreen(canvas).then((result) => {
  if (result) {
    ctx = result;
  }
});

window.focus();
