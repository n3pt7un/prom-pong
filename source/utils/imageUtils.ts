/**
 * Returns a URL for a thumbnail version of an avatar at the requested pixel size.
 *
 * Handles known CDN patterns without any server round-trip:
 *   - picsum.photos  → rewrites /id/{n}/200/200 to /id/{n}/{px}/{px}
 *   - Google CDN     → rewrites =s96-c suffix to =s{px}-c
 *   - data: / other  → returned unchanged (already small or unknown)
 */
export function thumbUrl(src: string, px: number): string {
  if (!src) return src;
  // picsum.photos: https://picsum.photos/id/64/200/200
  const picsumMatch = src.match(/^(https:\/\/picsum\.photos\/id\/\d+)\/\d+\/\d+/);
  if (picsumMatch) return `${picsumMatch[1]}/${px}/${px}`;
  // Google user content: ends with =s96-c or =s96
  if (src.includes('googleusercontent.com')) {
    if (/=s\d+-c/.test(src)) return src.replace(/=s\d+-c/, `=s${px}-c`);
    if (/=s\d+$/.test(src)) return src.replace(/=s\d+$/, `=s${px}`);
    // URL without size token: append it
    return `${src}=s${px}-c`;
  }
  return src;
}

/**
 * Resizes an uploaded image file to a small square (200x200) Base64 string
 * to ensure it fits comfortably in LocalStorage.
 */
export const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No Canvas Context');

        const size = 200;
        canvas.width = size;
        canvas.height = size;

        // Simple center crop calculation
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
        
        // Compress to JPEG 0.8 quality
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};