import { locations, residences } from '../data/properties';
import Split from './Split';

export default function Location({ onSelectResidence }: { onSelectResidence: (i: number) => void }) {
  return (
    <section id="location" className="location" aria-labelledby="location-title">
      <div className="container location__grid">
        <div className="location__text">
          <p className="eyebrow" data-reveal>Locations</p>
          <h2 id="location-title" className="section-title section-title--md">
            <Split text={locations.title} data-split="" />
          </h2>
          <p data-reveal>{locations.body}</p>
          <ul className="places">
            {locations.places.map((p) => {
              const i = residences.findIndex((r) => r.id === p.residenceId);
              const r = residences[i];
              if (!r) return null;
              return (
                <li key={p.residenceId} data-reveal>
                  <p className="places__setting">{p.setting}</p>
                  <button className="places__name" onClick={() => onSelectResidence(i)}>
                    {r.name} <span aria-hidden="true">→</span>
                  </button>
                  <p className="muted">{r.location}. {p.note}</p>
                </li>
              );
            })}
          </ul>
        </div>
        <figure className="map-card" data-reveal>
          {locations.mapEmbedUrl ? (
            <iframe src={locations.mapEmbedUrl} title="Map of residence locations" loading="lazy" />
          ) : (
            <svg viewBox="0 0 600 340" role="img" aria-label="Illustrative placeholder showing five fictional settings. Not a map.">
              <rect width="600" height="340" className="map-bg" />
              <path className="map-contour" d="M0 90 C120 60 200 140 300 110 S480 40 600 80" />
              <path className="map-contour" d="M0 140 C140 110 220 190 320 160 S500 100 600 130" />
              <path className="map-contour" d="M0 190 C160 170 260 230 360 200 S520 160 600 185" />
              <path className="map-water" d="M380 70 C430 50 520 70 520 120 C520 170 440 180 400 160 C360 140 340 90 380 70Z" />
              <path className="map-water" d="M0 280 C120 260 240 270 330 290 C420 310 480 300 600 320 L600 340 L0 340Z" />
              {locations.places.map((p, n) => {
                const [x, y] = p.xy;
                const r = residences.find((rr) => rr.id === p.residenceId);
                const right = x > 400;
                return (
                  <g key={p.residenceId} className="map-marker" style={{ animationDelay: `${n * 0.4}s` }}>
                    <circle cx={x} cy={y} r="14" className="map-marker__ring" style={{ animationDelay: `${n * 0.4}s` }} />
                    <circle cx={x} cy={y} r="6" />
                    <text x={right ? x - 18 : x + 18} y={y + 5} textAnchor={right ? 'end' : 'start'}>{r?.name}</text>
                  </g>
                );
              })}
            </svg>
          )}
          <figcaption className="muted">Illustrative placeholder — not a map. Connect a mapping provider in <code>properties.ts</code>.</figcaption>
        </figure>
      </div>
    </section>
  );
}
