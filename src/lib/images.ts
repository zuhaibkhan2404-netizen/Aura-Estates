/**
 * Image helper. Photos are hot-linked from Unsplash (free Unsplash licence, credited on the page).
 * Every photo also has a local fallback so the site never shows a broken image.
 * Add `?local` to the URL to force the local fallbacks (useful offline or for testing).
 */
export interface Photo {
  /** Unsplash photo id, e.g. '1613977257363-707ba9348227'. Leave empty to use only `fallback`. */
  id: string;
  alt: string;
  /** Local file used if the remote photo fails or `?local` is set. */
  fallback: string;
  credit?: { name: string; url: string };
  /** Optional crop focus for object-position, e.g. '60% 50%'. */
  focus?: string;
}

const forceLocal = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('local');

export function photoUrl(p: Photo, width = 1600): string {
  if (!p.id || forceLocal) return width <= 900 ? p.fallback.replace(/\.jpg$/, '-sm.jpg') : p.fallback;
  return `https://images.unsplash.com/photo-${p.id}?auto=format&fit=crop&w=${width}&q=80`;
}

export function photoSrcSet(p: Photo): string {
  if (!p.id || forceLocal) return `${p.fallback.replace(/\.jpg$/, '-sm.jpg')} 900w, ${p.fallback} 1600w`;
  return [900, 1600, 2400].map((w) => `${photoUrl(p, w)} ${w}w`).join(', ');
}

export const isRemote = (p: Photo) => !!p.id && !forceLocal;
