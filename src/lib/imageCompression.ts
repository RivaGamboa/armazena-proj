/**
 * Compress and convert an image file to WebP format at max 1080x1080,
 * preserving aspect ratio with a center crop to square.
 */
export async function compressImage(
  file: File,
  maxSize = 1080,
  quality = 0.85
): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate crop for square (center crop)
      const { naturalWidth: w, naturalHeight: h } = img;
      const cropSize = Math.min(w, h);
      const sx = (w - cropSize) / 2;
      const sy = (h - cropSize) / 2;

      const outputSize = Math.min(cropSize, maxSize);

      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to compress image"));
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const compressed = new File([blob], `${baseName}.webp`, {
            type: "image/webp",
          });
          resolve(compressed);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: return original file if can't process
      resolve(file);
    };

    img.src = url;
  });
}

/** Compress multiple image files in parallel */
export async function compressImages(files: File[], maxSize = 1080, quality = 0.85): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, maxSize, quality)));
}
