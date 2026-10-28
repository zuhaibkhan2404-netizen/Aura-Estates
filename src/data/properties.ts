/**
 * AUREL Estates — central, editable site content.
 *
 * Everything a non-developer is likely to change lives in this one file:
 * residences, image paths, optional GLB models, story scenes, lifestyle copy
 * and the enquiry endpoint. All residences and places below are FICTIONAL
 * demonstration content. Replace them with verified data before publishing.
 */

export type ModelKind = 'villa' | 'penthouse' | 'waterfront';

export interface GalleryImage {
  src: string;
  alt: string;
  /** Shown under the image. Keep "Concept render" until real photography is supplied. */
  caption: string;
}

export interface Residence {
  id: string;
  name: string;
  /** Fictional location label. Do not add travel times you cannot verify. */
  location: string;
  /** One short line shown beside the 3D collection. */
  descriptor: string;
  type: 'Villa' | 'Penthouse' | 'Waterfront residence';
  description: string[];
  bedrooms: number;
  bathrooms: number;
  /** Internal living area in square metres. Square feet is calculated. */
  interiorAreaM2: number;
  /** Optional plot or terrace area in square metres. */
  outdoorAreaM2?: number;
  outdoorAreaLabel?: string;
  priceLabel: string;
  amenities: string[];
  gallery: GalleryImage[];
  /** Image used when WebGL is unavailable or the 3D scene is still loading. */
  poster: string;
  floorPlan: {
    /** Path to an architect-supplied plan (SVG/PNG/PDF). Leave empty to show the placeholder schematic. */
    src: string;
    note: string;
  };
  model: {
    /** Procedural concept model used when no GLB is supplied (or the GLB fails to load). */
    procedural: ModelKind;
    /** Optional path to a compressed .glb, e.g. 'assets/models/villa-solenne.glb'. */
    glb?: string;
    /** Height in scene units the GLB is normalised to (procedural models are ~6–9). */
    glbTargetHeight?: number;
    glbRotationY?: number;
  };
  /** false until a human has checked every figure against a source document. */
  verified: boolean;
}

const R = 'assets/renders/';

export const residences: Residence[] = [
  {
    id: 'villa-solenne',
    name: 'Villa Solenne',
    location: 'Serrana Hills',
    descriptor: 'A cantilevered stone villa above terraced olive groves.',
    type: 'Villa',
    description: [
      'Villa Solenne is composed as two horizontal planes: a heavy stone plinth anchored into the hillside and a lighter limestone volume that cantilevers over the pool terrace.',
      'Living spaces open fully to the west terrace through floor-to-ceiling glazing, while bronze fins temper the afternoon light along the upper bedroom wing.',
    ],
    bedrooms: 5,
    bathrooms: 6,
    interiorAreaM2: 640,
    outdoorAreaM2: 2400,
    outdoorAreaLabel: 'Plot',
    priceLabel: 'Price on application',
    amenities: [
      '22 m infinity-edge pool',
      'Terraced olive grove',
      'Temperature-controlled wine room',
      'Detached guest pavilion',
      'Private cinema',
      'Two-car gallery garage',
    ],
    gallery: [
      { src: `${R}villa-1.jpg`, alt: 'Concept render of Villa Solenne from the pool terrace, stone plinth below a cantilevered limestone upper floor', caption: 'Concept render — pool terrace' },
      { src: `${R}villa-2.jpg`, alt: 'Concept render of Villa Solenne seen from a low side angle, showing the cantilever and bronze fins', caption: 'Concept render — cantilever' },
      { src: `${R}villa-3.jpg`, alt: 'Concept render of Villa Solenne at dusk with warm interior light', caption: 'Concept render — dusk' },
    ],
    poster: `${R}villa-1.jpg`,
    floorPlan: { src: '', note: 'Ground floor — indicative schematic' },
    model: { procedural: 'villa' },
    verified: false,
  },
  {
    id: 'meridian-penthouse',
    name: 'The Meridian Penthouse',
    location: 'Harbour Quarter, Port Aurel',
    descriptor: 'A full-floor crown residence with wraparound terraces.',
    type: 'Penthouse',
    description: [
      'The Meridian occupies the top two levels of a slender residential tower. Its upper floor steps back to create a continuous terrace on all four sides.',
      'A bronze pergola shades the roof garden, and a private lift opens directly into the double-height living room.',
    ],
    bedrooms: 4,
    bathrooms: 5,
    interiorAreaM2: 485,
    outdoorAreaM2: 310,
    outdoorAreaLabel: 'Terraces',
    priceLabel: 'Price on application',
    amenities: [
      'Private lift lobby',
      'Double-height living room',
      'Wraparound terraces',
      'Roof garden with pergola',
      'Residents’ spa and pool',
      'Concierge and valet',
    ],
    gallery: [
      { src: `${R}penthouse-1.jpg`, alt: 'Concept render of the Meridian tower crown with stepped terraces and bronze fins', caption: 'Concept render — the crown' },
      { src: `${R}penthouse-2.jpg`, alt: 'Concept render looking up at the penthouse terraces and pergola', caption: 'Concept render — terraces' },
      { src: `${R}penthouse-3.jpg`, alt: 'Concept render of the Meridian tower at dusk with lit upper floors', caption: 'Concept render — dusk' },
    ],
    poster: `${R}penthouse-1.jpg`,
    floorPlan: { src: '', note: 'Upper level — indicative schematic' },
    model: { procedural: 'penthouse' },
    verified: false,
  },
  {
    id: 'lakehouse-verena',
    name: 'Lakehouse Verena',
    location: 'Lake Verena shoreline',
    descriptor: 'A low timber pavilion that extends over still water.',
    type: 'Waterfront residence',
    description: [
      'Lakehouse Verena is a single, long pavilion beneath a floating roof. A timber deck runs the full length of the house and continues out over the water as a private jetty.',
      'A stone chimney anchors the plan; every principal room faces the lake through sliding glazed walls.',
    ],
    bedrooms: 4,
    bathrooms: 4,
    interiorAreaM2: 390,
    outdoorAreaM2: 1650,
    outdoorAreaLabel: 'Plot',
    priceLabel: 'Price on application',
    amenities: [
      'Private jetty and boathouse',
      'Full-length lake deck',
      'Stone fireplace lounge',
      'Outdoor kitchen',
      'Lakeside sauna',
      'Reed garden',
    ],
    gallery: [
      { src: `${R}lakehouse-1.jpg`, alt: 'Concept render of Lakehouse Verena, a long glazed pavilion with a floating roof beside water', caption: 'Concept render — from the lake' },
      { src: `${R}lakehouse-2.jpg`, alt: 'Concept render of the Lakehouse deck and jetty extending over the water', caption: 'Concept render — the jetty' },
      { src: `${R}lakehouse-3.jpg`, alt: 'Concept render of Lakehouse Verena at dusk with a warm glow behind the glazing', caption: 'Concept render — dusk' },
    ],
    poster: `${R}lakehouse-1.jpg`,
    floorPlan: { src: '', note: 'Single level — indicative schematic' },
    model: { procedural: 'waterfront' },
    verified: false,
  },
];

/** Which residence is centred when the collection first loads (the middle one shows both neighbours). */
export const initialResidenceIndex = 1;

export const hero = {
  headline: 'Exceptional spaces. Extraordinary living.',
  intro: 'A private collection of contemporary villas, penthouses and waterfront residences, presented by appointment.',
  poster: `${R}hero.jpg`,
  posterAlt: 'Concept render of a contemporary stone villa with a cantilevered upper floor in low evening sun',
  /** Shown while the WebGL collection initialises; matches the scene's opening camera. */
  collectionPoster: `${R}collection-poster.jpg`,
};

export interface StoryScene {
  id: string;
  label: string;
  statement: string;
  image: string;
  alt: string;
  /** Optional approved video clip (mp4/webm). Plays muted, never autoplays with sound. */
  video?: string;
}

export const story: StoryScene[] = [
  { id: 'arrival', label: 'Arrival', statement: 'The approach is quiet: stone underfoot, olive trees, and the house revealed slowly.', image: `${R}story-arrival.jpg`, alt: 'Concept render of a stone path approaching a contemporary villa between olive trees' },
  { id: 'exterior', label: 'Exterior', statement: 'Heavy stone below, light above. The architecture is legible from a distance.', image: `${R}story-exterior.jpg`, alt: 'Concept render of a villa exterior in warm evening light' },
  { id: 'living', label: 'Living', statement: 'Inside, the walls step back and the landscape becomes the room.', image: `${R}story-living.jpg`, alt: 'Concept render of a minimal living room with full-height glazing and sunlight on a stone floor' },
  { id: 'terrace', label: 'Terrace', statement: 'Evenings belong to the terrace, the water, and the long view west.', image: `${R}story-terrace.jpg`, alt: 'Concept render of a pool terrace looking out over a calm landscape' },
];

export const lifestyle = [
  {
    id: 'water',
    eyebrow: 'Lifestyle',
    title: 'Measured by light, water and quiet.',
    body: 'Each residence in the collection is chosen for its relationship to the landscape — the orientation of its terraces, the privacy of its approach, and the calm of its setting.',
    image: `${R}lifestyle-water.jpg`,
    alt: 'Concept render of a timber jetty extending over still water at sunset',
  },
  {
    id: 'terraces',
    eyebrow: 'Outdoor living',
    title: 'Terraces designed as rooms.',
    body: 'Shade, planting and stone are treated with the same care as the interiors, so outdoor space is usable through the day and across the seasons.',
    image: `${R}lifestyle-terrace.jpg`,
    alt: 'Concept render of a high terrace with planters and a bronze pergola',
  },
];

export const locations = {
  title: 'Three settings, one standard.',
  body: 'The collection spans a hillside, a harbour and a lakeshore. Locations shown here are fictional demonstration places; detailed location information is shared at a private viewing.',
  /** Leave empty to show the abstract placeholder map. Add an embed URL once a mapping provider is chosen. */
  mapEmbedUrl: '',
  places: [
    { residenceId: 'villa-solenne', setting: 'Hillside', note: 'South-west facing slope, terraced olive groves.' },
    { residenceId: 'meridian-penthouse', setting: 'Harbour', note: 'Upper floors of a residential tower in the harbour quarter.' },
    { residenceId: 'lakehouse-verena', setting: 'Lakeshore', note: 'Private shoreline with direct water access.' },
  ],
};

export const enquiry = {
  /**
   * POST endpoint that receives the viewing request as JSON.
   * Leave empty to run the form in clearly labelled demo mode (nothing is sent).
   * Example: 'https://formspree.io/f/xxxxxxx' or your own API route.
   */
  endpoint: '',
  /** Minimum days from today a viewing can be requested. */
  minLeadDays: 2,
};

export const brand = {
  name: 'AUREL',
  full: 'AUREL Estates',
  contactNote: 'Private viewings are arranged by appointment only.',
};

/** Square feet helper so only m² needs editing. */
export const m2ToSqft = (m2: number) => Math.round(m2 * 10.7639);
