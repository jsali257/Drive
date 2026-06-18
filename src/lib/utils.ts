import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | bigint, decimals = 2): string {
  const b = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  if (!b || b === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileIcon(mimeType: string, extension?: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'music';
  if (mimeType === 'application/pdf') return 'file-text';
  if (mimeType.includes('word') || extension === 'doc' || extension === 'docx') return 'file-text';
  if (mimeType.includes('excel') || extension === 'xls' || extension === 'xlsx') return 'sheet';
  if (mimeType.includes('powerpoint') || extension === 'ppt' || extension === 'pptx') return 'presentation';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
  if (mimeType.startsWith('text/')) return 'file-code';
  return 'file';
}

export function getFileBadgeColor(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  if (mimeType.startsWith('video/')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  if (mimeType.startsWith('audio/')) return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
  if (mimeType === 'application/pdf') return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  if (mimeType.startsWith('text/')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
}
