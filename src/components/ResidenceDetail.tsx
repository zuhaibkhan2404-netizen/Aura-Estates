import { useEffect, useRef, useState } from 'react';
import type { Residence } from '../data/properties';
import { m2ToSqft } from '../data/properties';
import { photoSrcSet, photoUrl } from '../lib/images';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../lib/motion';
import { countUp, popText } from '../lib/reveal';
import FloorPlanPlaceholder from './FloorPlanPlaceholder';
import Split from './Split';

interface Props {
  residence: Residence;
  index: number;
  total: number;
  onBook: (id: string) => void;
  onBack: () => void;
}

const fmt = (n: number) => n.toLocaleString('en-GB');

export default function ResidenceDetail({ residence: r, index, total, onBook, onBack }: Props) {
  const [img, setImg] = useState(0);
  const root = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const dir = useRef(1);
  useEffect(() => setImg(0), [r.id]);
  const current = r.photos[img];

  // Re-run pops and counters whenever the residence changes (once the section is on screen).
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const run = () => {
      popText(el.querySelector('.res__title'), { stagger: 0.03 });
      el.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => countUp(n, Number(n.dataset.count)));
      if (!prefersReducedMotion()) {
        gsap.fromTo(el.querySelectorAll('.amenities li'), { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'expo.out' });
      }
    };
    const st = ScrollTrigger.create({ trigger: el, start: 'top 75%', once: true, onEnter: run });
    if (st.progress > 0 || el.getBoundingClientRect().top < window.innerHeight * 0.75) run();
    return () => st.kill();
  }, [r.id]);

  // Gallery image change: directional clip wipe + zoom
  useEffect(() => {
    const m = mainRef.current;
    if (!m || prefersReducedMotion()) return;
    const imgEl = m.querySelector('img');
    if (!imgEl) return;
    gsap.fromTo(m.querySelector('.res__frame'), { clipPath: dir.current > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' });
    gsap.fromTo(imgEl, { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'expo.out' });
  }, [img, r.id]);

  const show = (i: number) => { dir.current = i >= img ? 1 : -1; setImg((i + r.photos.length) % r.photos.length); };

  return (
    <section id="residence" className="residence" ref={root} aria-labelledby="residence-title">
      <div className="container">
        <div className="residence__head">
          <div>
            <p className="eyebrow">Selected residence · {String(index + 1).padStart(2, '0')} of {String(total).padStart(2, '0')}</p>
            <h2 id="residence-title" className="section-title" tabIndex={-1}>
              <Split key={r.id} text={r.name} by="char" className="res__title" />
            </h2>
            <p className="residence__sub">{r.type} · {r.location}</p>
          </div>
          <button className="text-btn back-btn" onClick={onBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            Back to Collection
          </button>
        </div>

        <figure className="gallery">
          <div className="gallery__main" ref={mainRef}>
            <div className="res__frame" key={`${r.id}-${img}`}>
              <img
                src={photoUrl(current, 1600)}
                srcSet={photoSrcSet(current)}
                sizes="(min-width: 1000px) 80vw, 100vw"
                alt={current.alt}
                onError={(e) => { const el = e.currentTarget; if (!el.src.endsWith(current.fallback)) { el.srcset = ''; el.src = current.fallback; } }}
              />
            </div>
            <div className="gallery__nav">
              <button className="icon-btn icon-btn--light" aria-label="Previous image" onClick={() => show(img - 1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <button className="icon-btn icon-btn--light" aria-label="Next image" onClick={() => show(img + 1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
          <figcaption className="gallery__caption" aria-live="polite">
            <span>{current.caption} <span className="muted">· illustrative photo{current.credit ? <> by <a href={current.credit.url} target="_blank" rel="noopener noreferrer">{current.credit.name}</a> on Unsplash</> : null}</span></span>
            <span className="muted">{img + 1} / {r.photos.length}</span>
          </figcaption>
          <ul className="gallery__thumbs" aria-label="Gallery images">
            {r.photos.map((g, i) => (
              <li key={g.id + i}>
                <button aria-label={`Show image ${i + 1}: ${g.caption}`} aria-current={i === img ? 'true' : undefined} onClick={() => show(i)}>
                  <img src={photoUrl(g, 400)} alt="" loading="lazy" onError={(e) => { e.currentTarget.src = g.fallback.replace('.jpg', '-sm.jpg'); }} />
                </button>
              </li>
            ))}
          </ul>
        </figure>

        <div className="residence__body">
          <div className="residence__text">
            {r.description.map((p) => <p key={p.slice(0, 24)} data-reveal>{p}</p>)}
            <h3 className="minor-title" data-reveal>Amenities</h3>
            <ul className="amenities">
              {r.amenities.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>

          <aside className="residence__facts" aria-label="Key facts">
            <dl className="facts">
              <div><dt>Bedrooms</dt><dd data-count={r.bedrooms}>{r.bedrooms}</dd></div>
              <div><dt>Bathrooms</dt><dd data-count={r.bathrooms}>{r.bathrooms}</dd></div>
              <div><dt>Interior area</dt><dd><span data-count={r.interiorAreaM2}>{fmt(r.interiorAreaM2)}</span> m²<span className="muted"> · {fmt(m2ToSqft(r.interiorAreaM2))} sq ft</span></dd></div>
              {r.outdoorAreaM2 && (
                <div><dt>{r.outdoorAreaLabel ?? 'Outdoor'}</dt><dd><span data-count={r.outdoorAreaM2}>{fmt(r.outdoorAreaM2)}</span> m²<span className="muted"> · {fmt(m2ToSqft(r.outdoorAreaM2))} sq ft</span></dd></div>
              )}
              <div><dt>Price</dt><dd>{r.priceLabel}</dd></div>
            </dl>
            <p className={`verify-badge${r.verified ? ' is-verified' : ''}`}>
              {r.verified ? 'Details verified' : 'Sample data — not verified. Figures are for demonstration only.'}
            </p>
            <button className="btn btn--dark btn--block" onClick={() => onBook(r.id)}>Book a Private Viewing</button>
          </aside>
        </div>

        <div className="floorplan" data-reveal>
          <div className="floorplan__head">
            <h3 className="minor-title">Floor plan</h3>
            <p className="muted">{r.floorPlan.note}</p>
          </div>
          {r.floorPlan.src ? (
            <img src={r.floorPlan.src} alt={`Floor plan of ${r.name}`} />
          ) : (
            <FloorPlanPlaceholder kind={r.floorPlan.kind} name={r.name} />
          )}
        </div>
      </div>
    </section>
  );
}
