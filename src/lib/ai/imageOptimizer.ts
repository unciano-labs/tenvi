/**
 * Client-side image optimizer for camera captures and document scans.
 *
 * Scales down large smartphone camera photos (often 12-48MP, 6-18MB)
 * to a crisp, OCR-friendly resolution (max 1600px, ~300-600KB) and ensures
 * standard JPEG format (converting iOS HEIC/HEIF).
 *
 * This prevents:
 * 1. Vercel 4.5MB Serverless Function payload rejection (HTTP 413)
 * 2. Next.js Server Action body size limit crashes
 * 3. Mobile network timeouts and heavy memory spikes
 */
export async function optimizeImageForUpload(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<File> {
  // If not in browser or not an image (e.g. PDF), return original file untouched
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return file;
  }

  // If already under 800KB and standard web format, no heavy resizing needed
  if (file.size < 800 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;

        // Downscale proportionally if either dimension exceeds maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback to original
          return;
        }

        // Fill white background in case of transparent png or margins
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            console.log(
              `[ImageOptimizer] Compressed ${(file.size / 1024 / 1024).toFixed(2)}MB (${img.naturalWidth}x${img.naturalHeight}) -> ${(compressedFile.size / 1024).toFixed(1)}KB (${width}x${height})`
            );

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file); // Graceful fallback
      };

      img.src = objectUrl;
    } catch {
      resolve(file);
    }
  });
}
