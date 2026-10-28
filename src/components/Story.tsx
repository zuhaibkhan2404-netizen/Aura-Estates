import { useEffect, useRef, useState } from 'react';
import { story } from '../data/properties';
import { ScrollTrigger, gsap, useReducedMotion } from '../lib/motion';
import { small } from './SmartImage';

/**
 * Short scroll-linked sequence: arrival → exterior → living → terrace.
 * A CSS sticky frame (no JS pinning) crossfades the scenes; afterwards the page
 * scrolls normally. Reduced motion shows the four scenes as a simple stacked list.
 */
export default function Story() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !root.current) return;
    const el = root.current;
    const ctx = gsap.context(() => {
      const media = gsap.utils.toArray<HTMLElement>('.story__scene');
      const lines = gsap.utils.toArray<HTMLElement>('.story__statement');
      gsap.set(media.slice(1), { autoAlpha: 0 });
      gsap.set(lines.slice(1), { autoAlpha: 0, y: 16 });
      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      media.forEach((m, i) => {
        tl.fromTo(m.querySelector('img'), { scale: 1.06 }, { scale: 1, duration: 1 }, i);
        if (i > 0) {
          tl.to(media[i - 1], { autoAlpha: 0, duration: 0.35 }, i - 0.2)
            .to(m, { autoAlpha: 1, duration: 0.35 }, i - 0.2)
            .to(lines[i - 1], { autoAlpha: 0, y: -16, duration: 0.25 }, i - 0.2)
            .to(lines[i], { autoAlpha: 1, y: 0, duration: 0.25 }, i - 0.05);
        }
      });
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        animation: tl,
        onUpdate: (self) => setActive(Math.min(story.length - 1, Math.floor(self.progress * story.length * 0.999))),
      });
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      id="story"
      ref={root}
      className={`story${reduced ? ' story--static' : ''}`}
      style={reduced ? undefined : { height: `${story.length * 65 + 100}svh` }}
      aria-labelledby="story-title"
    >
      <div className="story__frame">
        <div className="story__media">
          {story.map((s) => (
            <figure className="story__scene" key={s.id}>
              {s.video ? (
                <video src={s.video} poster={s.image} muted playsInline loop preload="none" aria-label={s.alt} />
              ) : (
                <img src={s.image} srcSet={`${small(s.image)} 900w, ${s.image} 2000w`} sizes="100vw" alt={s.alt} loading="lazy" decoding="async" />
              )}
              {reduced && <figcaption className="story__statement story__statement--static"><span className="eyebrow eyebrow--light">{s.label}</span>{s.statement}</figcaption>}
            </figure>
          ))}
        </div>
        <div className="story__overlay">
          <div className="story__head">
            <p className="eyebrow eyebrow--light">The experience · concept renders</p>
            <h2 id="story-title" className="story__title">A day at Villa Solenne</h2>
          </div>
          {!reduced && (
            <div className="story__statements">
              {story.map((s) => (
                <p className="story__statement" key={s.id}>
                  <span className="eyebrow eyebrow--light">{s.label}</span>
                  {s.statement}
                </p>
              ))}
            </div>
          )}
          {!reduced && (
            <ol className="story__progress" aria-hidden="true">
              {story.map((s, i) => (
                <li key={s.id} className={i === active ? 'is-active' : ''}>{s.label}</li>
              ))}
            </ol>
          )}
          <p className="media-label story__label">Concept renders · demonstration content</p>
        </div>
      </div>
      {!reduced && <a className="skip-inline" href="#lifestyle">Skip the sequence</a>}
    </section>
  );
}
