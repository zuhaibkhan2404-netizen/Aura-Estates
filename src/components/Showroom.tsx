import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Residence } from '../data/properties';
import { m2ToSqft } from '../data/properties';
import { photoSrcSet, photoUrl } from '../lib/images';
import { gsap, useReducedMotion } from '../lib/motion';
import { countUp, popText } from '../lib/reveal';
import type { GalleryScene } from '../three/GalleryScene';
import Split from './Split';

export interface ShowroomHandle { back: () => void }

interface Props {
  residences: Residence[];
  selected: number;
  onSelect: (i: number) => void;
  onBook: (residenceId: string) => void;
  onViewDetails: () => void;
}

type Mode = 'collection' | 'detail';
type Render = 'loading' | 'live' | 'fallback';
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The collection: a WebGL arc of real house photographs. Every label, control and fact
 * is HTML layered over the canvas; the canvas itself is decorative (aria-hidden).
 */
const Showroom = forwardRef<ShowroomHandle, Props>(function Showroom({ residences, selected, onSelect, onBook, onViewDetails }, ref) {
  const stageRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GalleryScene | null>(null);
  const exploreBtn = useRef<HTMLButtonElement>(null);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const [mode, setMode] = useState<Mode>('collection');
  const [render, setRender] = useState<Render>('loading');
  const reduced = useReducedMotion();
  const selRef = useRef(selected);
  selRef.current = selected;
  const exploreRef = useRef<() => void>(() => {});
  const r = residences[selected];
  const count = residences.length;

  /* ---------- create the WebGL gallery lazily ---------- */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cancelled = false;
    let visObs: IntersectionObserver | null = null;
    const start = async () => {
      try {
        const mod = await import('../three/GalleryScene');
        if (cancelled) return;
        if (!mod.webglAvailable()) throw new Error('WebGL unavailable');
        const nav = navigator as Navigator & { deviceMemory?: number };
        const scene = new mod.GalleryScene(el, {
          items: residences.map((res) => ({ photo: res.photos[0] })),
          initialIndex: selRef.current,
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          quality: (nav.hardwareConcurrency ?? 4) <= 4 || (nav.deviceMemory ?? 8) <= 4 ? 'low' : 'high',
          onSelect: (i) => onSelect(i),
          onExploreRequest: () => exploreRef.current(),
          onFirstFrame: () => !cancelled && setRender('live'),
          onContextLost: () => { setRender('fallback'); sceneRef.current?.dispose(); sceneRef.current = null; },
        });
        sceneRef.current = scene;
        visObs = new IntersectionObserver(([e]) => {
          scene.setVisible(e.isIntersecting);
          if (e.intersectionRatio > 0.2) scene.intro();
        }, { threshold: [0, 0.25] });
        visObs.observe(el);
      } catch (err) {
        console.warn('[AUREL] WebGL gallery unavailable, using image fallback.', err);
        if (!cancelled) setRender('fallback');
      }
    };
    const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) { near.disconnect(); start(); } }, { rootMargin: '700px 0px' });
    near.observe(el);
    return () => { cancelled = true; near.disconnect(); visObs?.disconnect(); sceneRef.current?.dispose(); sceneRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { sceneRef.current?.setSelection(selected); }, [selected]);
  useEffect(() => { sceneRef.current?.setReducedMotion(reduced); }, [reduced]);

  /* ---------- text pops on every selection change ---------- */
  useLayoutEffect(() => {
    const el = infoRef.current;
    if (!el) return;
    popText(el.querySelector('.gal__name'), { stagger: 0.028, duration: 1 });
    if (reduced) return;
    gsap.fromTo(el.querySelectorAll('.gal__fade'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, delay: 0.2, stagger: 0.06, ease: 'expo.out' });
    gsap.fromTo(el.querySelectorAll('.chip'), { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, delay: 0.35, stagger: 0.07, ease: 'back.out(2.4)' });
    const big = stageRef.current?.querySelector('.gal__bignum');
    if (big) gsap.fromTo(big, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out' });
  }, [selected, reduced]);

  /* ---------- transitions ---------- */
  const go = useCallback((i: number) => {
    if (mode !== 'collection') return;
    const next = (i + count) % count;
    if (next !== selected) onSelect(next);
  }, [mode, count, selected, onSelect]);

  const explore = useCallback(async () => {
    if (mode === 'detail') return;
    setMode('detail');
    stageRef.current?.parentElement?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    const p = panelRef.current;
    if (p && !reduced) {
      gsap.set(p.querySelectorAll('.split__item'), { yPercent: 115, opacity: 0 });
      gsap.set(p.querySelectorAll('.pnl-fade'), { y: 30, opacity: 0 });
    }
    await sceneRef.current?.expand();
    if (p) {
      popText(p.querySelector('.pnl__title'), { stagger: 0.03 });
      if (!reduced) gsap.to(p.querySelectorAll('.pnl-fade'), { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'expo.out' });
      p.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => countUp(n, Number(n.dataset.count)));
    }
    panelHeading.current?.focus({ preventScroll: true });
  }, [mode, reduced]);
  exploreRef.current = explore;

  const back = useCallback(async () => {
    setMode('collection');
    await sceneRef.current?.collapse();
    exploreBtn.current?.focus({ preventScroll: true });
  }, []);

  useImperativeHandle(ref, () => ({ back: () => { if (mode === 'detail') back(); } }), [mode, back]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (mode === 'detail') { if (e.key === 'Escape') { e.preventDefault(); back(); } return; }
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(selected + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(selected - 1); }
    if (e.key === 'Home') { e.preventDefault(); go(0); }
    if (e.key === 'End') { e.preventDefault(); go(count - 1); }
    if (e.key === 'Enter') { e.preventDefault(); explore(); }
  };

  /* ---------- custom "drag" cursor (desktop) ---------- */
  const onStageMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !cursorRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    gsap.to(cursorRef.current, { x: e.clientX - rect.left, y: e.clientY - rect.top, duration: 0.35, ease: 'power3.out' });
  };

  /* ---------- swipe for the image fallback ---------- */
  const swipe = useRef<{ x: number; id: number } | null>(null);
  const fallbackHandlers = render === 'fallback' ? {
    onPointerDown: (e: React.PointerEvent) => { swipe.current = { x: e.clientX, id: e.pointerId }; },
    onPointerUp: (e: React.PointerEvent) => {
      const s = swipe.current; swipe.current = null;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > 40) go(selected + (dx < 0 ? 1 : -1));
    },
  } : {};

  return (
    <section id="collection" className={`gal is-${mode} render-${render}`} aria-labelledby="collection-title">
      <div className="gal__head">
        <p className="eyebrow eyebrow--light" data-reveal>The collection · {pad(count)} residences</p>
        <Split as="h2" text="One house, then the next." className="gal__title" data-split="" />
        <p className="gal__hint" data-reveal>Drag, swipe or use ← → · click the photo to explore</p>
      </div>

      <div className="gal__wrap">
        <div
          ref={stageRef}
          className="gal__stage"
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label={`Residence gallery. ${r.name}, ${selected + 1} of ${count}. Use left and right arrow keys to browse, Enter to explore.`}
          onKeyDown={onKeyDown}
          onPointerMove={onStageMove}
          {...fallbackHandlers}
        >
          <span className="gal__bignum" aria-hidden="true">{pad(selected + 1)}</span>
          {render !== 'live' && (
            <div className="gal__fallback">
              {residences.map((res, i) => (
                <img
                  key={res.id}
                  className={i === selected ? 'is-active' : ''}
                  src={photoUrl(res.photos[0], 1600)}
                  srcSet={photoSrcSet(res.photos[0])}
                  sizes="(min-width: 900px) 62vw, 80vw"
                  alt={i === selected ? res.photos[0].alt : ''}
                  aria-hidden={i !== selected}
                  loading={i === selected ? 'eager' : 'lazy'}
                  onError={(e) => { const img = e.currentTarget; const f = res.photos[0].fallback; if (!img.src.endsWith(f)) { img.srcset = ''; img.src = f; } }}
                />
              ))}
            </div>
          )}
          <div className="gal__cursor" ref={cursorRef} aria-hidden="true"><span>Drag</span></div>
        </div>

        {/* Info + controls */}
        <div className="gal__info" ref={infoRef} inert={mode === 'detail' ? true : undefined}>
          <div className="gal__meta" aria-live="polite" aria-atomic="true">
            <p className="gal__counter gal__fade"><span>{pad(selected + 1)}</span> / {pad(count)} · {r.type}</p>
            <Split key={r.id} as="h3" text={r.name} by="char" className="gal__name" />
            <p className="gal__loc gal__fade">{r.location}</p>
            <p className="gal__desc gal__fade">{r.descriptor}</p>
            <ul className="chips" aria-label="Key facts">
              <li className="chip">{r.bedrooms} bedrooms</li>
              <li className="chip">{r.bathrooms} bathrooms</li>
              <li className="chip">{r.interiorAreaM2.toLocaleString('en-GB')} m²</li>
            </ul>
          </div>
          <div className="gal__controls">
            <div className="gal__arrows">
              <button className="icon-btn icon-btn--dark" onClick={() => go(selected - 1)} aria-label="Previous residence">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <button className="icon-btn icon-btn--dark" onClick={() => go(selected + 1)} aria-label="Next residence">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <button ref={exploreBtn} className="btn btn--light" onClick={explore}>Explore Residence</button>
          </div>
          <ol className="gal__tabs" aria-label="Choose a residence">
            {residences.map((res, i) => (
              <li key={res.id}>
                <button aria-current={i === selected ? 'true' : undefined} onClick={() => go(i)}>
                  <span className="gal__tab-bar" aria-hidden="true" />
                  <span className="gal__tab-index">{pad(i + 1)}</span> {res.name}
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* Detail panel over the full-screen photo */}
        <div className="gal__panel" ref={panelRef} inert={mode !== 'detail' ? true : undefined} aria-hidden={mode !== 'detail'}>
          <div className="pnl">
            <button className="text-btn text-btn--light back-btn pnl-fade" onClick={back}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
              Back to Collection
            </button>
            <p className="eyebrow eyebrow--light pnl-fade">{r.type} · {r.location}</p>
            <h3 ref={panelHeading} tabIndex={-1} className="pnl__heading">
              <Split key={`p-${r.id}`} text={r.name} by="char" className="pnl__title" />
            </h3>
            <p className="pnl__desc pnl-fade">{r.description[0]}</p>
            <dl className="pnl__facts pnl-fade">
              <div><dt>Bedrooms</dt><dd data-count={r.bedrooms}>{r.bedrooms}</dd></div>
              <div><dt>Bathrooms</dt><dd data-count={r.bathrooms}>{r.bathrooms}</dd></div>
              <div><dt>Interior m²</dt><dd><span data-count={r.interiorAreaM2}>{r.interiorAreaM2}</span><small> · {m2ToSqft(r.interiorAreaM2).toLocaleString('en-GB')} sq ft</small></dd></div>
            </dl>
            <p className="verify-badge verify-badge--light pnl-fade">Sample data — not verified · photo is illustrative</p>
            <div className="pnl__actions pnl-fade">
              <button className="btn btn--light" onClick={() => onBook(r.id)}>Book a Private Viewing</button>
              <button className="btn btn--ghost" onClick={onViewDetails}>Gallery, plans &amp; amenities</button>
            </div>
          </div>
          <p className="pnl__credit">Photo: {r.photos[0].credit?.name} / Unsplash</p>
        </div>
      </div>
    </section>
  );
});

export default Showroom;
