import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createPalette, type Palette } from './materials';
export type ModelKind = 'villa' | 'penthouse' | 'waterfront';

/**
 * Procedural CONCEPT models. They are intentionally abstract, architectural-model style
 * massing studies — not photoreal buildings. Replace with GLB files via properties.ts.
 */

export interface ResidenceModel {
  group: THREE.Group;
  palette: Palette;
  /** Approximate height in scene units after scaling, used for camera framing. */
  height: number;
  /** Point the detail camera looks at, in model-local space (before rail offset). */
  focusTarget: THREE.Vector3;
  kind: ModelKind | 'glb';
}

/** Deterministic random so live scene and rendered stills match. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Collects geometry per material and merges it into one mesh per material (few draw calls). */
export class Builder {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private noShadow = new Set<THREE.Material>();

  add(mat: THREE.Material, g: THREE.BufferGeometry) {
    const geo = g.index ? g.toNonIndexed() : g;
    if (!geo.attributes.uv) {
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    }
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat)!.push(geo);
    return this;
  }

  box(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    return this.add(mat, g);
  }

  cylinder(mat: THREE.Material, r: number, h: number, x: number, y: number, z: number, seg = 8) {
    const g = new THREE.CylinderGeometry(r, r, h, seg);
    g.translate(x, y, z);
    return this.add(mat, g);
  }

  receiveOnly(mat: THREE.Material) {
    this.noShadow.add(mat);
  }

  build(name: string) {
    const group = new THREE.Group();
    group.name = name;
    this.parts.forEach((geos, mat) => {
      const merged = mergeGeometries(geos, false);
      if (!merged) return;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !this.noShadow.has(mat);
      mesh.receiveShadow = true;
      group.add(mesh);
    });
    return group;
  }
}

/** Low-poly olive tree: thin trunk and clustered faceted canopy. */
export function addOliveTree(b: Builder, p: Palette, x: number, y: number, z: number, scale: number, rnd: () => number) {
  const h = 1.1 * scale;
  b.cylinder(p.trunk, 0.07 * scale, h, x, y + h / 2, z, 8);
  const blobs = 3 + Math.floor(rnd() * 2);
  for (let i = 0; i < blobs; i++) {
    const r = (0.55 + rnd() * 0.35) * scale;
    const g = new THREE.IcosahedronGeometry(r, 2);
    g.scale(1.25, 0.8, 1.15);
    g.rotateY(rnd() * Math.PI);
    g.translate(x + (rnd() - 0.5) * 0.9 * scale, y + h + (rnd() * 0.5) * scale, z + (rnd() - 0.5) * 0.9 * scale);
    b.add(rnd() > 0.5 ? p.olive : p.oliveDark, g);
  }
}

function addShrub(b: Builder, p: Palette, x: number, y: number, z: number, s: number) {
  const g = new THREE.IcosahedronGeometry(s, 2);
  g.scale(1.3, 0.75, 1.1);
  g.translate(x, y + s * 0.6, z);
  b.add(p.oliveDark, g);
}

/* ------------------------------------------------------------------ */
/* Villa Solenne — stone plinth, glazed ground floor, cantilevered upper volume */
/* ------------------------------------------------------------------ */
function buildVilla(): ResidenceModel {
  const p = createPalette();
  const b = new Builder();
  const rnd = seeded(11);
  b.receiveOnly(p.water);

  // Plinth and lower terrace step
  b.box(p.stone, 13, 1.1, 8.6, 0, 0.55, 0);
  b.box(p.stoneDark, 14.6, 0.35, 10.2, 0, 0.175, 0.5);
  // Ground floor glazing
  const gfY = 1.1;
  b.box(p.glass, 8.4, 2.5, 4.6, -0.6, gfY + 1.25, -0.8);
  for (let x = -4.75; x <= 3.65; x += 1.05) b.box(p.charcoal, 0.07, 2.5, 0.07, x, gfY + 1.25, 1.52);
  // Stone spine wall
  b.box(p.stoneDark, 0.6, 3.0, 8.0, -5.6, gfY + 1.5, -0.3);
  // Intermediate slab
  b.box(p.charcoal, 9.4, 0.22, 5.2, -0.6, gfY + 2.61, -0.8);
  // Cantilevered upper volume
  const upY = gfY + 2.72 + 1.15;
  b.box(p.limestone, 10.6, 2.3, 4.2, 1.4, upY, -1.2);
  b.box(p.glass, 9.0, 1.25, 0.06, 1.4, upY + 0.05, 0.92);
  for (let x = -3.4; x <= 6.2; x += 0.45) b.box(p.bronze, 0.07, 2.0, 0.42, x, upY, 1.18);
  // Roof slab with shadow gap
  b.box(p.charcoal, 11.2, 0.2, 4.8, 1.4, upY + 1.27, -1.2);
  // Pool on the plinth
  b.box(p.water, 8.0, 0.04, 2.3, 1.6, 1.1, 3.0);
  b.box(p.limestone, 8.4, 0.06, 0.2, 1.6, 1.12, 4.25);
  // Terraced olive grove walls in front
  for (const z of [6.4, 8.6]) {
    b.box(p.stone, 12, 0.45, 0.35, 0, 0.225, z);
    for (let x = -5; x <= 5; x += 2.5) addShrub(b, p, x + (rnd() - 0.5), 0, z - 0.8, 0.35 + rnd() * 0.15);
  }
  // Olive trees
  const trees: [number, number, number, number][] = [
    [-8.2, 0, 3.6, 1.1], [-9.4, 0, 0.4, 0.9], [8.6, 0, 3.2, 1.0], [9.2, 0, -2.4, 1.2], [-7.6, 0, -3.8, 1.0], [-3.6, 1.1, 3.1, 0.75],
  ];
  trees.forEach(([x, y, z, s]) => addOliveTree(b, p, x, y, z, s, rnd));

  const group = b.build('villa');
  return { group, palette: p, height: 6.4, focusTarget: new THREE.Vector3(0.6, 2.6, 0), kind: 'villa' };
}

/* ------------------------------------------------------------------ */
/* The Meridian Penthouse — tower crown with stepped terraces */
/* ------------------------------------------------------------------ */
function buildPenthouse(): ResidenceModel {
  const p = createPalette();
  const b = new Builder();
  const rnd = seeded(23);

  b.box(p.stoneDark, 8.6, 1.2, 8.6, 0, 0.6, 0);
  const floorH = 1.3;
  const floors = 7;
  for (let f = 0; f < floors; f++) {
    const y = 1.2 + f * floorH;
    b.box(p.stone, 6.3, 0.22, 6.3, 0, y + 0.11, 0);
    b.box(p.glass, 5.8, floorH - 0.22, 5.8, 0, y + 0.22 + (floorH - 0.22) / 2, 0);
  }
  const shaftTop = 1.2 + floors * floorH;
  for (const [x, z] of [[-3.05, -3.05], [3.05, -3.05], [-3.05, 3.05], [3.05, 3.05]]) {
    b.box(p.limestone, 0.4, shaftTop - 1.2, 0.4, x, 1.2 + (shaftTop - 1.2) / 2, z);
  }
  // Crown level 1 with wraparound terrace
  b.box(p.limestone, 8.2, 0.32, 8.2, 0, shaftTop + 0.16, 0);
  b.box(p.bronze, 8.24, 0.08, 8.24, 0, shaftTop + 0.36, 0);
  const l1 = shaftTop + 0.32;
  b.box(p.glass, 6.2, 1.9, 6.2, 0, l1 + 0.95, 0);
  for (let i = -2.9; i <= 2.9; i += 0.48) {
    b.box(p.bronze, 0.06, 1.9, 0.32, i, l1 + 0.95, 3.18);
    b.box(p.bronze, 0.06, 1.9, 0.32, i, l1 + 0.95, -3.18);
    b.box(p.bronze, 0.32, 1.9, 0.06, 3.18, l1 + 0.95, i);
    b.box(p.bronze, 0.32, 1.9, 0.06, -3.18, l1 + 0.95, i);
  }
  // Crown level 2, stepped back
  const l2 = l1 + 1.9;
  b.box(p.limestone, 7.0, 0.26, 7.0, 0, l2 + 0.13, 0);
  b.box(p.glass, 4.4, 1.6, 4.4, -0.9, l2 + 0.26 + 0.8, -0.9);
  b.box(p.charcoal, 5.0, 0.2, 5.0, -0.9, l2 + 2.0, -0.9);
  // Pergola over the upper terrace
  for (let x = 1.7; x <= 3.3; x += 0.32) b.box(p.bronze, 0.07, 0.07, 6.6, x, l2 + 1.95, 0);
  b.box(p.bronze, 0.1, 1.7, 0.1, 3.3, l2 + 1.1, 3.2);
  b.box(p.bronze, 0.1, 1.7, 0.1, 3.3, l2 + 1.1, -3.2);
  // Planters
  for (const [x, z] of [[3.6, 3.6], [-3.6, 3.6], [3.6, -3.6]]) {
    b.box(p.charcoal, 0.8, 0.4, 0.8, x, l1 + 0.2, z);
    addShrub(b, p, x, l1 + 0.4, z, 0.38 + rnd() * 0.1);
  }
  addShrub(b, p, 2.6, l2 + 0.26, 2.6, 0.4);
  // Street trees around the podium
  [[-6, 0, 4.5, 1.0], [6.2, 0, 4.2, 0.9], [-6.4, 0, -3, 1.1]].forEach(([x, y, z, s]) => addOliveTree(b, p, x, y, z, s, rnd));

  const group = b.build('penthouse');
  const s = 0.6;
  group.scale.setScalar(s);
  const height = (l2 + 2.1) * s;
  return { group, palette: p, height, focusTarget: new THREE.Vector3(0, height * 0.72, 0), kind: 'penthouse' };
}

/* ------------------------------------------------------------------ */
/* Lakehouse Verena — floating roof pavilion over water */
/* ------------------------------------------------------------------ */
function buildWaterfront(): ResidenceModel {
  const p = createPalette();
  const b = new Builder();
  const rnd = seeded(37);
  b.receiveOnly(p.water);

  // Water and shoreline
  b.box(p.water, 19, 0.04, 9.2, 0, 0.02, 4.9);
  b.box(p.stone, 14.4, 0.5, 5.2, 0, 0.25, -2.2);
  // Deck over the water edge
  b.box(p.timber, 14, 0.16, 3.2, 0, 0.58, 1.4);
  for (let x = -6.5; x <= 6.5; x += 1.6) b.cylinder(p.charcoal, 0.07, 0.6, x, 0.3, 2.85, 6);
  // Glazed pavilion
  b.box(p.glass, 11, 2.3, 3.6, 0.4, 0.5 + 1.15, -2.2);
  for (let x = -5.0; x <= 5.8; x += 1.2) b.box(p.charcoal, 0.06, 2.3, 0.06, x, 1.65, -0.38);
  // Timber screen at the west end
  for (let z = -3.9; z <= -0.5; z += 0.22) b.box(p.timber, 0.1, 2.3, 0.1, -5.25, 1.65, z);
  // Floating roof
  b.box(p.charcoal, 14.6, 0.22, 6.6, 0.4, 2.95, -1.3);
  b.box(p.bronze, 14.64, 0.06, 0.06, 0.4, 2.83, 2.0);
  // Stone chimney
  b.box(p.stoneDark, 1.1, 3.9, 1.1, -3.2, 2.45, -3.1);
  // Jetty
  b.box(p.timber, 1.5, 0.14, 6.0, 4.8, 0.5, 5.4);
  for (let z = 3.0; z <= 8.2; z += 1.3) {
    b.cylinder(p.charcoal, 0.06, 0.55, 4.1, 0.25, z, 6);
    b.cylinder(p.charcoal, 0.06, 0.55, 5.5, 0.25, z, 6);
  }
  // Reeds along the shore
  for (let i = 0; i < 26; i++) {
    const x = -9 + rnd() * 6 + (i % 2 ? 12 : 0);
    const z = 0.6 + rnd() * 1.6;
    const g = new THREE.ConeGeometry(0.06 + rnd() * 0.05, 0.7 + rnd() * 0.6, 4);
    g.translate(x, 0.35, z);
    b.add(rnd() > 0.5 ? p.olive : p.oliveDark, g);
  }
  [[-7.6, 0, -4.4, 1.1], [7.8, 0, -3.8, 1.0], [-9, 0, -1.4, 0.9], [9.4, 0, -0.6, 0.8]].forEach(([x, y, z, s]) => addOliveTree(b, p, x, y, z, s, rnd));

  const group = b.build('waterfront');
  return { group, palette: p, height: 4.4, focusTarget: new THREE.Vector3(0.4, 1.8, -0.6), kind: 'waterfront' };
}

export function buildResidenceModel(kind: ModelKind): ResidenceModel {
  switch (kind) {
    case 'villa': return buildVilla();
    case 'penthouse': return buildPenthouse();
    case 'waterfront': return buildWaterfront();
  }
}

/** Collects every material inside a group (used for fading GLB or procedural models). */
export function collectMaterials(root: THREE.Object3D) {
  const set = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    if (!m) return;
    (Array.isArray(m) ? m : [m]).forEach((mm) => set.add(mm));
  });
  return [...set];
}
