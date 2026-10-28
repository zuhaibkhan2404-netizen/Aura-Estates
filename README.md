# AUREL Estates — demonstration site

A responsive luxury real-estate site with an interactive 3D showroom, a collection-to-detail
camera transition, a short scroll-linked story and a validated viewing-enquiry form.

**Everything here is demonstration content.** AUREL Estates is fictional; the residences, places,
figures and images are samples. All images are concept renders generated from simplified
procedural 3D models (see `tools/stills-entry.ts`). Nothing is presented as photography or as a
verified listing, and the UI labels it that way.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

Node 18+ is recommended. `npm run build:esbuild` is an alternative build that uses esbuild only
(this is the build that was tested; see *Testing* below).

## Stack

| Concern | Choice |
| --- | --- |
| UI | React 19 + TypeScript |
| 3D | Three.js r169 (one WebGL canvas, `src/three/`) |
| Motion | GSAP 3.12 + ScrollTrigger |
| Build | Vite 5 (or `scripts/build.mjs` with esbuild) |

**Note on React Three Fiber / Drei.** The brief named R3F + Drei. They could not be installed in
the environment this was built in (package registry blocked), so the 3D layer is written in plain
Three.js inside a React component (`ShowroomScene` class + `Showroom.tsx`). The structure maps
directly onto R3F if you want to migrate: `models.ts` factories → `<Residence />` components,
`environment.ts` → `<Lights />` + `<Ground />`, the camera choreography in `updateCamera()` →
a `useFrame` hook. Nothing else depends on the choice.

## Project structure

```
src/
  data/properties.ts      ← ALL editable content (residences, images, story, form endpoint)
  three/
    ShowroomScene.ts      ← canvas, rail layout, drag/swipe, camera transition, render-on-demand
    models.ts             ← procedural concept models (villa, penthouse, waterfront)
    materials.ts          ← stone / limestone / bronze / glass palette
    environment.ts        ← ground plane, sky reflections, sun + shadows
    postfx.ts             ← ambient occlusion (used for the rendered stills)
  components/             ← Header, Hero, Showroom, ResidenceDetail, Story, Lifestyle, Location, Enquiry, Footer
  lib/motion.ts           ← GSAP setup, reduced-motion hook, accessible scroll-to
  styles.css
public/assets/renders/    ← concept renders (+ -sm.jpg variants for mobile)
public/assets/models/     ← put .glb files here
tools/                    ← still renderer + browser test script
```

## Editing content

Open `src/data/properties.ts`. Each residence has name, location, descriptor, description,
bedrooms, bathrooms, `interiorAreaM2` (sq ft is calculated), optional plot/terrace area, price label,
amenities, gallery images, floor plan and model settings.

- `verified: false` shows **"Sample data — not verified"**. Only set it to `true` after a person has
  checked every figure against source documents.
- Do not add travel times, investment returns, awards or testimonials unless they are sourced.
- `initialResidenceIndex` controls which residence is centred first (the middle one shows both neighbours).

## Connecting the enquiry form

Set `enquiry.endpoint` in `properties.ts` to a URL that accepts a JSON `POST`
(Formspree, a serverless function, your CRM webhook…). Payload:

```json
{ "name": "", "email": "", "phone": "", "residence": "villa-solenne", "residenceName": "Villa Solenne",
  "date": "2026-11-07", "message": "", "consent": true }
```

While `endpoint` is empty the form runs in **demo mode**: it validates fully, says clearly that
nothing was sent, and shows what would have been sent. A success message is only shown after the
endpoint returns a 2xx response; failures show an error and keep the user's input.

---

## Asset replacement guide

### Images
Replace files in `public/assets/renders/` keeping the same names, or change paths in
`properties.ts`. Provide two sizes per image: `name.jpg` (1600–2000 px wide) and `name-sm.jpg`
(~900 px wide). Then change captions from "Concept render — …" to the real description and update
the `alt` text. Remove the "Concept render" labels in `Hero.tsx`, `Lifestyle.tsx` and `Story.tsx`
only when the images are approved photography or renders of the actual design.

| File | Used in | Suggested content |
| --- | --- | --- |
| `hero.jpg` | Hero (preloaded) | Exterior hero, subject on the right third, quiet sky on the left for the headline |
| `collection-poster.jpg` | Shown until the 3D scene draws | Re-render with `npm run render:stills collection-poster` after changing models |
| `villa-1..3`, `penthouse-1..3`, `lakehouse-1..3` | Residence galleries | 3 images each: hero exterior, detail, dusk |
| `story-arrival/exterior/living/terrace` | Story sequence | One image (or clip) per scene, 16:9 |
| `lifestyle-water`, `lifestyle-terrace` | Lifestyle | 5:4 crop safe |

### Video (optional)
Add `video: 'assets/video/arrival.mp4'` to a story scene in `properties.ts`. Clips are muted,
`playsInline`, never autoplay with sound, and fall back to the still as poster.

### 3D models (GLB)
1. Export/compress: `npx gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp`
   (target < 5 MB per residence; textures ≤ 2K).
2. Put it in `public/assets/models/` and set on the residence:
   `model: { procedural: 'villa', glb: 'assets/models/villa-solenne.glb', glbTargetHeight: 6.5, glbRotationY: 0 }`
3. The model is auto-centred, scaled to `glbTargetHeight` and placed on the ground plane. If it fails
   to load, the procedural concept model stays and a small notice appears on the stage.
4. For real properties, the GLB must preserve the supplied design, materials and surroundings.

### Floor plans
Set `floorPlan.src` to an SVG/PNG from the architect. Until then a placeholder schematic is shown
and labelled "not to scale".

### Map
Set `locations.mapEmbedUrl` to an embed URL once a provider is chosen; until then an abstract
placeholder (explicitly "not a map") is shown.

### Re-rendering concept stills
`npm run render:stills` (all) or `npm run render:stills hero villa-1` (some). Needs Playwright's
Chromium (`npx playwright install chromium`). Presets (camera, time of day) are in `tools/stills-entry.ts`.

---

## Generation briefs (for when Meshy / Runway / Spline are connected)

These tools were **not** connected for this build and were not used. Briefs to use them:

**Meshy — concept GLBs** (one per residence; "realistic", PBR, ≤ 50k triangles, Y-up, metres):
- *Villa Solenne*: "Contemporary Mediterranean villa. Rough honey-coloured stone plinth 13 × 8.6 m, 1.1 m high,
  stepping down to terraced olive groves. Fully glazed ground floor with slim charcoal mullions, a rough stone
  spine wall on the west. Smooth pale limestone upper volume 10.6 × 4.2 m cantilevering 3 m over a 22 m
  infinity pool; ribbon window shaded by vertical bronze fins; thin charcoal roof slab. No people, no cars."
- *The Meridian Penthouse*: "Top of a slender residential tower: seven glazed floors with limestone slab edges
  and corner pilasters, then a two-storey penthouse crown. Lower crown level fully wrapped in vertical bronze
  fins with a 1 m terrace all round; upper level set back with a bronze pergola and planters with olive shrubs."
- *Lakehouse Verena*: "Single-storey lakeside pavilion 11 × 3.6 m under a floating charcoal roof 14.6 × 6.6 m.
  Sliding glazed walls, timber slat screen at the west end, rough stone chimney. Full-length timber deck over
  the water on slim steel posts, with a 6 m jetty. Reeds along the shore."

**Runway — image-to-video** (use the matching render as the first frame; 5 s, 16:9, no text, no people):
- Arrival: "Slow dolly forward along the stone path toward the villa, olive leaves moving slightly, late afternoon."
- Exterior: "Very slow lateral camera slide past the cantilever, warm light shifts subtly. Static architecture."
- Living: "Imperceptible push-in; sunlight bars move a few centimetres across the stone floor."
- Terrace: "Locked-off shot; pool surface ripples gently, sky warms toward dusk."

**Spline** (alternative to the Three.js scene): one scene with the three GLBs on a 200 m ivory ground disc,
soft directional light from the left, fog to `#EFE9DF`, camera states *Collection* and *Detail-1..3*.
If used, replace `ShowroomScene` with the Spline runtime only — do not load Three.js as well.

---

## Performance & accessibility notes
- Hero poster is preloaded; Three.js (~500 KB) is a separate chunk loaded only when the collection
  section approaches the viewport. GLTFLoader is loaded only if a GLB path is set.
- Device pixel ratio is capped (1.75 / 1.4 / 1.1 by tier); shadows are reduced or off on weak devices;
  render-on-demand (no frames are drawn while nothing changes) and rendering pauses off-screen or in a hidden tab.
- WebGL unavailable or context lost → image carousel with the same controls, swipe and labels.
- All text, controls and the form are HTML outside the canvas; keyboard: ←/→/Home/End/Enter in the
  stage, Esc to leave detail; visible focus rings; 44–52 px touch targets; aria-live announcements.
- `prefers-reduced-motion`: no camera tweens, no parallax, story becomes a stacked list, instant scrolling.

## Testing that was done
Run in headless Chromium (software WebGL) with `tools/shoot.mjs` against the esbuild production build:
desktop 1440×900 and mobile 390×844 layouts; next/previous buttons, arrow keys, mouse drag, explore →
detail (focus moves to the panel) → back (selection restored); form empty submit (5 errors + focused
summary), invalid email, valid demo submission; WebGL disabled → fallback; reduced motion.
Not tested: real GPUs/phones, Safari/Firefox, screen readers, and the Vite build (`npm run build`)
— run these before launch.
