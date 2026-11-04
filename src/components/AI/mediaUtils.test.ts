import { describe, it, expect } from 'vitest';
import { isPdfMedia, isHeicMedia, shouldDisplayFileNameFallback } from './mediaUtils';

describe('mediaUtils', () => {
  describe('isPdfMedia', () => {
    it('detects PDF by fileType', () => {
      expect(isPdfMedia('pdf')).toBe(true);
      expect(isPdfMedia('image')).toBe(false);
    });

    it('detects PDF by fileName extension (case-insensitive)', () => {
      expect(isPdfMedia(undefined, 'receipt.pdf')).toBe(true);
      expect(isPdfMedia(undefined, 'STATEMENT.PDF')).toBe(true);
      expect(isPdfMedia(undefined, 'photo.jpg')).toBe(false);
    });

    it('detects PDF by MIME type or data URL', () => {
      expect(isPdfMedia(undefined, undefined, 'application/pdf')).toBe(true);
      expect(isPdfMedia(undefined, undefined, 'data:application/pdf;base64,JVBERi0x...')).toBe(true);
      expect(isPdfMedia(undefined, undefined, 'image/jpeg')).toBe(false);
    });

    it('detects PDF by text tag fallback', () => {
      expect(isPdfMedia(undefined, undefined, undefined, '📄 [Uploaded PDF Document]')).toBe(true);
    });
  });

  describe('isHeicMedia', () => {
    it('detects HEIC and HEIF extensions (case-insensitive)', () => {
      expect(isHeicMedia('IMG_1234.heic')).toBe(true);
      expect(isHeicMedia('IMG_1234.HEIC')).toBe(true);
      expect(isHeicMedia('photo.heif')).toBe(true);
      expect(isHeicMedia('PHOTO.HEIF')).toBe(true);
      expect(isHeicMedia('receipt.jpg')).toBe(false);
      expect(isHeicMedia('scan.png')).toBe(false);
    });

    it('detects HEIC MIME types and data URLs', () => {
      expect(isHeicMedia(undefined, 'image/heic')).toBe(true);
      expect(isHeicMedia(undefined, 'image/heif')).toBe(true);
      expect(isHeicMedia(undefined, 'data:image/heic;base64,AAAA...')).toBe(true);
      expect(isHeicMedia(undefined, 'image/jpeg')).toBe(false);
    });
  });

  describe('shouldDisplayFileNameFallback', () => {
    it('displays file name fallback when isHeic is true', () => {
      expect(shouldDisplayFileNameFallback(true, false)).toBe(true);
    });

    it('displays file name fallback when image preview has an error (broken preview)', () => {
      expect(shouldDisplayFileNameFallback(false, true)).toBe(true);
    });

    it('displays file name fallback when both isHeic and hasError are true', () => {
      expect(shouldDisplayFileNameFallback(true, true)).toBe(true);
    });

    it('allows native image preview when neither isHeic nor hasError is true', () => {
      expect(shouldDisplayFileNameFallback(false, false)).toBe(false);
    });
  });
});

