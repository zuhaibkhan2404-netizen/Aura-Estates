import { useEffect, useRef, useState } from 'react';
import { story } from '../data/properties';
import { photoSrcSet, photoUrl } from '../lib/images';
import { ScrollTrigger, gsap, useReducedMotion } from '../lib/motion';
import Split from './Split';

/**
 * Scroll-linked sequence (arrival → exterior → living → terrace). Each new scene opens
 * through an expanding circular mask with a push-in; statements pop word by word.
 * A CSS sticky frame is used (no JS pinning); afterwards the page scrolls normally.
 * Reduced motion: stacked, static scenes.
 */
export default function Story() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !root.current) return;
    const el = root.current;
    const ctx = gsap.context(() => {
      const scenes = gsap.utils.toArray<HTMLElement>('.story__scene');
      const lines = gsap.utils.toArray<HTMLElement>('.story__statement');
      gsap.set(scenes.slice(1), { clipPath: 'circle(0% at 50% 55%)' });
      lines.forEach((l, i) => gsap.set(l.querySelectorAll('.split__item'), { yPercent: i === 0 ? 0 : 115, opacity: i === 0 ? 1 : 0 }));
      gsap.set(lines.slice(1), { autoAlpha: 0 });
      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      scenes.forEach((s, i) => {
        tl.fromTo(s.querySelector('img'), { scale: 1.25 }, { scale: 1.02, duration: 1 }, i);
        if (i > 0) {
          tl.to(s, { clipPath: 'circle(80% at 50% 55%)', duration: 0.55, ease: 'power2.inOut' }, i - 0.3)
            .to(lines[i - 1].querySelectorAll('.split__item'), { yPercent: -115, opacity: 0, duration: 0.25, stagger: 0.01 }, i - 0.3)
            .to(lines[i - 1], { autoAlpha: 0, duration: 0.05 }, i - 0.06)
            .to(lines[i], { autoAlpha: 1, duration: 0.05 }, i - 0.08)
            .to(lines[i].querySelectorAll('.split__item'), { yPercent: 0, opacity: 1, duration: 0.3, stagger: 0.02, ease: 'power3.out' }, i - 0.05);
        }
      });
      ScrollTrigger.create({
        trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.7, animation: tl,
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
      style={reduced ? undefined : { height: `${story.length * 70 + 100}svh` }}
      aria-labelledby="story-title"
    >
      <div className="story__frame">
        <div className="story__media">
          {story.map((s) => (
            <figure className="story__scene" key={s.id}>
              {s.video ? (
                <video src={s.video} poster={photoUrl(s.photo, 2000)} muted playsInline loop preload="none" aria-label={s.photo.alt} />
              ) : (
                <img
                  src={photoUrl(s.photo, 2000)}
                  srcSet={photoSrcSet(s.photo)}
                  sizes="100vw"
                  alt={s.photo.alt}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { const img = e.currentTarget; if (!img.src.endsWith(s.photo.fallback)) { img.srcset = ''; img.src = s.photo.fallback; } }}
                />
              )}
              {reduced && <figcaption className="story__statement story__statement--static"><span className="eyebrow eyebrow--light">{s.label}</span>{s.statement}</figcaption>}
            </figure>
          ))}
        </div>
        <div className="story__overlay">
          <div className="story__head">
            <p className="eyebrow eyebrow--light">The experience · illustrative photography</p>
            <h2 id="story-title" className="story__title">A day in the collection</h2>
          </div>
          {!reduced && (
            <div className="story__statements">
              {story.map((s) => (
                <div className="story__statement" key={s.id}>
                  <span className="eyebrow eyebrow--light">{s.label}</span>
                  <Split as="p" text={s.statement} />
                </div>
              ))}
            </div>
          )}
          {!reduced && (
            <ol className="story__progress" aria-hidden="true">
              {story.map((s, i) => <li key={s.id} className={i === active ? 'is-active' : i < active ? 'is-done' : ''}>{s.label}</li>)}
            </ol>
          )}
          <p className="story__credit">Photo: {story[active].photo.credit?.name} / Unsplash</p>
        </div>
      </div>
      {!reduced && <a className="skip-inline" href="#lifestyle">Skip the sequence</a>}
    </section>
  );
}
