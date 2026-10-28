import { useEffect, useRef } from 'react';
import { lifestyle } from '../data/properties';
import { photoSrcSet, photoUrl } from '../lib/images';
import { gsap, prefersReducedMotion } from '../lib/motion';
import Split from './Split';

export default function Lifestyle() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.split__media-inner').forEach((m) => {
        gsap.fromTo(m, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="lifestyle" className="lifestyle" ref={root} aria-label="Lifestyle">
      {lifestyle.map((l, i) => (
        <article className={`split-row${i % 2 ? ' split-row--reverse' : ''}`} key={l.id}>
          <div className="split-row__media" data-wipe>
            <div className="split__media-inner">
              <img
                src={photoUrl(l.photo, 1600)}
                srcSet={photoSrcSet(l.photo)}
                sizes="(min-width: 900px) 60vw, 100vw"
                alt={l.photo.alt}
                loading="lazy"
                onError={(e) => { const img = e.currentTarget; if (!img.src.endsWith(l.photo.fallback)) { img.srcset = ''; img.src = l.photo.fallback; } }}
              />
            </div>
            <p className="media-label">Photo: {l.photo.credit?.name} / Unsplash</p>
          </div>
          <div className="split-row__text">
            <p className="eyebrow" data-reveal>{l.eyebrow}</p>
            <Split as="h2" text={l.title} className="section-title section-title--md" data-split="" />
            <p data-reveal>{l.body}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
