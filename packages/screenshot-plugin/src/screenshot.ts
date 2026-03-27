import { captureFullScreen, tauriApi } from '@spotlight/api';
import logger from '@spotlight/logger';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const selection = document.getElementById('selection') as HTMLElement;
const selectionDimensions = document.getElementById('selection-dimensions') as HTMLElement;
const hint = document.getElementById('hint') as HTMLElement;

let ctx: CanvasRenderingContext2D | null = null;
let imageLoaded = false;
let isSelecting = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;

function showHint(text: string): void {
  hint.textContent = text;
  hint.style.display = 'block';
}

function hideHint(): void {
  hint.style.display = 'none';
}

async function closeScreenshot(): Promise<void> {
  try {
    await tauriApi.closeOverlayWindow('screenshot-overlay');
  } catch (err) {
    logger.error('Failed to close screenshot:', err);
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
    logger.info(`[Debug] Canvas size: ${canvas.width}x${canvas.height}, window: ${window.innerWidth}x${window.innerHeight}`);
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })!;

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

    // Debug: check a pixel in the center
    const centerX = Math.floor(canvas.width / 2);
    const centerY = Math.floor(canvas.height / 2);
    const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;
    logger.info(`[Debug] Center pixel (${centerX}, ${centerY}): rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3]})`);

    imageLoaded = true;
    logger.info(`[Performance] TOTAL captureScreen: ${(performance.now() - startTotal).toFixed(1)} ms`);

    return ctx;
  } catch (err) {
    logger.error('Failed to capture screen:', err);
    imageLoaded = false;
    return null;
  }
}

function updateSelection(): void {
  if (!isSelecting) return;

  const minX = Math.min(startX, currentX);
  const minY = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  selection.style.left = minX + 'px';
  selection.style.top = minY + 'px';
  selection.style.width = width + 'px';
  selection.style.height = height + 'px';
  selection.classList.add('show');

  selectionDimensions.textContent = `${width} x ${height}`;
  selectionDimensions.style.left = (minX + width + 10) + 'px';
  selectionDimensions.style.top = minY + 'px';
  selectionDimensions.classList.add('show');
}

function clearSelection(): void {
  selection.classList.remove('show');
  selectionDimensions.classList.remove('show');
}

async function copySelectionToClipboard(): Promise<void> {
  if (!ctx || !imageLoaded) return;

  const minX = Math.min(startX, currentX);
  const minY = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  if (width < 5 || height < 5) {
    logger.info('Selection too small, ignoring');
    return;
  }

  try {
    const scaleX = canvas.width / window.innerWidth;
    const scaleY = canvas.height / window.innerHeight;

    const sourceX = Math.floor(minX * scaleX);
    const sourceY = Math.floor(minY * scaleY);
    const sourceWidth = Math.floor(width * scaleX);
    const sourceHeight = Math.floor(height * scaleY);

    logger.info(`[Debug] Copy selection: ${sourceX},${sourceY} ${sourceWidth}x${sourceHeight}, original: ${width}x${height}`);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sourceWidth;
    tempCanvas.height = sourceHeight;
    const tempCtx = tempCanvas.getContext('2d', { alpha: false })!;
    tempCtx.drawImage(
      canvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );

    // Debug: check a pixel in the copied region
    const testPixel = tempCtx.getImageData(Math.floor(sourceWidth/2), Math.floor(sourceHeight/2), 1, 1).data;
    logger.info(`[Debug] Temp canvas center pixel: rgba(${testPixel[0]}, ${testPixel[1]}, ${testPixel[2]}, ${testPixel[3]})`);

    const dataUrl = tempCanvas.toDataURL('image/png');
    logger.info(`[Debug] Data URL length: ${dataUrl.length}`);

    // Convert data URL to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      tempCanvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      }, 'image/png');
    });
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ]);
    logger.info('Screenshot copied to clipboard');
  } catch (err) {
    logger.error('Failed to copy screenshot to clipboard:', err);
  }
}

function handleMouseDown(e: MouseEvent): void {
  if (!imageLoaded) return;
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  currentX = e.clientX;
  currentY = e.clientY;
  hideHint();
  clearSelection();
}

function handleMouseMove(e: MouseEvent): void {
  if (!isSelecting) return;
  currentX = e.clientX;
  currentY = e.clientY;
  updateSelection();
}

async function handleMouseUp(e: MouseEvent): Promise<void> {
  if (!isSelecting) return;
  isSelecting = false;
  currentX = e.clientX;
  currentY = e.clientY;
  updateSelection();

  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  if (width > 5 && height > 5) {
    await copySelectionToClipboard();
    await closeScreenshot();
  }
}

async function handleKeyDown(e: KeyboardEvent): Promise<void> {
  if (e.key === 'Escape') {
    await closeScreenshot();
  }
}

captureScreen(canvas).then((result) => {
  if (result) {
    ctx = result;
    showHint('Click and drag to select region');
  }
});

document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);
document.addEventListener('keydown', handleKeyDown);

window.focus();
