# CTRL aquarium asset provenance

All assets in this directory were created for CTRL during this build. No stock
art, downloaded third-party characters, or external font artwork was used.

## AI-generated backdrop

- File: `aquarium-backdrop.png`
- Dimensions: 1586 x 992 pixels, RGB PNG, opaque.
- Created with the built-in OpenAI image generation tool (not a CLI/API fallback).
- Original retained at:
  `C:/Users/Pongo/.codex/generated_images/01a1a6f1-5c90-73e0-b1be-2d5befcd8c24/exec-a487f6b2-d4c8-41d5-b319-f5a3f61822a9.png`
- Visually inspected: no text, no animals, large clear central swimming space.
- No third-party artist attribution requirement was introduced by an external
  asset license. Use remains subject to the applicable image generation terms.

Generation prompt:

> Use case: stylized-concept. Asset type: wide 2D game environment background for
> a shared aquarium browser sandbox called CTRL. Primary request: a beautifully
> crafted, painterly indie game underwater background, submerged abandoned little
> research aquarium, deep cobalt blue and petrol teal water. Composition: wide
> landscape around 16:10, quiet empty open water across the central 70 percent for
> animated game fish that will be added separately. Sandy uneven seabed only along
> bottom 15 percent; sparse small coral, sea grass, rounded rocks, and a fragment of
> a submerged research ruin near the far edges. A softly illuminated water surface
> at the top, a few visible shafts of light, subtle floating specks and distant
> soft depth. Mood: curious, serene, a little mysterious, charming and tactile
> hand-painted gouache-like game art, readable medium blue rather than overly dark.
> No fish, no sea animals, no text, no logos, no UI, no frame, no vignette that
> obscures the center. Original artwork, not a screenshot, no people.

## Original native SVG assets

The SVG files were drawn as editable vector source for this project, with no
third-party source material. Transparent backgrounds; fish and shark face right.
They may be used, modified, and redistributed as part of CTRL without additional
asset attribution. This note does not license third-party trademarks or imagery.

| File | Native viewBox / dimensions |
| --- | --- |
| `fish-orange.svg` | 160 x 96 |
| `fish-blue.svg` | 160 x 96 |
| `fish-yellow.svg` | 160 x 96 |
| `shark.svg` | 240 x 120 |
| `jellyfish.svg` | 104 x 156 |
| `crab.svg` | 168 x 112 |
| `shelter.svg` | 240 x 176 |
| `treasure.svg` | 184 x 152 |
| `seaweed.svg` | 112 x 204 |

Suggested display: fish 45-75 px wide, shark 110-150 px wide, jellyfish 35-55 px
wide, crab 45-70 px wide, shelter 120-170 px wide, treasure 65-100 px wide, and
seaweed 40-70 px wide. Flip horizontally to face left. SVG titles describe each
asset; use the consuming image's `alt` text or an empty `alt` when decorative.

## Completed kit additions, 2026-11-05

Six additional props and eight effects were created as original native SVG
source. Brand marks, layout artwork, four-frame motion sheets, and the contact
sheet are project-created vector resources. The PNG sprite/sheet exports are
deterministic renders of those sources. The sharing card is an original vector
layout embedding the retained backdrop unchanged.

Eight WAV files were synthesized mathematically using the retained
`tools/build-asset-kit.py` script. They contain no third-party recordings or
samples. The ambience is a twelve-second periodic synthetic loop.

Motion sheets use simple procedural squash/stretch of the native drawings;
they are not separately hand-animated rigs. Additional files and hashes are
listed in asset-manifest.json. ASSET_GUIDE.md documents their actual use.

No external font files were distributed. Layout previews use system fonts.
No additional third-party art attribution dependency was introduced. The
backdrop remains subject to the applicable image-generation terms; provenance
does not guarantee exclusive copyright or third-party trademark clearance.

## Whale Aquarium and discovery additions, 2026-11-07

`whale-backdrop.png` is a second original opaque 1586×992 image generated with
the built-in OpenAI image tool. The retained original is:
`C:/Users/Pongo/.codex/generated_images/01a1a4d1-a9e9-78c3-96c0-701eaa3cb981/exec-2eb7172f-2569-4bbd-8ef0-d333f7b9bef5.png`.
It was copied unchanged into this project and visually inspected.

Generation prompt:

> Create a polished original 2D indie-game aquarium environment background for
> a browser game named CTRL. This is a second environment called Whale Aquarium,
> a deeper mysterious premium whale habitat. Landscape 16:10-ish composition,
> full bleed opaque artwork. Painterly clean stylized illustration, atmospheric
> deep midnight navy, cobalt, teal, restrained amber/gold bioluminescent accents.
> View from inside an immense underwater observatory tank, a suggestion of tall
> curved aquarium glass and distant ruined stone archways framing left and right,
> soft deep-sea volumetric rays from the surface, sand and rock/coral near bottom
> corners. Grand sense of scale suitable for a whale, open unobstructed broad
> central 65% of scene for moving game creatures. Dramatic but legible and
> beautiful, not horror. No fish, whales, sharks, creatures, treasure, labels,
> text, logos, interface, or token icons. All inhabitants will be separately
> animated transparent sprites. Keep decorative details restrained at edges;
> strong game-ready composition. A new original environment, not a screenshot
> or website mockup.

Six new editable transparent vector creatures were drawn as native SVGs for this
project: clownfish 192×112, blue tang 192×112, lionfish 224×176, manta ray 280×176,
anglerfish 224×160 and whale 400×208. The shark was explicitly revised at 240×120
with clearer anatomy. The whale is a stylized blue-colored humpback silhouette,
not a scientifically exact species model. Treasure-open/treasure-empty are
184×152 variants with consistent source geometry. No third-party characters
or artist reference images were incorporated.

Effects/cards were authored as native SVG graphics by
`tools/build-rewards-assets.py`; three new PCM sound effects are original
mathematical synthesis. No external samples, company logos, price data or stock
photos were used. NVDA/AAPL/MSFT are plain illustrative ticker labels on explicitly
marked fictional demo souvenir cards. Those graphics do not convey actual
shares, tokenized securities, redemption rights or a company affiliation.

New sheets/PNG exports are deterministic native-SVG renders. `tools/build-asset-kit.py`
and `tools/render-asset-kit.mjs` regenerate the sheets and resource contact sheet.
The supplied canvas independently animates creature movement and whole-world VFX.
