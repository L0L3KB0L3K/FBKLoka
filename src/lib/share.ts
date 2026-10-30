// Share image (og:image) from a page photo: a 1.91:1 crop, 1200×630 at most (SPEC.md §13.2).
// Astro never upscales and then ignores the crop, so a smaller photo gets the largest 1.91:1 crop it allows.
// The size is computed here, so og:image:width/height match the real file.
import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";

export async function shareImage(src: ImageMetadata, alt: string, site: URL) {
  const width = Math.min(1200, src.width, Math.floor((src.height * 1200) / 630));
  const height = Math.round((width * 630) / 1200);
  const image = await getImage({ src, width, height, format: "jpg" });
  return { url: new URL(image.src, site), width, height, alt };
}
