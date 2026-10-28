import { useEffect, useState } from 'react';
import type { Residence } from '../data/properties';
import { m2ToSqft } from '../data/properties';
import SmartImage, { small } from './SmartImage';
import FloorPlanPlaceholder from './FloorPlanPlaceholder';

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
  useEffect(() => setImg(0), [r.id]);
  const current = r.gallery[img];

  return (
    <section id="residence" className="residence" aria-labelledby="residence-title">
      <div className="container">
        <div className="residence__head">
          <div>
            <p className="eyebrow">Selected residence · {String(index + 1).padStart(2, '0')} of {String(total).padStart(2, '0')}</p>
            <h2 id="residence-title" className="section-title" tabIndex={-1}>{r.name}</h2>
            <p className="residence__sub">{r.type} · {r.location}</p>
          </div>
          <button className="text-btn back-btn" onClick={onBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            Back to Collection
          </button>
        </div>

        {/* Gallery */}
        <figure className="gallery" key={r.id}>
          <div className="gallery__main">
            <SmartImage key={current.src} src={current.src} srcSmall={small(current.src)} alt={current.alt} sizes="(min-width: 1000px) 70vw, 100vw" />
            <div className="gallery__nav">
              <button className="icon-btn icon-btn--light" aria-label="Previous image" onClick={() => setImg((img - 1 + r.gallery.length) % r.gallery.length)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <button className="icon-btn icon-btn--light" aria-label="Next image" onClick={() => setImg((img + 1) % r.gallery.length)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
          <figcaption className="gallery__caption" aria-live="polite">
            <span>{current.caption}</span>
            <span className="muted">{img + 1} / {r.gallery.length}</span>
          </figcaption>
          <ul className="gallery__thumbs" aria-label="Gallery images">
            {r.gallery.map((g, i) => (
              <li key={g.src}>
                <button aria-label={`Show image ${i + 1}: ${g.caption}`} aria-current={i === img ? 'true' : undefined} onClick={() => setImg(i)}>
                  <SmartImage src={small(g.src)} alt="" />
                </button>
              </li>
            ))}
          </ul>
        </figure>

        <div className="residence__body">
          <div className="residence__text">
            {r.description.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
            <h3 className="minor-title">Amenities</h3>
            <ul className="amenities">
              {r.amenities.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>

          <aside className="residence__facts" aria-label="Key facts">
            <dl className="facts">
              <div><dt>Bedrooms</dt><dd>{r.bedrooms}</dd></div>
              <div><dt>Bathrooms</dt><dd>{r.bathrooms}</dd></div>
              <div><dt>Interior area</dt><dd>{fmt(r.interiorAreaM2)} m²<span className="muted"> · {fmt(m2ToSqft(r.interiorAreaM2))} sq ft</span></dd></div>
              {r.outdoorAreaM2 && (
                <div><dt>{r.outdoorAreaLabel ?? 'Outdoor'}</dt><dd>{fmt(r.outdoorAreaM2)} m²<span className="muted"> · {fmt(m2ToSqft(r.outdoorAreaM2))} sq ft</span></dd></div>
              )}
              <div><dt>Price</dt><dd>{r.priceLabel}</dd></div>
            </dl>
            <p className={`verify-badge${r.verified ? ' is-verified' : ''}`}>
              {r.verified ? 'Details verified' : 'Sample data — not verified. Figures are for demonstration only.'}
            </p>
            <button className="btn btn--dark btn--block" onClick={() => onBook(r.id)}>
              Book a Private Viewing
            </button>
          </aside>
        </div>

        <div className="floorplan">
          <div className="floorplan__head">
            <h3 className="minor-title">Floor plan</h3>
            <p className="muted">{r.floorPlan.note}</p>
          </div>
          {r.floorPlan.src ? (
            <SmartImage src={r.floorPlan.src} alt={`Floor plan of ${r.name}`} />
          ) : (
            <FloorPlanPlaceholder kind={r.model.procedural} name={r.name} />
          )}
        </div>
      </div>
    </section>
  );
}
