# CTRL — keyboard edition demo

English product demo for Vibeathon judges and token holders. 1920x1080, 30 fps, approximately 2 minutes 20 seconds. Calm male narration: Ryan | Neutral Australian Calm Presenter, generated through the user-authorized ElevenLabs MCP, model eleven_v4.

## Deliverables

- `out/CTRL-demo-final.mp4`: audio-mastered final landscape video with burned English captions.
- `out/CTRL-demo-en.srt`: subtitle file synchronized to the recorded narration.
- `out/CTRL-thumbnail.png`: thumbnail.
- `out/POST_COPY.md`: optional submission / post description.
- `out/elevenlabs-generation.json`: provenance (voice / model / generation IDs, no credentials).
- `out/review/`: inspected frames.

## Edit and preview

`npm ci`

`npm run studio -- --no-open --port 3030`

Open http://localhost:3030/CTRL . Narration is already included; no API key is needed for playback or rendering.

`npm run render`

`npm run master`

`npm run frames`

Scene copy is in `src/story.json`. Narration files and timings are in `src/audio.json` and `public/voice/`. Captions are in `src/captions.json`. `tools/prepare-edit.mjs` splits the existing selected take at exact scene boundaries and rebuilds captions/SRT; it never generates paid speech again. Default narration starts 12 frames into each scene. Keep this offset consistent if editing timing.

## Evidence boundary

Actual UI screenshots are identified as product UI. Original aquarium animation and the condensed black-hole/regrowth sequence are labelled mechanism visualizations, not a new live wallet transaction. The verified ledger is the completed Base Sepolia QA record in `public/evidence.json`: 1,440 starting credits, 20 spent, 30 paid, 1,450 ending; 16 pool allocation and 4 developer allocation. That is an observed result, not a promised return.

The current game sells keyboard turns, not fish or packs. The finite seed is up to 300 per fresh round in either habitat. The server chooses randomness; commitments prove consistency, not independent fairness. All credits and stock-inspired souvenirs have no cash value.

Underlying build: https://ctrl-aquarium.vercel.app/#room

Verified payout: https://sepolia.basescan.org/tx/0x61177b4868de344e341b0c48f79ec3f20af780f9d6361f4ca5e0d3f0e7e46045

No narration regeneration, token launch, mainnet integration, real stock reward or audit is implied.
