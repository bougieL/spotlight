export interface CompressedImage {
  id: string;
  originalFile: File;
  originalSize: number;
  compressedBlob: Blob | null;
  compressedSize: number;
  compressedUrl: string | null;
  quality: number;
  format: 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp';
  isLossless: boolean;
}
