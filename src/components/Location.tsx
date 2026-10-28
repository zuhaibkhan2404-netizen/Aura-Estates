import { locations, residences } from '../data/properties';

const markers: Record<string, [number, number]> = {
  'villa-solenne': [110, 125],
  'meridian-penthouse': [290, 228],
  'lakehouse-verena': [390, 92],
};

export default function Location({ onSelectResidence }: { onSelectResidence: (i: number) => void }) {
  return (
    <section id="location" className="location" aria-labelledby="location-title">
      <div className="container location__grid">
        <div className="location__text">
          <p className="eyebrow">Locations</p>
          <h2 id="location-title" className="section-title section-title--md">{locations.title}</h2>
          <p>{locations.body}</p>
          <ul className="places">
            {locations.places.map((p) => {
              const i = residences.findIndex((r) => r.id === p.residenceId);
              const r = residences[i];
              if (!r) return null;
              return (
                <li key={p.residenceId}>
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
        <figure className="map-card">
          {locations.mapEmbedUrl ? (
            <iframe src={locations.mapEmbedUrl} title="Map of residence locations" loading="lazy" />
          ) : (
            <svg viewBox="0 0 600 340" role="img" aria-label="Illustrative placeholder showing three fictional settings: hillside, harbour and lakeshore. Not a map.">
              <rect width="600" height="340" className="map-bg" />
              <path className="map-contour" d="M0 90 C120 60 200 140 300 110 S480 40 600 80" />
              <path className="map-contour" d="M0 140 C140 110 220 190 320 160 S500 100 600 130" />
              <path className="map-contour" d="M0 300 C150 270 260 300 360 280 S520 250 600 270" />
              <path className="map-water" d="M420 60 C470 40 560 60 560 110 C560 160 480 170 440 150 C400 130 380 80 420 60Z" />
              <path className="map-water" d="M0 260 C120 240 240 250 330 250 C420 250 480 290 600 300 L600 340 L0 340Z" />
              {locations.places.map((p) => {
                const [x, y] = markers[p.residenceId] ?? [300, 170];
                const r = residences.find((rr) => rr.id === p.residenceId);
                return (
                  <g key={p.residenceId} className="map-marker">
                    <circle cx={x} cy={y} r="6" />
                    <circle cx={x} cy={y} r="14" className="map-marker__ring" />
                    <text x={x + 20} y={y + 5}>{r?.name}</text>
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
