import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Optional ambient-occlusion pipeline. Gives the concept models the soft contact
 * shading of a photographed architectural model. Used for stills and high-quality desktops only.
 */
export function createComposer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, w: number, h: number, strength = 1) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, w, h);
  ao.output = GTAOPass.OUTPUT.Default;
  ao.blendIntensity = strength;
  ao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.6, scale: 1.0, samples: 16 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  composer.addPass(ao);
  composer.addPass(new OutputPass());
  return {
    composer,
    render: () => composer.render(),
    setSize: (ww: number, hh: number) => composer.setSize(ww, hh),
    setPixelRatio: (r: number) => composer.setPixelRatio(r),
    dispose: () => {
      ao.dispose();
      composer.dispose();
    },
  };
}
