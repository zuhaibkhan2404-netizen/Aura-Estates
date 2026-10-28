import * as THREE from 'three';
import { COLORS } from './materials';

export interface EnvironmentOptions {
  shadows: boolean;
  shadowMapSize: number;
  /** 0 = soft daylight gallery, 1 = warm dusk (used for some rendered stills). */
  dusk?: number;
  /** Gradient sky for stills; the live showroom uses a flat gallery tone. */
  gradientSky?: boolean;
}

export interface EnvironmentHandles {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  ground: THREE.Mesh;
  dispose: () => void;
}

function gradientTexture(top: string, bottom: string) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A simple sky dome (zenith → horizon → ground) with a warm sun patch, used only to bake reflections. */
function skyEnvironmentScene(zenith: THREE.Color, horizon: THREE.Color, groundCol: THREE.Color, sunDir: THREE.Vector3, sunCol: THREE.Color) {
  const env = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 48, 24);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 50;
    if (y >= 0) c.lerpColors(horizon, zenith, Math.pow(y, 0.6));
    else c.lerpColors(horizon, groundCol, Math.min(1, -y * 4));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8), new THREE.MeshBasicMaterial({ color: sunCol.clone().multiplyScalar(6) }));
  sun.position.copy(sunDir).multiplyScalar(40);
  env.add(sun);
  return env;
}

/** Continuous, softly lit ground plane + gallery lighting shared by the live scene and stills. */
export function createEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer, opts: EnvironmentOptions): EnvironmentHandles {
  const dusk = opts.dusk ?? 0;
  const horizon = new THREE.Color().lerpColors(COLORS.background, new THREE.Color('#E3C7A4'), dusk);

  if (opts.gradientSky) {
    const top = dusk > 0.5 ? '#8E8A95' : '#D9DDD9';
    scene.background = gradientTexture(top, '#' + horizon.getHexString());
  } else {
    scene.background = horizon.clone();
  }
  scene.fog = new THREE.Fog(horizon, 38, 105);

  const sunPos = new THREE.Vector3(-20, 11 - dusk * 5, 5);
  const sunColor = new THREE.Color().lerpColors(new THREE.Color('#FFE7C7'), new THREE.Color('#FFB47A'), dusk);
  const zenith = new THREE.Color().lerpColors(new THREE.Color('#C9D3D6'), new THREE.Color('#7F7C8C'), dusk);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = skyEnvironmentScene(zenith, horizon, new THREE.Color('#B5A68C'), sunPos.clone().normalize(), sunColor);
  const envTex = pmrem.fromScene(envScene, 0.02).texture;
  envScene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
  scene.environment = envTex;
  scene.environmentIntensity = 0.55 - dusk * 0.2;

  const hemi = new THREE.HemisphereLight(new THREE.Color('#F7F1E6'), new THREE.Color('#A8977C'), 0.3 - dusk * 0.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(sunColor, 3.4 - dusk * 1.3);
  // Low, raking sun from the front-left gives long architectural shadows.
  sun.position.copy(sunPos);
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);
  if (opts.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(opts.shadowMapSize, opts.shadowMapSize);
    const s = sun.shadow.camera;
    s.left = -30; s.right = 30; s.top = 22; s.bottom = -22; s.near = 1; s.far = 70;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 4;
    s.updateProjectionMatrix();
  }

  const groundMat = new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(220, 64), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);

  return {
    sun,
    hemi,
    ground,
    dispose: () => {
      pmrem.dispose();
      envTex.dispose();
      groundMat.dispose();
      ground.geometry.dispose();
    },
  };
}

export function configureRenderer(renderer: THREE.WebGLRenderer, shadows: boolean) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}
