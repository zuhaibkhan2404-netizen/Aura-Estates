import * as THREE from 'three';
import { gsap } from 'gsap';
import type { Residence } from '../data/properties';
import { buildResidenceModel, collectMaterials, type ResidenceModel } from './models';
import { configureRenderer, createEnvironment, type EnvironmentHandles } from './environment';

export type Quality = 'high' | 'medium' | 'low';

export interface ShowroomOptions {
  residences: Residence[];
  initialIndex: number;
  quality: Quality;
  reducedMotion: boolean;
  finePointer: boolean;
  /** Called once the first frame is on screen, so the HTML poster can fade out. */
  onFirstFrame?: () => void;
  /** Called when a drag/swipe settles on a residence. */
  onDragSelect?: (index: number) => void;
  onAssetIssue?: (message: string) => void;
  onContextLost?: () => void;
}

interface Item {
  wrapper: THREE.Group;
  model: ResidenceModel;
  /** Local bounding box size/centre of the model, used to frame the detail camera. */
  size: THREE.Vector3;
  center: THREE.Vector3;
  materials: THREE.Material[];
  opacity: number;
}

const SPACING = 17;
const QUALITY = {
  high: { dpr: 1.75, shadows: true, shadowMap: 2048, antialias: true },
  medium: { dpr: 1.4, shadows: true, shadowMap: 1024, antialias: true },
  low: { dpr: 1.1, shadows: false, shadowMap: 512, antialias: false },
} as const;

/**
 * One WebGL canvas, one scene. Owns the collection rail, camera choreography,
 * drag/swipe input and render-on-demand loop. All UI lives in HTML outside the canvas.
 */
export class ShowroomScene {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.5, 260);
  private env: EnvironmentHandles;
  private items: Item[] = [];
  private opts: ShowroomOptions;
  private state = { rail: 0, focus: 0 };
  private focusIndex = 0;
  private pointer = { tx: 0, ty: 0, x: 0, y: 0 };
  private dirty = true;
  private visible = true;
  private raf = 0;
  private firstFrameSent = false;
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();
  private tmpC = new THREE.Vector3();
  private lookAt = new THREE.Vector3();
  private interactive = true;
  private cleanupInput: () => void = () => {};

  constructor(container: HTMLElement, opts: ShowroomOptions) {
    this.opts = opts;
    const q = QUALITY[opts.quality];
    // Throws if WebGL is unavailable — the React wrapper catches this and shows the image fallback.
    this.renderer = new THREE.WebGLRenderer({ antialias: q.antialias, alpha: false, powerPreference: 'high-performance' });
    configureRenderer(this.renderer, q.shadows);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.className = 'showroom-canvas';
    container.appendChild(this.canvas);

    this.env = createEnvironment(this.scene, this.renderer, { shadows: q.shadows, shadowMapSize: q.shadowMap });

    opts.residences.forEach((r, i) => {
      const model = buildResidenceModel(r.model.procedural);
      const wrapper = new THREE.Group();
      wrapper.add(model.group);
      this.scene.add(wrapper);
      const box = new THREE.Box3().setFromObject(model.group);
      this.items.push({ wrapper, model, materials: collectMaterials(model.group), opacity: 1, size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()) });
      if (r.model.glb) this.loadGlb(i, r);
    });

    this.state.rail = opts.initialIndex;
    this.focusIndex = opts.initialIndex;

    this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    this.resizeObserver = new ResizeObserver(() => this.resize(container));
    this.resizeObserver.observe(container);
    this.resize(container);
    this.cleanupInput = this.attachInput(container);
    this.loop();
  }

  /* ---------------- public API ---------------- */

  setSelection(index: number) {
    gsap.killTweensOf(this.state, 'rail');
    gsap.to(this.state, {
      rail: index,
      duration: this.opts.reducedMotion ? 0 : 0.95,
      ease: 'power3.inOut',
      onUpdate: this.invalidate,
      onComplete: this.invalidate,
    });
    this.focusIndex = index;
  }

  /** Explore: move the camera toward the selected building and fade the neighbours. */
  focus(index: number): Promise<void> {
    this.focusIndex = index;
    this.interactive = false;
    return new Promise((resolve) => {
      gsap.killTweensOf(this.state, 'focus');
      gsap.to(this.state, {
        focus: 1,
        duration: this.opts.reducedMotion ? 0 : 1.1,
        ease: 'power2.inOut',
        onUpdate: this.invalidate,
        onComplete: () => { this.invalidate(); resolve(); },
      });
    });
  }

  unfocus(): Promise<void> {
    return new Promise((resolve) => {
      gsap.killTweensOf(this.state, 'focus');
      gsap.to(this.state, {
        focus: 0,
        duration: this.opts.reducedMotion ? 0 : 0.95,
        ease: 'power2.inOut',
        onUpdate: this.invalidate,
        onComplete: () => { this.interactive = true; this.invalidate(); resolve(); },
      });
    });
  }

  setVisible(v: boolean) {
    this.visible = v;
    if (v) this.invalidate();
  }

  setReducedMotion(v: boolean) {
    this.opts.reducedMotion = v;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    gsap.killTweensOf(this.state);
    this.cleanupInput();
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.items.forEach((it) => it.materials.forEach((m) => m.dispose()));
    this.env.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }

  /* ---------------- internals ---------------- */

  private invalidate = () => {
    this.dirty = true;
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.opts.onContextLost?.();
  };

  private resize(container: HTMLElement) {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = this.camera.aspect < 0.9 ? 38 : 30;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  private async loadGlb(index: number, r: Residence) {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(r.model.glb!);
      if (this.disposed) return;
      const root = gltf.scene;
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const target = r.model.glbTargetHeight ?? 6.5;
      const s = target / Math.max(size.y, 0.001);
      root.scale.setScalar(s);
      root.rotation.y = r.model.glbRotationY ?? 0;
      const box2 = new THREE.Box3().setFromObject(root);
      const c = box2.getCenter(new THREE.Vector3());
      root.position.set(-c.x, -box2.min.y, -c.z);
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
      });
      const item = this.items[index];
      item.wrapper.remove(item.model.group);
      item.wrapper.add(root);
      item.materials = collectMaterials(root);
      const fitted = new THREE.Box3().setFromObject(root);
      item.size = fitted.getSize(new THREE.Vector3());
      item.center = fitted.getCenter(new THREE.Vector3());
      item.model = { ...item.model, group: root, height: target, focusTarget: new THREE.Vector3(0, target * 0.45, 0), kind: 'glb' };
      this.invalidate();
    } catch (err) {
      console.warn(`[AUREL] GLB for "${r.name}" could not be loaded, keeping the concept model.`, err);
      this.opts.onAssetIssue?.(`3D model for ${r.name} is missing — showing the concept model.`);
    }
  }

  private attachInput(el: HTMLElement) {
    let startX = 0;
    let startRail = 0;
    let dragging = false;
    let pointerId = -1;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    const max = this.items.length - 1;

    const down = (e: PointerEvent) => {
      if (!this.interactive || e.button !== 0) return;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      lastT = performance.now();
      startRail = this.state.rail;
      dragging = false;
      velocity = 0;
    };
    const move = (e: PointerEvent) => {
      if (this.opts.finePointer && e.pointerType === 'mouse') {
        const r = el.getBoundingClientRect();
        this.pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        this.pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        this.invalidate();
      }
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (!dragging && Math.abs(dx) > 6) {
        dragging = true;
        gsap.killTweensOf(this.state, 'rail');
        el.setPointerCapture(e.pointerId);
        el.classList.add('is-dragging');
      }
      if (!dragging) return;
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      velocity = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastT = now;
      let rail = startRail - dx / (el.clientWidth * 0.55);
      // Rubber-band past the ends
      if (rail < 0) rail = rail * 0.3;
      if (rail > max) rail = max + (rail - max) * 0.3;
      this.state.rail = rail;
      this.invalidate();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = -1;
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-dragging');
      const projected = this.state.rail - velocity * 0.35;
      const index = Math.min(max, Math.max(0, Math.round(projected)));
      this.setSelection(index);
      this.opts.onDragSelect?.(index);
    };
    const leave = () => {
      this.pointer.tx = 0;
      this.pointer.ty = 0;
      this.invalidate();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave);
    };
  }

  private layout() {
    const { rail, focus } = this.state;
    this.items.forEach((it, i) => {
      const d = i - rail;
      const a = Math.min(Math.abs(d), 1);
      const x = d * SPACING * (1 - 0.16 * a);
      it.wrapper.position.set(x, 0, -a * 5);
      it.wrapper.scale.setScalar(1 - 0.28 * a);
      it.wrapper.rotation.y = -d * 0.08;
      const target = i === this.focusIndex ? 1 : 1 - focus;
      this.setOpacity(it, target);
    });
  }

  private setOpacity(it: Item, o: number) {
    if (Math.abs(it.opacity - o) < 0.001) return;
    it.opacity = o;
    const transparent = o < 0.999;
    it.materials.forEach((m) => {
      m.transparent = transparent;
      m.opacity = o;
      m.depthWrite = o > 0.5;
    });
    it.wrapper.visible = o > 0.01;
    it.wrapper.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = o > 0.6;
    });
  }

  private updateCamera() {
    const aspect = this.camera.aspect;
    const dist = aspect >= 1.35 ? 25 : aspect >= 0.9 ? 29 : 33;
    // Collection pose
    this.tmpA.set(0, 5.4 + dist * 0.09, dist);
    this.tmpB.set(0, aspect >= 0.9 ? 2.8 : 3.8, 0);

    // Detail pose: three-quarter view framed from the model's bounding box.
    // On wide screens the building is shifted left so the HTML panel can sit on the right.
    const it = this.items[this.focusIndex];
    if (it && this.state.focus > 0.0001) {
      const s = it.wrapper.scale.x;
      const w = Math.max(it.size.x, it.size.z) * s;
      const h = it.model.height * s;
      const vHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
      const hHalf = Math.atan(Math.tan(vHalf) * aspect);
      const wide = aspect >= 1.1;
      const share = wide ? 0.54 : 0.9; // portion of the frame width the building may use
      const distW = (w * 0.5) / (share * Math.tan(hHalf));
      const distH = (h * 0.62) / Math.tan(vHalf);
      const dist = Math.max(distW, distH, 9);
      const center = this.tmpC.set(it.wrapper.position.x, h * 0.42, it.wrapper.position.z);
      const dir = new THREE.Vector3(-0.42, 0.26, 1).normalize();
      const shift = wide ? dist * Math.tan(hHalf) * 0.36 : 0;
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize().negate();
      const detailLook = center.clone().addScaledVector(right, shift);
      const detailPos = detailLook.clone().addScaledVector(dir, dist);
      const f = this.state.focus;
      this.tmpA.lerp(detailPos, f);
      this.tmpB.lerp(detailLook, f);
    }

    // Very subtle pointer response (desktop only, never in reduced motion)
    const p = this.pointer;
    if (!this.opts.reducedMotion) {
      p.x += (p.tx - p.x) * 0.06;
      p.y += (p.ty - p.y) * 0.06;
      if (Math.abs(p.tx - p.x) > 0.001 || Math.abs(p.ty - p.y) > 0.001) this.dirty = true;
    } else {
      p.x = p.y = 0;
    }
    this.tmpA.x += p.x * 0.45;
    this.tmpA.y += -p.y * 0.25;

    this.camera.position.copy(this.tmpA);
    this.lookAt.copy(this.tmpB);
    this.camera.lookAt(this.lookAt);
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (!this.visible || document.hidden || !this.dirty) return;
    this.dirty = false;
    this.layout();
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
    if (!this.firstFrameSent) {
      this.firstFrameSent = true;
      this.opts.onFirstFrame?.();
    }
  };
}

/** Picks a quality tier from device hints. Conservative on touch devices. */
export function detectQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = window.innerWidth < 768;
  if (cores <= 2 || mem <= 2) return 'low';
  if (coarse || small) return 'medium';
  return 'high';
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}
