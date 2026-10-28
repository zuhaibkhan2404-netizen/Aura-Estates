import { useCallback, useEffect, useRef, useState } from 'react';
import { hero, residences } from '../data/properties';
import { photoSrcSet, photoUrl } from '../lib/images';
import { gsap, useReducedMotion } from '../lib/motion';
import { popText } from '../lib/reveal';
import Split from './Split';

/**
 * Cinematic hero: real houses replace each other with a clip-path wipe and a slow push-in,
 * the headline pops in word by word. Autoplay can be paused (and is off for reduced motion).
 */
export default function Hero({ onExplore, onBook }: { onExplore: () => void; onBook: () => void }) {
  const root = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const reduced = useReducedMotion();
  const prev = useRef(0);
  const slides = residences.map((r) => ({ r, photo: r.photos[0] }));
  const running = playing && !hovered && !reduced;

  // Intro: headline pop + first image push-in
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    popText(el.querySelector('.hero__title'), { delay: 0.15, stagger: 0.07, duration: 1.2 });
    if (reduced) return;
    gsap.fromTo(el.querySelectorAll('.hero__fade'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, delay: 0.75, stagger: 0.1, ease: 'expo.out' });
    gsap.fromTo(el.querySelector('.hero__slide.is-active img'), { scale: 1.35 }, { scale: 1.08, duration: 2.6, ease: 'expo.out' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slide transition
  useEffect(() => {
    const el = root.current;
    if (!el || prev.current === index) return;
    const slidesEl = el.querySelectorAll<HTMLElement>('.hero__slide');
    const next = slidesEl[index];
    const old = slidesEl[prev.current];
    const dir = index > prev.current ? 1 : -1;
    prev.current = index;
    popText(el.querySelector('.hero__caption-name'), { stagger: 0.03, duration: 0.9 });
    if (reduced) return;
    slidesEl.forEach((s) => s !== next && s !== old && gsap.set(s, { zIndex: 0 }));
    gsap.set(next, { zIndex: 2 });
    gsap.set(old, { zIndex: 1, clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.fromTo(next, { clipPath: dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut',
    });
    gsap.fromTo(next.querySelector('img'), { scale: 1.4, xPercent: dir * 6 }, { scale: 1.08, xPercent: 0, duration: 2.4, ease: 'expo.out' });
    gsap.to(old.querySelector('img'), { scale: 1.0, xPercent: -dir * 8, duration: 1.5, ease: 'expo.inOut' });
  }, [index, reduced]);

  // Autoplay
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), hero.slideSeconds * 1000);
    return () => window.clearTimeout(t);
  }, [running, index, slides.length]);

  // Subtle pointer parallax
  const onMove = useCallback((e: React.PointerEvent) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    gsap.to(root.current!.querySelector('.hero__media'), { x: -x * 24, y: -y * 16, duration: 1.2, ease: 'power3.out' });
  }, [reduced]);

  const current = slides[index];

  return (
    <section
      className="hero"
      ref={root}
      aria-labelledby="hero-title"
      aria-roledescription="carousel"
      onPointerMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="hero__media">
        {slides.map(({ r, photo }, i) => (
          <div key={r.id} className={`hero__slide${i === index ? ' is-active' : ''}`} aria-hidden={i !== index}>
            <img
              src={photoUrl(photo, 2000)}
              srcSet={photoSrcSet(photo)}
              sizes="100vw"
              alt={i === index ? photo.alt : ''}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : 'auto'}
              style={photo.focus ? { objectPosition: photo.focus } : undefined}
              onError={(e) => { const img = e.currentTarget; if (!img.src.endsWith(photo.fallback)) { img.srcset = ''; img.src = photo.fallback; } }}
            />
          </div>
        ))}
      </div>
      <div className="hero__shade" aria-hidden="true" />

      <div className="hero__content">
        <p className="eyebrow eyebrow--light hero__fade">AUREL Estates · Private collection</p>
        <Split as="h1" text={hero.headline} className="hero__title" />
        <p className="hero__intro hero__fade">{hero.intro}</p>
        <div className="hero__actions hero__fade">
          <button className="btn btn--light" onClick={onBook}>Book a Private Viewing</button>
          <button className="btn btn--ghost" onClick={onExplore}>Explore Residences</button>
        </div>
      </div>

      <div className="hero__bar">
        <div className="hero__caption" aria-live="polite">
          <span className="hero__caption-index">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <Split key={current.r.id} text={current.r.name} by="char" className="hero__caption-name" />
            <span className="hero__caption-loc">{current.r.location}</span>
          </div>
        </div>
        <div className="hero__progress" role="tablist" aria-label="Choose a residence">
          {slides.map(({ r }, i) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${r.name}`}
              className={i === index ? 'is-active' : ''}
              onClick={() => setIndex(i)}
            >
              <span className="hero__progress-fill" style={{ animationDuration: `${hero.slideSeconds}s`, animationPlayState: running ? 'running' : 'paused' }} key={`${i}-${index}`} />
            </button>
          ))}
          {!reduced && (
            <button className="hero__pause" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>
              {playing ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" /></svg>
              )}
            </button>
          )}
        </div>
        <p className="hero__credit">Photo: {current.photo.credit?.name ?? 'AUREL'} / Unsplash · not the listed property</p>
      </div>
    </section>
  );
}
