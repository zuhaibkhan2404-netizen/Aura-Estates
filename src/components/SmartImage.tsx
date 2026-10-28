import { useState } from 'react';

interface Props {
  src: string;
  /** Optional ~900px variant used on small screens. */
  srcSmall?: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * Image with lazy loading, a small-screen variant and a graceful placeholder
 * if the file is missing (so a broken asset never shows a broken-image icon).
 */
export default function SmartImage({ src, srcSmall, alt, priority, sizes = '100vw', className }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`img-missing ${className ?? ''}`} role="img" aria-label={`${alt} (image not available)`}>
        <span>Image placeholder</span>
        <code>{src}</code>
      </div>
    );
  }
  return (
    <img
      className={className}
      src={src}
      srcSet={srcSmall ? `${srcSmall} 900w, ${src} 1600w` : undefined}
      sizes={srcSmall ? sizes : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      onError={() => setFailed(true)}
    />
  );
}

export const small = (src: string) => src.replace(/\.jpg$/, '-sm.jpg');
