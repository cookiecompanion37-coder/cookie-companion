"use client";

/** Browser-only image helpers: compress before storing/uploading. */

function draw(source: ImageBitmap | HTMLImageElement, width: number, height: number, max: number, quality: number): string {
  const scale = Math.min(1, max / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function compressFromUrl(url: string, max = 768, quality = 0.84): Promise<string> {
  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) return "";
    const blob = await response.blob();
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(blob);
      const data = draw(bitmap, bitmap.width, bitmap.height, max, quality);
      bitmap.close();
      return data;
    }
    return await compressBlob(blob, max, quality);
  } catch { return ""; }
}

export async function compressBlob(blob: Blob, max = 1024, quality = 0.85): Promise<string> {
  const fileUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => resolve(null);
      element.src = fileUrl;
    });
    if (!image) return "";
    return draw(image, image.naturalWidth, image.naturalHeight, max, quality);
  } finally { URL.revokeObjectURL(fileUrl); }
}

export async function compressFile(file: File, max = 1024, quality = 0.85): Promise<string> {
  return compressBlob(file, max, quality);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
