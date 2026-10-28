/**
 * AUREL Estates — central, editable site content.
 *
 * Residences, prices, figures and place names are FICTIONAL demonstration content.
 * Photos are real architecture photography from Unsplash (free licence, credited on the page);
 * they are NOT photos of the listed properties. Replace them with the real property's
 * approved photography before publishing a real listing.
 */
import type { Photo } from '../lib/images';

export type PlanKind = 'villa' | 'penthouse' | 'waterfront';

export interface Residence {
  id: string;
  name: string;
  /** Fictional location label. Do not add travel times you cannot verify. */
  location: string;
  /** One short line shown in the gallery. */
  descriptor: string;
  type: string;
  description: string[];
  bedrooms: number;
  bathrooms: number;
  /** Internal living area in square metres. Square feet is calculated. */
  interiorAreaM2: number;
  outdoorAreaM2?: number;
  outdoorAreaLabel?: string;
  priceLabel: string;
  amenities: string[];
  /** First photo is the cover used in the 3D gallery and hero. */
  photos: (Photo & { caption: string })[];
  floorPlan: { src: string; note: string; kind: PlanKind };
  /** Accent colour used for small UI details on this residence. */
  accent: string;
  /** false until a human has checked every figure against a source document. */
  verified: boolean;
}

const R = 'assets/renders/';
const credit = (name: string, slug: string) => ({ name, url: `https://unsplash.com/photos/${slug}` });

export const residences: Residence[] = [
  {
    id: 'villa-solenne',
    name: 'Villa Solenne',
    location: 'Serrana Coast',
    descriptor: 'A white villa composed around a long reflecting pool.',
    type: 'Villa',
    description: [
      'Villa Solenne is a sequence of white volumes arranged around a long pool terrace. Deep overhangs keep the living spaces shaded while the glazing opens fully to the garden.',
      'The principal suite occupies the upper floor, with a private terrace above the pool and views over the coastline.',
    ],
    bedrooms: 5,
    bathrooms: 6,
    interiorAreaM2: 640,
    outdoorAreaM2: 2400,
    outdoorAreaLabel: 'Plot',
    priceLabel: 'Price on application',
    amenities: ['22 m pool terrace', 'Outdoor lounge and kitchen', 'Temperature-controlled wine room', 'Guest pavilion', 'Private cinema', 'Two-car gallery garage'],
    photos: [
      { id: '1613977257363-707ba9348227', alt: 'A modern white villa with a swimming pool and an outdoor lounge area', caption: 'Pool terrace', fallback: `${R}villa-1.jpg`, credit: credit('John Fornander', 'Id7u0EkTjBE') },
      { id: '1512917774080-9991f1c4c750', alt: 'White and grey modern house beside a swimming pool under a clear sky', caption: 'From the garden', fallback: `${R}villa-2.jpg`, credit: credit('Frames For Your Heart', '2d4lAQAlbDA') },
      { id: '1613490493576-7fde63acd811', alt: 'White and brown modern house with large windows', caption: 'Evening', fallback: `${R}villa-3.jpg`, credit: credit('Avi Werde', 'hHz4yrvxwlA') },
    ],
    floorPlan: { src: '', note: 'Ground floor — indicative schematic', kind: 'villa' },
    accent: '#C9A97A',
    verified: false,
  },
  {
    id: 'casa-noctis',
    name: 'Casa Noctis',
    location: 'Valmora Ridge',
    descriptor: 'A glass house that glows after dusk.',
    type: 'Contemporary house',
    description: [
      'Casa Noctis is designed for the evening. Full-height glazing wraps the living floor so that, after dark, the house reads as a lantern on the ridge.',
      'A double-sided fireplace divides the living and dining spaces; every bedroom opens to its own terrace.',
    ],
    bedrooms: 4,
    bathrooms: 5,
    interiorAreaM2: 520,
    outdoorAreaM2: 1800,
    outdoorAreaLabel: 'Plot',
    priceLabel: 'Price on application',
    amenities: ['Double-sided fireplace', 'Full-height sliding glazing', 'Landscape lighting', 'Home office', 'Gym and steam room', 'EV charging'],
    photos: [
      { id: '1757524492552-d47a66a2b63e', alt: 'Modern house with large windows at dusk', caption: 'At dusk', fallback: `${R}villa-3.jpg`, credit: credit('Michael Brown', 'cUoXTLVFQ9M') },
      { id: '1757524503555-b62633f47670', alt: 'Modern living room with a fireplace and large windows', caption: 'Living room', fallback: `${R}story-living.jpg`, credit: credit('Michael Brown', 'FKOBTsfL4CY') },
      { id: '1505843513577-22bb7d21e455', alt: 'White and black concrete house with lit windows', caption: 'Night', fallback: `${R}penthouse-3.jpg`, credit: credit('Daniel Barnes', 'RKdLlTyjm5g') },
    ],
    floorPlan: { src: '', note: 'Living level — indicative schematic', kind: 'penthouse' },
    accent: '#E0A86A',
    verified: false,
  },
  {
    id: 'lakehouse-verena',
    name: 'Lakehouse Verena',
    location: 'Lake Verena shoreline',
    descriptor: 'Golden hour, still water and a house that faces both.',
    type: 'Waterfront residence',
    description: [
      'Lakehouse Verena sits low beside the water. A single long living room faces west, so the late sun reaches deep into the house.',
      'A stone terrace steps down to the shoreline; the bedrooms are arranged in a quieter wing behind the courtyard.',
    ],
    bedrooms: 4,
    bathrooms: 4,
    interiorAreaM2: 390,
    outdoorAreaM2: 1650,
    outdoorAreaLabel: 'Plot',
    priceLabel: 'Price on application',
    amenities: ['Private shoreline', 'West-facing living room', 'Stone terrace to the water', 'Outdoor kitchen', 'Lakeside sauna', 'Boat storage'],
    photos: [
      { id: '1544984243-ec57ea16fe25', alt: 'Water near a house during golden hour', caption: 'Golden hour', fallback: `${R}lakehouse-1.jpg`, credit: credit('Roberto Nickson', 'so3wgJLwDxo') },
      { id: '1564078516393-cf04bd966897', alt: 'Grey padded chaise couch beside a large window', caption: 'Reading corner', fallback: `${R}lakehouse-2.jpg`, credit: credit('Roberto Nickson', 'rEJxpBskj3Q') },
      { id: '1593714604578-d9e41b00c6c6', alt: 'White and brown modern building next to a swimming pool', caption: 'Pool court', fallback: `${R}lakehouse-3.jpg`, credit: credit('Mikail McVerry', 'GSL3IuuwJv8') },
    ],
    floorPlan: { src: '', note: 'Single level — indicative schematic', kind: 'waterfront' },
    accent: '#D9B26B',
    verified: false,
  },
  {
    id: 'garden-house',
    name: 'The Garden House',
    location: 'Linden Park',
    descriptor: 'Clean white planes set into a mature garden.',
    type: 'Family residence',
    description: [
      'The Garden House is a composition of white planes and timber screens. The ground floor opens on three sides to a mature, walled garden.',
      'Upstairs, five bedrooms share a long gallery lit from above.',
    ],
    bedrooms: 5,
    bathrooms: 5,
    interiorAreaM2: 560,
    outdoorAreaM2: 2100,
    outdoorAreaLabel: 'Plot',
    priceLabel: 'Price on application',
    amenities: ['Walled garden', 'Kitchen opening to the lawn', 'Top-lit gallery', 'Play room', 'Staff apartment', 'Three-car garage'],
    photos: [
      { id: '1600596542815-ffad4c1539a9', alt: 'White modern house under a blue sky', caption: 'Garden facade', fallback: `${R}villa-2.jpg`, credit: credit('Frames For Your Heart', 'mR1CIDduGLc') },
      { id: '1580587771525-78b9dba3b914', alt: 'White and brown modern house with a lawn under a blue sky', caption: 'Approach', fallback: `${R}story-exterior.jpg`, credit: credit('Ярослав Алексеенко', '_TPTXZd9mOo') },
      { id: '1583847268964-b28dc8f51f92', alt: 'A living room with furniture and a large window', caption: 'Living room', fallback: `${R}story-living.jpg`, credit: credit('Minh Pham', 'OtXADkUh3-I') },
    ],
    floorPlan: { src: '', note: 'Ground floor — indicative schematic', kind: 'villa' },
    accent: '#B9C29A',
    verified: false,
  },
  {
    id: 'cedar-frame',
    name: 'Cedar Frame',
    location: 'Northwood',
    descriptor: 'A timber A-frame retreat with a wall of glass.',
    type: 'Retreat',
    description: [
      'Cedar Frame is a compact retreat under a steep timber roof. The gable end is fully glazed, framing the forest from the double-height living room.',
      'A mezzanine bedroom looks down into the living space; a wood-fired sauna sits a short walk away.',
    ],
    bedrooms: 3,
    bathrooms: 3,
    interiorAreaM2: 240,
    outdoorAreaM2: 5200,
    outdoorAreaLabel: 'Woodland plot',
    priceLabel: 'Price on application',
    amenities: ['Double-height glazed gable', 'Mezzanine suite', 'Wood-burning stove', 'Forest sauna', 'Covered deck', 'Walking trails'],
    photos: [
      { id: '1768578927091-2f02d499ac61', alt: 'Modern A-frame house with large windows and wooden accents', caption: 'The gable', fallback: `${R}lakehouse-2.jpg`, credit: credit('Caroline Badran', 'u_w2ts7Gpgk') },
      { id: '1758565811272-e79917ca0adc', alt: 'Modern dining room with large windows and a scenic view', caption: 'Dining', fallback: `${R}story-living.jpg`, credit: credit('Caroline Badran', 'n2lSnn0tVKk') },
      { id: '1774311237295-a65a4c1ff38a', alt: 'Modern living space with a large window overlooking nature', caption: 'Living', fallback: `${R}story-terrace.jpg`, credit: credit('Clay Banks', 'b6Bs19onFtY') },
    ],
    floorPlan: { src: '', note: 'Main level — indicative schematic', kind: 'waterfront' },
    accent: '#C08A5B',
    verified: false,
  },
];

/** Which residence is centred when the gallery first loads. */
export const initialResidenceIndex = 2;

export const hero = {
  headline: 'Exceptional spaces. Extraordinary living.',
  intro: 'A private collection of contemporary villas and waterfront residences, presented by appointment.',
  /** Seconds each slide stays before the next house is revealed. */
  slideSeconds: 6,
};

export interface StoryScene {
  id: string;
  label: string;
  statement: string;
  photo: Photo;
  video?: string;
}

export const story: StoryScene[] = [
  { id: 'arrival', label: 'Arrival', statement: 'The approach is quiet. The house reveals itself slowly, across the lawn.', photo: { id: '1783125127199-860da9744dcc', alt: 'A modern house with a swimming pool and a green lawn', fallback: `${R}story-arrival.jpg`, credit: credit('Salvo Media LLC', 'ylzGfY-xzBY') } },
  { id: 'exterior', label: 'Exterior', statement: 'As the light fades, the architecture turns into a lantern.', photo: { id: '1757524492552-d47a66a2b63e', alt: 'Modern house with large windows at dusk', fallback: `${R}story-exterior.jpg`, credit: credit('Michael Brown', 'cUoXTLVFQ9M') } },
  { id: 'living', label: 'Living', statement: 'Inside, the walls step back and the landscape becomes the room.', photo: { id: '1773578978637-c9771e7a9913', alt: 'Modern dining and living area with large windows', fallback: `${R}story-living.jpg`, credit: credit('Clay Banks', 'y8j0gmhtS-4') } },
  { id: 'terrace', label: 'Terrace', statement: 'Evenings belong to the terrace, the water and the long view.', photo: { id: '1781795414968-8ece31826420', alt: 'Modern luxury house with a swimming pool and lush green landscape', fallback: `${R}story-terrace.jpg`, credit: credit('Maverick Frame', '7s8ab4twHcI') } },
];

export const lifestyle = [
  {
    id: 'water',
    eyebrow: 'Lifestyle',
    title: 'Measured by light, water and quiet.',
    body: 'Each residence is chosen for its relationship to the landscape — the orientation of its terraces, the privacy of its approach, and the calm of its setting.',
    photo: { id: '1544984243-ec57ea16fe25', alt: 'Still water beside a house at golden hour', fallback: `${R}lifestyle-water.jpg`, credit: credit('Roberto Nickson', 'so3wgJLwDxo') } as Photo,
  },
  {
    id: 'terraces',
    eyebrow: 'Outdoor living',
    title: 'Terraces designed as rooms.',
    body: 'Shade, planting and stone are treated with the same care as the interiors, so outdoor space is usable through the day and across the seasons.',
    photo: { id: '1706808849780-7a04fbac83ef', alt: 'A modern house with a pool and sun loungers', fallback: `${R}lifestyle-terrace.jpg`, credit: credit('Salman Saqib', 'WaC-JFfF21M') } as Photo,
  },
];

export const locations = {
  title: 'Five settings, one standard.',
  body: 'The collection spans a coastline, a ridge, a lakeshore, a city park and a forest. All locations shown are fictional demonstration places; detailed location information is shared at a private viewing.',
  /** Leave empty to show the abstract placeholder map. */
  mapEmbedUrl: '',
  places: [
    { residenceId: 'villa-solenne', setting: 'Coast', note: 'South-facing garden plot above the shoreline.', xy: [95, 250] as [number, number] },
    { residenceId: 'casa-noctis', setting: 'Ridge', note: 'Elevated plot with long evening views.', xy: [210, 95] as [number, number] },
    { residenceId: 'lakehouse-verena', setting: 'Lakeshore', note: 'Private shoreline with direct water access.', xy: [420, 120] as [number, number] },
    { residenceId: 'garden-house', setting: 'Park', note: 'Walled garden plot beside a city park.', xy: [300, 205] as [number, number] },
    { residenceId: 'cedar-frame', setting: 'Forest', note: 'Woodland plot at the end of a private track.', xy: [470, 260] as [number, number] },
  ],
};

export const enquiry = {
  /**
   * POST endpoint that receives the viewing request as JSON.
   * Leave empty to run the form in clearly labelled demo mode (nothing is sent).
   */
  endpoint: '',
  minLeadDays: 2,
};

export const brand = {
  name: 'AUREL',
  full: 'AUREL Estates',
  contactNote: 'Private viewings are arranged by appointment only.',
};

export const m2ToSqft = (m2: number) => Math.round(m2 * 10.7639);
