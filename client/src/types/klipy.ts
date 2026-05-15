/**
 * Client-side Klipy types.
 * Mirror of server/src/engine/klipyClient.ts types — keep in sync.
 */

export interface KlipyFileVariant {
  url: string;
  width: number;
  height: number;
}

export interface KlipyGifFiles {
  gif?: KlipyFileVariant;
  webp?: KlipyFileVariant;
  mp4?: KlipyFileVariant;
  tinyGif?: KlipyFileVariant;
  tinyMp4?: KlipyFileVariant;
}

export interface KlipyGif {
  slug: string;
  title: string;
  files: KlipyGifFiles;
}

export interface KlipyCategory {
  slug: string;
  name: string;
  gif?: KlipyGif;
}

export interface KlipyPage<T> {
  result: boolean;
  data: {
    data: T[];
    current_page: number;
    per_page: number;
    has_next: boolean;
  };
}

export interface KlipyCategoryResponse {
  result: boolean;
  data: KlipyCategory[];
}

/** Picks the best preview URL for a GIF item — smallest available variant. */
export function gifPreviewUrl(gif: KlipyGif): string | undefined {
  return (
    gif.files.tinyGif?.url ??
    gif.files.webp?.url ??
    gif.files.gif?.url
  );
}

/** Picks the full-quality URL for a sent GIF. */
export function gifFullUrl(gif: KlipyGif): string | undefined {
  return gif.files.gif?.url ?? gif.files.webp?.url;
}

/** Dimensions of the preview variant (for aspect-ratio placeholders). */
export function gifPreviewSize(gif: KlipyGif): { width: number; height: number } | undefined {
  const v = gif.files.tinyGif ?? gif.files.webp ?? gif.files.gif;
  return v ? { width: v.width, height: v.height } : undefined;
}
