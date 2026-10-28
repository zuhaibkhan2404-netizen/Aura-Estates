import type { PlanKind as ModelKind } from '../data/properties';

/** Abstract schematic used until an architect-supplied plan is added. Deliberately unlabelled with dimensions. */
const plans: Record<ModelKind, { rooms: [number, number, number, number, string][]; w: number; h: number }> = {
  villa: {
    w: 600, h: 320,
    rooms: [[20, 20, 220, 170, 'Living'], [240, 20, 150, 110, 'Kitchen'], [390, 20, 190, 110, 'Dining'], [240, 130, 340, 60, 'Gallery'], [20, 190, 160, 110, 'Study'], [180, 210, 400, 90, 'Pool terrace']],
  },
  penthouse: {
    w: 600, h: 320,
    rooms: [[60, 40, 240, 150, 'Living'], [300, 40, 120, 90, 'Kitchen'], [420, 40, 120, 150, 'Principal suite'], [300, 130, 120, 60, 'Lift'], [60, 190, 160, 90, 'Bedroom'], [220, 190, 320, 90, 'Terrace']],
  },
  waterfront: {
    w: 600, h: 320,
    rooms: [[20, 40, 120, 160, 'Bedrooms'], [140, 40, 220, 160, 'Living'], [360, 40, 120, 160, 'Kitchen'], [480, 40, 100, 160, 'Sauna'], [20, 200, 560, 80, 'Lake deck']],
  },
};

export default function FloorPlanPlaceholder({ kind, name }: { kind: ModelKind; name: string }) {
  const p = plans[kind];
  return (
    <figure className="plan-placeholder">
      <svg viewBox={`0 0 ${p.w} ${p.h}`} role="img" aria-label={`Indicative schematic for ${name}. Not a measured floor plan.`}>
        {p.rooms.map(([x, y, w, h, label]) => (
          <g key={label}>
            <rect x={x} y={y} width={w} height={h} />
            <text x={x + 12} y={y + 22}>{label}</text>
          </g>
        ))}
      </svg>
      <figcaption>Placeholder schematic — not to scale. Replace with the architect-supplied plan (see README).</figcaption>
    </figure>
  );
}
