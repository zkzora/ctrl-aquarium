# CTRL / Public + Whale Aquariums — asset integration guide

This is the two-habitat asset kit. Read the project-root REWARDS_DEMO_SPEC.md and
CLAUDE_CODE_SPEC.md for current scope. It does not imply support for arbitrary
generated species or a finished multiplayer application.

Open `../asset-gallery.html` for an offline asset-only preview. Use
`asset-manifest.json` for exact paths, hashes, dimensions, and normalized anchors.
The original painting is 1586×992, approximately 16:10. All supplied production
resources are local. No CDN, external image host, or external font is required.

## File groups

| Group | Files / use |
|---|---|
| Environment | aquarium-backdrop.png, original generated painting |
| Actors | fish-orange/blue/yellow, shark, jellyfish, crab, original SVGs |
| World objects | shelter, treasure, seaweed, original SVGs |
| Extra props | props/coral-pink, coral-blue, rocks, ruin, surface-lamp, signpost |
| Atmosphere | effects/light-rays, frozen-glass, disco-beams, bubbles |
| Small effects | effects/food-pellet, sparkle, concern, ground-shadow |
| Motion | animations/*-sheet.svg and .png, four frames each; animations.json |
| Raster textures | png/*@2x.png, seventeen deterministic exports of editable SVGs |
| Brand | CTRL mark, light/dark wordmarks, favicon, tCTRL test illustration |
| Sharing | brand/social-card.svg and .png, 1200×630 |
| Sound | audio/*.wav, synthesized mono PCM, 22050Hz / 16bit |
| Reference | contact-sheet.svg/.png, local gallery, manifest, validation report |

The light wordmark has a light foreground for a dark surface. The dark wordmark
has a dark foreground for a light surface. The test token badge is only a graphic;
it is not evidence of a deployed asset, approved ticker, or financial value.

## Anchors and sizes

Positions in world state should use 0..1 normalized coordinates. Creatures use
their visual center. Props typically use bottom-center; the surface lamp uses
top-center. Full-scene overlays use top-left and must align with the backdrop's
cover/contain transform. The bubble tile is 128×256 and may repeat vertically.

Suggested sizes on an approximately 900px-wide stage: fish 45–75px; shark
110–150px; jellyfish 35–55px; crab 45–70px; shelter 120–170px; treasure 65–100px;
seaweed 40–70px. Scale with stage width on mobile rather than keeping these
absolute sizes. Keep the center mostly open; the painting already has edge props.

Do not stretch the painting independently in x/y. Use cover cropping or deliberate
letterboxing, and apply exactly that same viewport mapping to full-scene overlays.
Use an offscreen texture cache, cap DPR at 2, and avoid decoding each frame.

## Motion sheets

Thirteen actors/objects have four-frame horizontal sheets: the three fish variants,
shark, jellyfish, crab, and seaweed. Exact cell sizes/FPS are in animations.json.
They are gentle procedural squash/stretch/rocking frames of the original drawing,
not separately illustrated skeletal poses. If you need independent fin animation,
extend the native vector source deliberately.

```ts
const frame = Math.floor(elapsedSeconds * fps) % 4;
ctx.drawImage(texture, frame * frameWidth, 0, frameWidth, frameHeight,
              -displayWidth / 2, -displayHeight / 2,
              displayWidth, displayHeight);
```

Use supplied PNG sheets for predictable Canvas rendering, or SVG sheets after
testing the chosen renderer. Flip the context horizontally for left-moving fish
and shark. Do not flip front-facing crab/jellyfish simply because they drift left.
World movement (paths, shelter seeking, chasing, gravity) is separate simulation
code; the sheet itself does not implement behavior.

## Environmental states

- Day: base painting, optional light-rays layer at low opacity.
- Night: dark-blue tint over the painting, weaker rays; keep actors legible.
- Sunset: warm amber tint, no replacement backdrop required.
- Frozen: effects/frozen-glass.svg + blue-white tint; pause simulation at the
  authoritative freeze timestamp, not at a local random frame.
- Disco: effects/disco-beams.svg, smoothly varied opacity/rotation within bounds.
- Reverse gravity: change movement/object behavior; keep labels upright.

These variants are compositing instructions. The original painting was not
silently duplicated/repainted into purported independent environment assets.

## Sound cues

| File | Trigger |
|---|---|
| underwater-ambience.wav | Optional quiet 12s seamless synthesized background loop |
| bubble.wav | Sparse ambient bubble or nonessential interaction cue |
| change-accepted.wav | A server-confirmed accepted change |
| unsupported.wav | Quiet rejected/unsupported action cue |
| your-turn.wav | Transition into the visitor's own control slot |
| countdown.wav | Optional final countdown, at most one cue per second |
| pass-keyboard.wav | Confirmed handoff |
| feed.wav | Accepted feeding action |

All sound was synthesized for this project, not sampled from a third-party pack.
Audio starts muted and requires user gesture to enable. Use one ambient instance,
deduplicate event cues by event ID, persist mute preference locally, suspend when
hidden, and do not make audio necessary to understand any action. Manifest gain
suggestions are relative; mix/test on real devices at a comfortable volume.

## Rebuilding derived resources

From project root:

```text
python tools/build-asset-kit.py
node tools/render-asset-kit.mjs
python tools/validate-asset-kit.py
```

The first script uses Python's standard library to create vector derivatives,
branding layout and synthesized WAVs. The second uses sharp to rasterize SVG
sources and compose the vector contact sheet. This version uses the installed
sharp dependency; if your clean environment does not resolve it, pin sharp in a
dedicated asset-tool environment instead of changing game dependencies blindly.
The third checks files and writes hashes/manifest/evidence. Keep the generated
original backdrop and all original SVG drawings as source inputs.

## Provenance

See ASSET_LICENSES.md. Native vector drawings, layouts, animation derivatives and
audio are project-created. The backdrop is generated artwork subject to the
applicable image-generation terms. No third-party character or stock-art pack
was imported. This note is provenance, not a guarantee of exclusive IP rights.

## Revision 2 / Whale Aquarium and discoveries (2026-11-07)

106 visual/audio resources: 58 SVG, 37 PNG and 11 WAV. The manifest is authoritative.

- `whale-backdrop.png`: 1586×992 native-generated opaque Whale Aquarium environment.
- New actors: clownfish 192×112, blue-tang 192×112, lionfish 224×176, manta-ray
  280×176, anglerfish 224×160, whale 400×208. Right-facing, transparent editable SVGs.
- Revised `shark.svg`: 240×120, anatomically clearer elongated silhouette.
- `treasure-open.svg` and `treasure-empty.svg`: 184×152, consistent bottom anchor.
- Thirteen four-frame sheets now include the six new creatures and revised shark.
- Seventeen 2× actor/prop PNG exports. Stock souvenir cards also have PNG exports.
- `effects/black-hole.svg`, `bubble-burst.svg`, `reward-coin.svg`, `empty-reveal.svg`.
- `rewards/nvda-demo`, `aapl-demo`, `msft-demo` SVG/PNG: demo souvenirs only, not
  equity, securities, company claims or monetary rewards. No logos or prices.
- `audio/creature-pop.wav`, `treasure-open.wav`, `black-hole.wav`: original synthetic cues.

In live canvas the black hole is procedural VFX affecting the whole prior world,
not just this static SVG icon. See app/aquarium.tsx and the amendment spec.
