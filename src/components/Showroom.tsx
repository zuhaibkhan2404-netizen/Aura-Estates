import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent } from 'react';
import type { Residence } from '../data/properties';
import { hero, m2ToSqft } from '../data/properties';
import { useReducedMotion } from '../lib/motion';
import type { ShowroomScene } from '../three/ShowroomScene';
import { small } from './SmartImage';

export interface ShowroomHandle {
  back: () => void;
}

interface Props {
  residences: Residence[];
  selected: number;
  onSelect: (i: number) => void;
  onBook: (residenceId: string) => void;
  onViewDetails: () => void;
}

type Mode = 'collection' | 'detail';
type RenderState = 'poster' | 'live' | 'fallback';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Interactive collection. One WebGL canvas (created lazily when the section approaches
 * the viewport); every control and every piece of text is HTML outside the canvas.
 */
const Showroom = forwardRef<ShowroomHandle, Props>(function Showroom({ residences, selected, onSelect, onBook, onViewDetails }, ref) {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ShowroomScene | null>(null);
  const exploreBtn = useRef<HTMLButtonElement>(null);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const [mode, setMode] = useState<Mode>('collection');
  const [render, setRender] = useState<RenderState>('poster');
  const [assetNote, setAssetNote] = useState('');
  const reduced = useReducedMotion();
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const r = residences[selected];
  const count = residences.length;

  /* ---------- lazy-create the WebGL scene when the stage nears the viewport ---------- */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let cancelled = false;
    let visibilityObs: IntersectionObserver | null = null;

    const start = async () => {
      try {
        const mod = await import('../three/ShowroomScene');
        if (cancelled) return;
        if (!mod.webglAvailable()) throw new Error('WebGL unavailable');
        const scene = new mod.ShowroomScene(el, {
          residences,
          initialIndex: selectedRef.current,
          quality: mod.detectQuality(),
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          finePointer: window.matchMedia('(pointer: fine)').matches,
          onFirstFrame: () => !cancelled && setRender('live'),
          onDragSelect: (i) => onSelect(i),
          onAssetIssue: (msg) => setAssetNote(msg),
          onContextLost: () => { setRender('fallback'); sceneRef.current?.dispose(); sceneRef.current = null; },
        });
        sceneRef.current = scene;
        visibilityObs = new IntersectionObserver(([entry]) => scene.setVisible(entry.isIntersecting), { threshold: 0 });
        visibilityObs.observe(el);
      } catch (err) {
        console.warn('[AUREL] 3D showroom unavailable, using image fallback.', err);
        if (!cancelled) setRender('fallback');
      }
    };

    const nearObs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          nearObs.disconnect();
          start();
        }
      },
      { rootMargin: '600px 0px' },
    );
    nearObs.observe(el);
    return () => {
      cancelled = true;
      nearObs.disconnect();
      visibilityObs?.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // The scene is created once; selection changes are pushed imperatively below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => sceneRef.current?.setSelection(selected), [selected]);
  useEffect(() => sceneRef.current?.setReducedMotion(reduced), [reduced]);

  /* ---------- selection & transitions ---------- */
  const go = useCallback(
    (i: number) => {
      if (mode !== 'collection') return;
      const next = Math.max(0, Math.min(count - 1, i));
      if (next !== selected) onSelect(next);
    },
    [mode, count, selected, onSelect],
  );

  const explore = useCallback(async () => {
    setMode('detail');
    // Bring the whole stage into view so the camera move and the detail panel are seen together.
    stageRef.current?.parentElement?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    await sceneRef.current?.focus(selected);
    panelHeading.current?.focus({ preventScroll: true });
  }, [selected, reduced]);

  const back = useCallback(async () => {
    setMode('collection');
    await sceneRef.current?.unfocus();
    exploreBtn.current?.focus({ preventScroll: true });
  }, []);

  useImperativeHandle(ref, () => ({ back: () => { if (mode === 'detail') back(); } }), [mode, back]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (mode === 'detail') {
      if (e.key === 'Escape') { e.preventDefault(); back(); }
      return;
    }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(selected + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(selected - 1); }
    if (e.key === 'Home') { e.preventDefault(); go(0); }
    if (e.key === 'End') { e.preventDefault(); go(count - 1); }
    if (e.key === 'Enter') { e.preventDefault(); explore(); }
  };

  /* ---------- swipe for the image fallback ---------- */
  const swipe = useRef<{ x: number; id: number } | null>(null);
  const fallbackPointer = {
    onPointerDown: (e: React.PointerEvent) => { swipe.current = { x: e.clientX, id: e.pointerId }; },
    onPointerUp: (e: React.PointerEvent) => {
      const s = swipe.current;
      swipe.current = null;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > 40) go(selected + (dx < 0 ? 1 : -1));
    },
  };

  return (
    <section id="collection" className={`showroom is-${mode} render-${render}`} aria-labelledby="collection-title">
      <div className="section-head showroom__head">
    <div>
      <p className="eyebrow">The collection</p>
      <h2 id="collection-title" className="section-title">Three residences, presented as objects.</h2>
    </div>
    <p className="section-head__note">
      Drag or swipe the scene, use the arrows, or focus the scene and press ← →.
      <span className="muted"> Models are conceptual massing studies, not final designs.</span>
    </p>
  </div>

      <div className="showroom__stage-wrap">
        <div
          ref={stageRef}
          className="showroom__stage"
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label={`Residence collection. ${r.name}, ${selected + 1} of ${count}. Use left and right arrow keys to browse, Enter to explore.`}
          onKeyDown={onKeyDown}
          {...(render === 'fallback' ? fallbackPointer : {})}
        >
          {/* Poster shown instantly; fades once the first WebGL frame is drawn. */}
          <img
            className="showroom__poster"
            src={hero.collectionPoster}
            srcSet={`${small(hero.collectionPoster)} 900w, ${hero.collectionPoster} 2000w`}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            decoding="async"
          />
          {render === 'fallback' && (
            <div className="showroom__fallback">
              {residences.map((res, i) => (
                <img
                  key={res.id}
                  src={res.poster}
                  srcSet={`${small(res.poster)} 900w, ${res.poster} 1600w`}
                  sizes="100vw"
                  alt={i === selected ? res.gallery[0].alt : ''}
                  aria-hidden={i !== selected}
                  className={i === selected ? 'is-active' : ''}
                  loading="lazy"
                />
              ))}
            </div>
          )}
          <p className="media-label showroom__label">
            {render === 'fallback' ? 'Concept render — 3D view unavailable on this device' : 'Conceptual 3D model · demonstration'}
          </p>
          {assetNote && <p className="media-label showroom__asset-note">{assetNote}</p>}
        </div>

        {/* Collection info + controls */}
        <div className="showroom__info" aria-hidden={mode === 'detail'} inert={mode === 'detail' ? true : undefined}>
          <div className="showroom__meta" aria-live="polite" aria-atomic="true">
            <p className="counter"><span>{pad(selected + 1)}</span> / {pad(count)}</p>
            <h3 className="showroom__name">{r.name}</h3>
            <p className="showroom__location">{r.location}</p>
            <p className="showroom__descriptor">{r.descriptor}</p>
          </div>
          <div className="showroom__controls">
            <div className="showroom__arrows">
              <button className="icon-btn" onClick={() => go(selected - 1)} disabled={selected === 0} aria-label="Previous residence">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <button className="icon-btn" onClick={() => go(selected + 1)} disabled={selected === count - 1} aria-label="Next residence">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <button ref={exploreBtn} className="btn btn--dark" onClick={explore}>
              Explore Residence
            </button>
          </div>
          <ol className="showroom__tabs" aria-label="Choose a residence">
            {residences.map((res, i) => (
              <li key={res.id}>
                <button aria-current={i === selected ? 'true' : undefined} onClick={() => go(i)}>
                  <span className="tab-index">{pad(i + 1)}</span> {res.name}
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* Detail panel revealed after the camera move */}
        <aside className="showroom__panel" aria-hidden={mode !== 'detail'} inert={mode !== 'detail' ? true : undefined} aria-labelledby="panel-title">
          <button className="text-btn back-btn" onClick={back}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            Back to Collection
          </button>
          <p className="eyebrow">{r.type} · {r.location}</p>
          <h3 id="panel-title" ref={panelHeading} tabIndex={-1} className="panel__title">{r.name}</h3>
          <dl className="facts facts--compact">
            <div><dt>Bedrooms</dt><dd>{r.bedrooms}</dd></div>
            <div><dt>Bathrooms</dt><dd>{r.bathrooms}</dd></div>
            <div><dt>Interior</dt><dd>{r.interiorAreaM2.toLocaleString('en-GB')} m² <span className="muted">· {m2ToSqft(r.interiorAreaM2).toLocaleString('en-GB')} sq ft</span></dd></div>
            <div><dt>Price</dt><dd>{r.priceLabel}</dd></div>
          </dl>
          <p className={`verify-badge${r.verified ? ' is-verified' : ''}`}>
            {r.verified ? 'Details verified' : 'Sample data — not verified'}
          </p>
          <div className="panel__actions">
            <button className="btn btn--dark" onClick={() => onBook(r.id)}>Book a Private Viewing</button>
            <button className="btn btn--outline" onClick={onViewDetails}>Gallery, plans &amp; amenities</button>
          </div>
        </aside>
      </div>
    </section>
  );
});

export default Showroom;
