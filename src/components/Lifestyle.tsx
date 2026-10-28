import { useEffect, useRef } from 'react';
import { lifestyle } from '../data/properties';
import { gsap, prefersReducedMotion } from '../lib/motion';
import SmartImage, { small } from './SmartImage';

export default function Lifestyle() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.split__media').forEach((m) => {
        gsap.fromTo(m.querySelector('img'), { yPercent: -5 }, {
          yPercent: 5, ease: 'none',
          scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="lifestyle" className="lifestyle" ref={root} aria-label="Lifestyle">
      {lifestyle.map((l, i) => (
        <article className={`split${i % 2 ? ' split--reverse' : ''}`} key={l.id}>
          <div className="split__media">
            <SmartImage src={l.image} srcSmall={small(l.image)} alt={l.alt} sizes="(min-width: 900px) 60vw, 100vw" />
            <p className="media-label">Concept render</p>
          </div>
          <div className="split__text">
            <p className="eyebrow">{l.eyebrow}</p>
            <h2 className="section-title section-title--md">{l.title}</h2>
            <p>{l.body}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
