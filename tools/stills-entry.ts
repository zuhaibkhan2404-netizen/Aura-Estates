/**
 * Renders the concept stills (hero, gallery, story, lifestyle) from the same procedural
 * models used by the live showroom. Run with `npm run render:stills` (uses Playwright).
 * Output images are CONCEPT RENDERS and are labelled as such throughout the site.
 */
import * as THREE from 'three';
import { Builder, addOliveTree, buildResidenceModel, seeded, type ResidenceModel } from './concept/models';
import { configureRenderer, createEnvironment } from './concept/environment';
import { createPalette, setInteriorGlow } from './concept/materials';
import { createComposer } from './concept/postfx';
import type { ModelKind } from './concept/models';

type V3 = [number, number, number];
interface Preset {
  dusk?: number;
  fov?: number;
  cam: V3;
  look: V3;
  build: (scene: THREE.Scene, dusk: number) => void;
  /** Ambient occlusion (GTAO) on by default; off where it produces artefacts. */
  ao?: boolean;
}

function place(scene: THREE.Scene, kind: ModelKind, dusk: number, pos: V3 = [0, 0, 0], scale = 1, ry = 0): ResidenceModel {
  const m = buildResidenceModel(kind);
  setInteriorGlow(m.palette, dusk);
  const w = new THREE.Group();
  w.add(m.group);
  w.position.set(...pos);
  w.scale.setScalar(scale);
  w.rotation.y = ry;
  scene.add(w);
  return m;
}

function landscape(scene: THREE.Scene, seed: number, count: number, rMin: number, rMax: number, zMin = -999, keep: (x: number, z: number) => boolean = () => true) {
  const p = createPalette();
  const b = new Builder();
  const rnd = seeded(seed);
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rMin + rnd() * (rMax - rMin);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (z < zMin || !keep(x, z)) continue;
    addOliveTree(b, p, x, 0, z, 0.8 + rnd() * 0.6, rnd);
  }
  scene.add(b.build('landscape'));
}

function pathPads(scene: THREE.Scene) {
  const p = createPalette();
  const b = new Builder();
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    b.box(p.limestone, 1.5, 0.08, 0.9, -11 + t * 7.5, 0.04, 14.5 - t * 9.5, -0.65);
  }
  scene.add(b.build('path'));
}

function bigWater(scene: THREE.Scene) {
  const p = createPalette();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), p.water);
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, 0.015, 100 + 0.4);
  m.receiveShadow = true;
  scene.add(m);
}

function livingRoom(scene: THREE.Scene) {
  const p = createPalette();
  const fabric = new THREE.MeshStandardMaterial({ color: '#D8CDBB', roughness: 1 });
  const rug = new THREE.MeshStandardMaterial({ color: '#BFB29C', roughness: 1 });
  const b = new Builder();
  // Shell
  b.box(p.limestone, 16, 0.2, 10, 0, -0.08, 0);
  b.box(p.limestone, 16, 0.3, 10, 0, 3.45, 0);
  b.box(p.stoneDark, 16, 3.6, 0.3, 0, 1.7, -5);
  b.box(p.limestone, 0.3, 3.6, 10, 8, 1.7, 0);
  // Glazing frame on the open side (z = +5) and right side (x = +8)
  for (let x = -7.8; x <= 8; x += 1.9) b.box(p.charcoal, 0.07, 3.3, 0.07, x, 1.65, 4.95);
  b.box(p.charcoal, 16, 0.12, 0.12, 0, 3.27, 4.95);
  b.box(p.charcoal, 16, 0.05, 0.12, 0, 0.02, 4.95);
  for (let z = -4.8; z <= 5; z += 1.9) b.box(p.charcoal, 0.07, 3.3, 0.07, -7.95, 1.65, z);
  b.box(p.charcoal, 0.12, 0.12, 10, -7.95, 3.27, 0);
  // Fireplace slot and shelf in the stone wall
  b.box(p.charcoal, 3.2, 0.55, 0.1, -2.2, 0.75, -4.82);
  b.box(p.bronze, 3.6, 0.05, 0.3, -2.2, 1.12, -4.7);
  // Rug, sofa, table, lounge chair
  b.add(rug, new THREE.BoxGeometry(5.6, 0.02, 3.8).translate(-1.2, 0.01, 0.3));
  b.add(fabric, new THREE.BoxGeometry(4.2, 0.42, 1.1).translate(-1.2, 0.21, -1.4));
  b.add(fabric, new THREE.BoxGeometry(4.2, 0.45, 0.28).translate(-1.2, 0.62, -1.86));
  b.add(fabric, new THREE.BoxGeometry(1.1, 0.42, 2.6).translate(-3.85, 0.21, -0.65));
  b.box(p.stoneDark, 1.7, 0.34, 1.0, -1.0, 0.17, 0.4);
  b.box(p.bronze, 0.05, 0.4, 0.05, 1.6, 0.2, 1.6);
  b.add(fabric, new THREE.BoxGeometry(0.9, 0.35, 0.9).translate(1.9, 0.4, 1.9));
  scene.add(b.build('living'));
  // The view outside
  landscape(scene, 9, 70, 12, 60, -999, (x, z) => x < -10 || z > 7);
  const fill = new THREE.AmbientLight('#FFF1DE', 0.55);
  scene.add(fill);
}

const villaPos: V3 = [0, 0, 0];

const presets: Record<string, Preset> = {
  hero: { dusk: 0.35, cam: [5.5, 2.3, 19], look: [-4.6, 3.3, 0], build: (s, d) => { place(s, 'villa', d, villaPos); landscape(s, 2, 30, 20, 70); } },
  'collection-poster': {
    cam: [0, 7.65, 25], look: [0, 2.8, 0], fov: 30,
    build: (s, d) => {
      place(s, 'villa', d, [-17 * 0.84, 0, -5], 0.72, 0.08);
      place(s, 'penthouse', d, [0, 0, 0]);
      place(s, 'waterfront', d, [17 * 0.84, 0, -5], 0.72, -0.08);
    },
  },
  'villa-1': { cam: [10, 4.6, 15.5], look: [0.5, 2.6, 0], build: (s, d) => { place(s, 'villa', d); landscape(s, 3, 26, 22, 70); } },
  'villa-2': { fov: 36, cam: [15, 1.8, 9], look: [1.5, 3.4, -0.5], build: (s, d) => { place(s, 'villa', d); landscape(s, 4, 26, 22, 70); } },
  'villa-3': { dusk: 1, cam: [-7.5, 3.6, 17], look: [1, 2.8, 0], build: (s, d) => { place(s, 'villa', d); landscape(s, 5, 26, 22, 70); } },
  'penthouse-1': { cam: [10.5, 8, 15.5], look: [0, 6.4, 0], build: (s, d) => { place(s, 'penthouse', d); landscape(s, 6, 22, 18, 70); } },
  'penthouse-2': { fov: 40, cam: [5.5, 1.4, 9.5], look: [0, 7.4, 0], build: (s, d) => { place(s, 'penthouse', d); landscape(s, 7, 22, 18, 70); } },
  'penthouse-3': { dusk: 1, cam: [-9.5, 6.2, 15], look: [0, 6.2, 0], build: (s, d) => { place(s, 'penthouse', d); landscape(s, 8, 22, 18, 70); } },
  'lakehouse-1': { cam: [3, 2.0, 19], look: [0, 1.5, -1], build: (s, d) => { place(s, 'waterfront', d); landscape(s, 10, 30, 20, 70, -999); } },
  'lakehouse-2': { cam: [10, 1.7, 11], look: [2, 1.0, 1], build: (s, d) => { place(s, 'waterfront', d); landscape(s, 11, 30, 20, 70); } },
  'lakehouse-3': { dusk: 1, cam: [-8.5, 2.6, 14.5], look: [1, 1.6, -1], build: (s, d) => { place(s, 'waterfront', d); landscape(s, 12, 30, 20, 70); } },
  'story-arrival': { dusk: 0.2, cam: [-12.5, 1.65, 17], look: [-1.5, 2.6, 0], build: (s, d) => { place(s, 'villa', d); pathPads(s); landscape(s, 13, 46, 12, 60); } },
  'story-exterior': { dusk: 0.75, cam: [9, 3.0, 23], look: [0, 3.0, 0], build: (s, d) => { place(s, 'villa', d); landscape(s, 14, 40, 18, 70); } },
  'story-living': { ao: false, fov: 50, cam: [6.4, 1.35, 3.6], look: [-6, 1.05, -1.2], build: (s) => livingRoom(s) },
  'story-terrace': { dusk: 0.85, fov: 44, cam: [-1.2, 2.35, 1.7], look: [10, 0.8, 9], build: (s, d) => { place(s, 'villa', d); landscape(s, 15, 60, 14, 80, 6); } },
  'lifestyle-water': { dusk: 0.9, fov: 38, cam: [8.5, 0.95, 11.5], look: [0.5, 1.5, -1], build: (s, d) => { place(s, 'waterfront', d); bigWater(s); landscape(s, 17, 30, 20, 70, -999, (_x, z) => z < 0); } },
  'lifestyle-terrace': { dusk: 0.4, cam: [7.2, 9.4, 7.2], look: [0.3, 7.0, 0.3], build: (s, d) => { place(s, 'penthouse', d); landscape(s, 16, 22, 18, 70); } },
};

declare global {
  interface Window {
    renderPreset: (name: string, w: number, h: number) => string;
    presetNames: string[];
  }
}

window.presetNames = Object.keys(presets);
window.renderPreset = (name, w, h) => {
  const p = presets[name];
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  configureRenderer(renderer, true);
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  const scene = new THREE.Scene();
  const dusk = p.dusk ?? 0;
  createEnvironment(scene, renderer, { shadows: true, shadowMapSize: 2048, dusk, gradientSky: name !== 'collection-poster' });
  p.build(scene, dusk);
  const cam = new THREE.PerspectiveCamera(p.fov ?? 32, w / h, 0.1, 300);
  cam.position.set(...p.cam);
  cam.lookAt(new THREE.Vector3(...p.look));
  if (p.ao === false || (window as unknown as { noAO?: boolean }).noAO) renderer.render(scene, cam);
  else createComposer(renderer, scene, cam, w, h, 1).render();
  const url = renderer.domElement.toDataURL('image/png');
  renderer.dispose();
  return url;
};
