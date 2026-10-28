import { useEffect, useRef } from 'react';
import { hero } from '../data/properties';
import { gsap, prefersReducedMotion } from '../lib/motion';
import SmartImage from './SmartImage';

export default function Hero({ onExplore, onBook }: { onExplore: () => void; onBook: () => void }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !root.current) return;
    const ctx = gsap.context(() => {
      // Subtle parallax: the image drifts slower than the page.
      gsap.to('.hero__media img', {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" ref={root} aria-labelledby="hero-title">
      <div className="hero__media">
        <SmartImage src={hero.poster} srcSmall={hero.poster.replace('.jpg', '-sm.jpg')} alt={hero.posterAlt} priority sizes="100vw" />
      </div>
      <div className="hero__content">
        <p className="eyebrow">AUREL Estates · Private collection</p>
        <h1 id="hero-title" className="hero__title">{hero.headline}</h1>
        <p className="hero__intro">{hero.intro}</p>
        <div className="hero__actions">
          <button className="btn btn--dark" onClick={onBook}>Book a Private Viewing</button>
          <button className="btn btn--outline" onClick={onExplore}>Explore Residences</button>
        </div>
      </div>
      <p className="media-label hero__label">Concept render · demonstration content</p>
    </section>
  );
}
