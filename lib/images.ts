import type { ImageInput } from "./types";

export function largerImageUrl(url: string) {
  return String(url).replace(/s-l\d+\.(jpg|jpeg|png|webp)/i, "s-l1600.$1");
}

export function mimeFromUrl(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

export function mimeFromName(name: string, fallback = "image/jpeg") {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return fallback || "image/jpeg";
}

export async function downloadImage(url: string): Promise<ImageInput> {
  const target = largerImageUrl(url);
  const response = await fetch(target, {
    headers: { "User-Agent": "title-generator/1.0" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Image download failed (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const header = response.headers.get("content-type") || "";
  const mime = header.startsWith("image/") ? header.split(";")[0] : mimeFromUrl(target);
  return { mime, base64: bytes.toString("base64") };
}
