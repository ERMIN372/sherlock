/**
 * Client-side helpers for turning a react-easy-crop selection into a cropped
 * JPEG Blob (used as the query image) plus a small data-URL thumbnail (stored
 * in local history). Runs entirely in the browser; nothing is uploaded here.
 */

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("Could not load image")));
    img.src = src;
  });
}

export async function getCroppedBlob(
  imageSrc: string,
  crop: PixelCrop,
  maxSize = 1024,
): Promise<{ blob: Blob; thumbnail: string }> {
  const image = await loadImage(imageSrc);

  // Scale down very large crops to keep uploads small.
  const scale = Math.min(1, maxSize / Math.max(crop.width, crop.height));
  const outW = Math.max(1, Math.round(crop.width * scale));
  const outH = Math.max(1, Math.round(crop.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outW, outH);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to export image"))),
      "image/jpeg",
      0.9,
    );
  });

  // Small thumbnail for history.
  const thumbSize = 96;
  const tCanvas = document.createElement("canvas");
  tCanvas.width = thumbSize;
  tCanvas.height = thumbSize;
  const tCtx = tCanvas.getContext("2d");
  if (tCtx) {
    tCtx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, thumbSize, thumbSize);
  }
  const thumbnail = tCanvas.toDataURL("image/jpeg", 0.7);

  return { blob, thumbnail };
}
