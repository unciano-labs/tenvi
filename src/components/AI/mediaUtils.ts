/**
 * Utilities for chat media previews and format detection.
 * Web browsers do not natively support HEIC/HEIF image preview in HTML <img> tags.
 * When HEIC is detected or when an image fails to load (broken preview),
 * Tenvi displays the file name instead of a broken image box.
 */

export function isPdfMedia(
  fileType?: string,
  fileName?: string,
  mimeType?: string,
  text?: string
): boolean {
  return Boolean(
    fileType === 'pdf' ||
      mimeType === 'application/pdf' ||
      mimeType?.startsWith('data:application/pdf') ||
      fileName?.toLowerCase().endsWith('.pdf') ||
      text?.includes('[Uploaded PDF')
  );
}

export function isHeicMedia(fileName?: string, mimeType?: string): boolean {
  return Boolean(
    mimeType?.includes('heic') ||
      mimeType?.includes('heif') ||
      fileName?.toLowerCase().endsWith('.heic') ||
      fileName?.toLowerCase().endsWith('.heif')
  );
}

export function shouldDisplayFileNameFallback(isHeic: boolean, hasError: boolean): boolean {
  return isHeic || hasError;
}

