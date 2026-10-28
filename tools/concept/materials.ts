import * as THREE from 'three';

/**
 * Shared material palette for the concept models.
 * Each model gets its own clones (see createPalette) so neighbours can be faded independently.
 */
export const COLORS = {
  background: new THREE.Color('#EFE9DF'),
  ground: new THREE.Color('#E6DECF'),
  stone: new THREE.Color('#CBBEA6'),
  stoneDark: new THREE.Color('#A79780'),
  limestone: new THREE.Color('#EEE7DA'),
  charcoal: new THREE.Color('#2C2B28'),
  bronze: new THREE.Color('#7B5D3E'),
  timber: new THREE.Color('#9C7A58'),
  olive: new THREE.Color('#6E6F4A'),
  oliveDark: new THREE.Color('#585A3B'),
  glass: new THREE.Color('#1F2629'),
  water: new THREE.Color('#5F6E70'),
};

let noiseTex: THREE.Texture | null = null;

/** Small tiling noise texture used as a roughness/bump map so stone does not look like plastic. */
export function getNoiseTexture(): THREE.Texture {
  if (noiseTex) return noiseTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 200 + Math.random() * 55;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseTex = new THREE.CanvasTexture(c);
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
  noiseTex.repeat.set(4, 4);
  return noiseTex;
}

export type Palette = ReturnType<typeof createPalette>;

export function createPalette() {
  const noise = getNoiseTexture();
  const std = (color: THREE.Color, roughness: number, metalness = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

  return {
    stone: std(COLORS.stone, 0.92, 0, { roughnessMap: noise, bumpMap: noise, bumpScale: 0.6 }),
    stoneDark: std(COLORS.stoneDark, 0.95, 0, { roughnessMap: noise, bumpMap: noise, bumpScale: 0.8 }),
    limestone: std(COLORS.limestone, 0.85, 0, { roughnessMap: noise }),
    charcoal: std(COLORS.charcoal, 0.5, 0.3),
    bronze: std(COLORS.bronze, 0.32, 0.85, { envMapIntensity: 1.6 }),
    timber: std(COLORS.timber, 0.8, 0, { roughnessMap: noise }),
    olive: std(COLORS.olive, 0.9, 0),
    oliveDark: std(COLORS.oliveDark, 0.9, 0),
    trunk: std(new THREE.Color('#6B5A48'), 0.95),
    glass: std(COLORS.glass, 0.04, 0.9, { emissive: new THREE.Color('#FFB066'), emissiveIntensity: 0.005, envMapIntensity: 1.8 }),
    water: std(COLORS.water, 0.05, 0.6, { envMapIntensity: 1.5 }),
  };
}

/** Sets the warmth of interior light visible through glazing (0 = daylight, 1 = dusk). */
export function setInteriorGlow(p: Palette, amount: number) {
  p.glass.emissive.set('#FFC992');
  p.glass.emissiveIntensity = amount < 0.5 ? 0.005 : 0.03 + (amount - 0.5) * 0.5;
  p.glass.color.set(amount > 0.5 ? '#3A3430' : '#1F2629');
}
