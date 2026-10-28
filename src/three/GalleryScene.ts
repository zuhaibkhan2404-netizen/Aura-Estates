import * as THREE from 'three';
import { gsap } from 'gsap';
import { photoUrl, type Photo } from '../lib/images';

/**
 * WebGL photo gallery: each residence is a shader-driven plane on a curved arc.
 * - drag / buttons / keys move along the arc; planes bend and split RGB with velocity
 * - the arriving residence "pops" (texture zoom-out, ripple, scale overshoot)
 * - expand() flies the active photo to full screen for the detail layout
 * All text and controls are HTML outside the canvas.
 */

const VERT = /* glsl */ `
uniform float uBend;
uniform float uSkew;
uniform float uWave;
uniform float uTime;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  float x = uv.x - 0.5;
  p.z -= abs(uBend) * x * x * 1.6;
  p.y += uSkew * x * 0.35;
  p.z += sin(uv.y * 3.14159 + uTime * 3.0) * uWave * 0.08 * sin(uv.x * 3.14159);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uImage;
uniform vec2 uPlane;
uniform float uZoom;
uniform float uRGB;
uniform float uGray;
uniform float uDim;
uniform float uAppear;
uniform float uOpacity;
uniform vec3 uGlow;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
vec2 cover(vec2 uv) {
  float pa = uPlane.x / uPlane.y;
  float ia = uImage.x / max(uImage.y, 1.0);
  vec2 s = pa > ia ? vec2(1.0, ia / pa) : vec2(pa / ia, 1.0);
  return (uv - 0.5) * s / uZoom + 0.5;
}
void main() {
  vec2 uv = cover(vUv);
  float r = texture2D(uTex, uv + vec2(uRGB, 0.0)).r;
  vec4 base = texture2D(uTex, uv);
  float b = texture2D(uTex, uv - vec2(uRGB, 0.0)).b;
  vec3 col = vec3(r, base.g, b);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum), uGray);
  col *= 1.0 - uDim;
  vec2 d = vUv - 0.5;
  col *= 1.0 - dot(d, d) * 0.45;
  // Dissolve reveal: noisy sweep from bottom to top with a warm edge
  float n = noise(vUv * 7.0) * 0.35 + (1.0 - vUv.y) * 0.65;
  float shown = 1.0 - smoothstep(uAppear - 0.06, uAppear, n);
  float edge = smoothstep(uAppear - 0.12, uAppear - 0.04, n) * shown;
  col += uGlow * edge * 1.4;
  gl_FragColor = vec4(col, shown * uOpacity);
  #include <colorspace_fragment>
}`;

export interface GalleryItem {
  photo: Photo;
}

export interface GalleryOptions {
  items: GalleryItem[];
  initialIndex: number;
  reducedMotion: boolean;
  quality: 'high' | 'low';
  onSelect: (i: number) => void;
  onExploreRequest: () => void;
  onFirstFrame: () => void;
  onContextLost: () => void;
}

interface Plane {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  u: Record<string, THREE.IUniform>;
  pop: { scale: number; intro: number };
  loaded: Promise<void>;
}

export class GalleryScene {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  private planes: Plane[] = [];
  private opts: GalleryOptions;
  private state = { rail: 0, expand: 0 };
  private active = 0;
  private vel = 0;
  private prevRail = 0;
  private visible = true;
  private raf = 0;
  private clock = new THREE.Clock();
  private disposed = false;
  private first = false;
  private introDone = false;
  private planeW = 1;
  private planeH = 1;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private interactive = true;
  private ro: ResizeObserver;
  private cleanup: () => void;
  private raycaster = new THREE.Raycaster();

  constructor(private container: HTMLElement, opts: GalleryOptions) {
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.quality === 'high' ? 1.75 : 1.25));
    this.renderer.setClearColor(0x000000, 0);
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'gallery-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(this.canvas);

    const geo = new THREE.PlaneGeometry(1, 1, 48, 24);
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const texWidth = window.innerWidth > 1200 ? 2000 : 1400;

    opts.items.forEach((item, i) => {
      const placeholder = new THREE.DataTexture(new Uint8Array([40, 38, 34, 255]), 1, 1);
      placeholder.needsUpdate = true;
      const u: Record<string, THREE.IUniform> = {
        uTex: { value: placeholder },
        uImage: { value: new THREE.Vector2(1, 1) },
        uPlane: { value: new THREE.Vector2(1.5, 1) },
        uZoom: { value: 1 },
        uRGB: { value: 0 },
        uGray: { value: 0 },
        uDim: { value: 0 },
        uAppear: { value: opts.reducedMotion ? 1.2 : 0 },
        uOpacity: { value: 1 },
        uBend: { value: 0 },
        uSkew: { value: 0 },
        uWave: { value: 0 },
        uTime: { value: 0 },
        uGlow: { value: new THREE.Color('#E8B979') },
      };
      const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = i;
      this.scene.add(mesh);
      const loaded = new Promise<void>((resolve) => {
        const apply = (t: THREE.Texture) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = maxAniso;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          const img = t.image as HTMLImageElement;
          u.uImage.value.set(img.naturalWidth || img.width, img.naturalHeight || img.height);
          u.uTex.value = t;
          resolve();
        };
        const local = () => loader.load(item.photo.fallback, apply, undefined, () => resolve());
        const url = photoUrl(item.photo, texWidth);
        if (url === item.photo.fallback) local();
        else loader.load(url, apply, undefined, local);
      });
      this.planes.push({ mesh, u, pop: { scale: 1, intro: opts.reducedMotion ? 0 : 1 }, loaded });
    });

    this.state.rail = this.prevRail = this.active = opts.initialIndex;
    this.canvas.addEventListener('webglcontextlost', this.onLost);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.cleanup = this.attachInput();
    this.loop();
  }

  /* ---------------- public API ---------------- */

  /** Fly planes in and dissolve them into view (called when the section becomes visible). */
  intro() {
    if (this.introDone) return;
    this.introDone = true;
    const rm = this.opts.reducedMotion;
    this.planes.forEach((p, i) => {
      const order = Math.abs(i - this.active);
      p.loaded.then(() => {
        if (rm) { p.u.uAppear.value = 1.2; p.pop.intro = 0; return; }
        gsap.to(p.pop, { intro: 0, duration: 1.6, delay: 0.1 + order * 0.14, ease: 'expo.out' });
        gsap.to(p.u.uAppear, { value: 1.2, duration: 1.8, delay: 0.1 + order * 0.14, ease: 'power2.out' });
        if (i === this.active) gsap.fromTo(p.u.uZoom, { value: 1.35 }, { value: 1, duration: 2.2, ease: 'expo.out' });
      });
    });
  }

  setSelection(index: number) {
    if (index === this.active && Math.abs(this.state.rail - index) < 0.001) return;
    const rm = this.opts.reducedMotion;
    this.active = index;
    gsap.killTweensOf(this.state, 'rail');
    gsap.to(this.state, { rail: index, duration: rm ? 0 : 1.25, ease: 'power3.inOut' });
    if (rm) return;
    const p = this.planes[index];
    // The arriving house "pops": scale overshoot, texture zoom-out and a soft ripple.
    gsap.fromTo(p.pop, { scale: 0.86 }, { scale: 1, duration: 1.3, delay: 0.25, ease: 'back.out(1.8)' });
    gsap.fromTo(p.u.uZoom, { value: 1.3 }, { value: 1, duration: 1.8, delay: 0.15, ease: 'expo.out' });
    gsap.fromTo(p.u.uWave, { value: 1 }, { value: 0, duration: 1.6, delay: 0.3, ease: 'power2.out' });
  }

  /** Active photo flies forward and fills the viewport. */
  expand(): Promise<void> {
    this.interactive = false;
    return new Promise((res) => {
      gsap.to(this.state, { expand: 1, duration: this.opts.reducedMotion ? 0 : 1.15, ease: 'power3.inOut', onComplete: () => res() });
      if (!this.opts.reducedMotion) gsap.fromTo(this.planes[this.active].u.uZoom, { value: 1 }, { value: 1.12, duration: 1.4, ease: 'power2.out' });
    });
  }

  collapse(): Promise<void> {
    return new Promise((res) => {
      gsap.to(this.state, { expand: 0, duration: this.opts.reducedMotion ? 0 : 1, ease: 'power3.inOut', onComplete: () => { this.interactive = true; res(); } });
      if (!this.opts.reducedMotion) gsap.to(this.planes[this.active].u.uZoom, { value: 1, duration: 1, ease: 'power2.out' });
    });
  }

  setVisible(v: boolean) { this.visible = v; }
  setReducedMotion(v: boolean) { this.opts.reducedMotion = v; }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.cleanup();
    this.ro.disconnect();
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    gsap.killTweensOf(this.state);
    this.planes.forEach((p) => {
      gsap.killTweensOf(p.pop);
      Object.values(p.u).forEach((uu) => gsap.killTweensOf(uu));
      (p.u.uTex.value as THREE.Texture).dispose();
      p.mesh.material.dispose();
    });
    this.planes[0]?.mesh.geometry.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }

  /* ---------------- internals ---------------- */

  private onLost = (e: Event) => { e.preventDefault(); this.opts.onContextLost(); };

  private resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.position.set(0, 0, 10);
    this.camera.updateProjectionMatrix();
    const visH = 2 * 10 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const visW = visH * this.camera.aspect;
    if (this.camera.aspect >= 1) {
      this.planeH = visH * 0.66;
      this.planeW = Math.min(this.planeH * 1.5, visW * 0.62);
    } else {
      this.planeW = visW * 0.74;
      this.planeH = Math.min(this.planeW * 1.32, visH * 0.66);
    }
    this.planes.forEach((p) => p.u.uPlane.value.set(this.planeW, this.planeH));
  }

  private attachInput() {
    const el = this.container;
    let down = false;
    let dragging = false;
    let startX = 0;
    let startRail = 0;
    let lastX = 0;
    let lastT = 0;
    let v = 0;
    let id = -1;
    const max = this.planes.length - 1;

    const onDown = (e: PointerEvent) => {
      if (!this.interactive || e.button !== 0) return;
      down = true; dragging = false; id = e.pointerId;
      startX = lastX = e.clientX; lastT = performance.now(); startRail = this.state.rail; v = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        const r = el.getBoundingClientRect();
        this.pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        this.pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      }
      if (!down || e.pointerId !== id) return;
      const dx = e.clientX - startX;
      if (!dragging && Math.abs(dx) > 6) {
        dragging = true;
        gsap.killTweensOf(this.state, 'rail');
        el.setPointerCapture(e.pointerId);
        el.classList.add('is-dragging');
      }
      if (!dragging) return;
      const now = performance.now();
      v = (e.clientX - lastX) / Math.max(1, now - lastT);
      lastX = e.clientX; lastT = now;
      let rail = startRail - dx / (el.clientWidth * 0.42);
      if (rail < 0) rail *= 0.3;
      if (rail > max) rail = max + (rail - max) * 0.3;
      this.state.rail = rail;
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== id) return;
      down = false;
      if (dragging) {
        dragging = false;
        el.classList.remove('is-dragging');
        const target = Math.min(max, Math.max(0, Math.round(this.state.rail - v * 0.5)));
        this.active = -1; // force pop even if we land on the same index
        this.setSelection(target);
        this.opts.onSelect(target);
        return;
      }
      // Click: select the plane under the pointer, or explore the active one.
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      const hits = this.raycaster.intersectObjects(this.planes.map((p) => p.mesh));
      if (!hits.length) return;
      const idx = this.planes.findIndex((p) => p.mesh === hits[0].object);
      if (idx === this.active) this.opts.onExploreRequest();
      else { this.setSelection(idx); this.opts.onSelect(idx); }
    };
    const onLeave = () => { this.pointer.tx = 0; this.pointer.ty = 0; };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onLeave);
    };
  }

  private layout(t: number, dt: number) {
    const rm = this.opts.reducedMotion;
    const { rail, expand } = this.state;
    // Velocity of the rail drives bend + RGB split
    const rawVel = (rail - this.prevRail) / Math.max(dt, 1 / 120);
    this.prevRail = rail;
    this.vel += (rawVel - this.vel) * 0.18;
    const vel = rm ? 0 : THREE.MathUtils.clamp(this.vel, -6, 6);

    const aspect = this.camera.aspect;
    const radius = aspect >= 1 ? 11 : 9;
    const step = aspect >= 1 ? 0.62 : 0.78;
    const visH = 2 * 10 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const visW = visH * aspect;
    const cover = Math.max(visW / this.planeW, visH / this.planeH) * 1.04;

    this.planes.forEach((p, i) => {
      const d = i - rail;
      const ad = Math.min(Math.abs(d), 1.4);
      const ang = d * step;
      let x = Math.sin(ang) * radius;
      let z = (Math.cos(ang) - 1) * radius - ad * 0.6;
      let y = rm ? 0 : Math.sin(t * 0.7 + i * 1.3) * 0.06;
      let ry = -ang * 0.85;
      let s = (1 - 0.16 * Math.min(ad, 1)) * p.pop.scale;
      // intro fly-in from depth
      z -= p.pop.intro * 9;
      y -= p.pop.intro * 1.5;

      const isActive = i === Math.round(rail);
      if (expand > 0) {
        if (i === this.active) {
          x = THREE.MathUtils.lerp(x, 0, expand);
          y = THREE.MathUtils.lerp(y, 0, expand);
          z = THREE.MathUtils.lerp(z, 0.01, expand);
          ry = THREE.MathUtils.lerp(ry, 0, expand);
          s = THREE.MathUtils.lerp(s, cover, expand);
        } else {
          z -= expand * 6;
        }
      }
      p.mesh.position.set(x, y, z);
      p.mesh.rotation.y = ry;
      p.mesh.scale.set(this.planeW * s, this.planeH * s, 1);
      p.mesh.renderOrder = i === this.active ? 100 : 50 - Math.round(ad * 10);

      const u = p.u;
      u.uTime.value = t;
      u.uBend.value = vel * 0.22 * (1 - expand);
      u.uSkew.value = vel * 0.05 * (1 - expand);
      u.uRGB.value = Math.min(Math.abs(vel) * 0.004, 0.02);
      u.uGray.value = Math.min(ad, 1) * 0.75 * (isActive ? 0 : 1);
      u.uDim.value = Math.min(ad, 1) * 0.5 + (i === this.active ? expand * 0.25 : 0);
      u.uOpacity.value = i === this.active ? 1 : 1 - expand;
    });

    // Gentle camera response to the pointer (desktop only)
    const pt = this.pointer;
    if (!rm) {
      pt.x += (pt.tx - pt.x) * 0.05;
      pt.y += (pt.ty - pt.y) * 0.05;
    }
    const k = 1 - expand;
    this.camera.position.set(pt.x * 0.5 * k, -pt.y * 0.3 * k, 10);
    this.camera.lookAt(0, 0, -2);
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.clock.getDelta();
    if (!this.visible || document.hidden) return;
    this.layout(this.clock.elapsedTime, dt);
    this.renderer.render(this.scene, this.camera);
    if (!this.first) { this.first = true; this.opts.onFirstFrame(); }
  };
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
