> Historical document: revision 3 is implemented. CURRENT_STATUS.md defines current behavior; this older document is not the implementation authority.

# Latest revision / 2026-11-07

Current approved scope is described in REWARDS_DEMO_SPEC.md. All rewards remain
local demo credits and fictional non-redeemable souvenir cards.

- Strict frontend typecheck and the production website build pass.
- npm test: 14/14 pass (5 existing world tests and 9 new reward-engine tests).
- Resource validator: 106 resources pass (58 SVG, 37 PNG, 11 WAV), including all
  six new creatures, revised shark, Whale background and reward assets.
- Full-repository typecheck still reports only the existing lib/wallet.ts event
  args error. No real wallet/backend integration was claimed or exercised.
- Actual browser flow in Whale Aquarium: chest +75, shark 0, black hole charged
  120 and revealed +505, balance 760, reserve 1,920, round 02 and fresh inhabitants.
  These random outcomes are observations, not fixed demo guarantees.
- Snapshot reward buttons were disabled; an expired turn also disabled an already-open black-hole confirmation without charging.
- Twelve guide entries rendered; S filtering produced the whale only; B filtering
  produced the revised shark and lionfish. No completed broken images were found
  in the sampled views.
- Responsive room/guide screenshots at 375, 768 and 1280 viewport widths showed
  no horizontal document overflow. Mobile control panel precedes reserve/queue.
- No live treasury, real shares/security, wallet signature, AI request, D1
  persistence or cross-device multiplayer was tested by these demo checks.

The earlier v1 UI evidence below is historical; its initial balances, 64-resource
count and five-test count refer to that earlier revision, not the current kit.

# CTRL website — verification evidence

Original UI verification 2026-11-06 (Asia/Jakarta). Scope: website frontend and supplied assets.

## Automated checks

- `npm run website:typecheck`: passed under strict TypeScript.
- `npm run website:build`: passed; Vite produced the static frontend, followed
  by JS/CSS inlining into `website-dist/index.html`.
- `npm test`: 5/5 existing pure world-engine tests passed. These test queue
  exclusivity/inherited changes, expiry/rejected commands, the three-action budget,
  bounded EN/ID commands, and author-scoped undo. They are not network tests.
- `python tools/validate-asset-kit.py`: passed, 64 original resource files;
  37 SVG, 19 PNG, 8 WAV, 7,572,768 resource bytes. Checks include formats,
  dimensions, no external SVG dependencies, atlas bounds, WAV peaks and hashes.
- Full-repository `npm run typecheck`: still fails at `lib/wallet.ts` Booked-event
  args narrowing (the previously documented system prototype issue). The standalone
  frontend does not import that helper. Claude must fix it before real integration.

## Browser checks performed

Used the browser against local Vite development and the actual production static
bundle over HTTP. The final static server is dependency-free (`website:preview`).

Observed successful behavior:

- Landing and aquarium render with the original background and creature art.
- Room navigation, history and field guide render; native FAQ disclosures expand.
- Join changes to the queued state; after the demo's eight-second wait the user
  receives a 60-second turn and three available actions.
- “Make it nighttime” changes world lighting and creates a history event.
- “Build a spaceship” shows an inline unsupported-command error, preserves input
  and leaves the remaining action count unchanged.
- “Turn gravity upside down” changes the world; “undo” restores the prior gravity.
- After three accepted changes the composer is disabled. Passing returns to watch
  mode and keeps the world/history.
- History's “Your changes” filter shows the three actual local changes. An
  unmatched search renders a recovery/clear-filter empty state.
- Selecting the reverse-gravity event shows a replay snapshot with reverse
  gravity, then returning to the demo shows the current normal-gravity world.
- Demo wallet connect, 100-credit claim, callsign editing, 10-credit reservation
  and queued state work. Leaving while queued returns the balance from 90 to 100.
- Dark theme renders across the room and wallet dialog. The theme toggle state
  is correct; Escape closes a native dialog and returns focus to its trigger.
- Mobile navigation includes preferences and closes after selecting a page.
- User-initiated ambience reaches the “Mute sound” state; mute returns it to
  “Enable sound”. Presentation pause/resume changes its control state.
- Expanded aquarium mode fills the browser viewport and can be exited. This is a
  CSS-based immersive view, not an OS/browser fullscreen permission request.
- Image export triggers a browser-download request and truthful request feedback.
  The automation browser did not expose a completed download event; file delivery
  for this optional control remains unverified.

## Responsive and visual checks

Inspected actual screenshots at 375×812, 768×1024 and the normal 1280×720 browser
viewport. No horizontal document overflow was measured. Sampled DOM images had
zero completed broken images. Desktop room/landing and mobile room/history/guide/
wallet layouts were inspected. Mobile control placement prioritizes the composer
before the decorative queue. Viewport overrides were temporary.

Final preview screenshots are in `website-previews/`. They show real rendered
frontend output, not generated mockups. Reduced-motion behavior and focus styles
are implemented in CSS; actual assistive-technology/device certification and a
complete manual contrast audit have not been performed.

The production bundle loaded without browser error/warning log entries during
the inspected smoke checks. This does not prove all possible failures absent.

## Verification limits

- Direct `file://` navigation is blocked by the automation browser's URL policy.
  It was not bypassed. The self-contained inline-code build was checked over HTTP;
  opening it directly in a user's browser is an intended delivery path, not an
  observed browser-test result. Use `website:preview` for the verified HTTP path.
- No real wallet signature, live model call, Base Sepolia transaction, D1 write,
  server synchronization, three-device multiplayer, hosted deployment or mainnet
  token launch was performed in this frontend delivery.
- Full Worker build/integration remains Claude Code's work. A successful frontend
  build must not be presented as a successful end-to-end backend build.
- The previous local contract checks (11/11) belong to the earlier backend audit;
  they were not rerun for UI-only changes. Their results are not testnet evidence.
- Browser intervals, seeded controller/queue/history, local integer credits and
  refresh-reset state are demo shortcuts listed in WEBSITE_HANDOFF.md.
