> Historical document: revision 3 is implemented. CURRENT_STATUS.md defines current behavior; this older document is not the implementation authority.

# CTRL — complete implementation handoff for Claude Code

**2026-11-07 update:** Read `REWARDS_DEMO_SPEC.md` first. Two habitats, twelve
inhabitants, the corrected shark, tier guide and reveal/black-hole flows are
implemented with local demo credits only. No real rewards or securities are wired.


Last updated: **2026-11-07, Asia/Jakarta**. Read **WEBSITE_HANDOFF.md first** for
the completed frontend, source map, local preview commands and wiring seams.

## 0. Start here: objective and honest status

Finish the application in this directory using the supplied assets and existing
prototype. Build a working multiplayer product, not a landing page or a single-tab
simulation. The owner explicitly moved the remaining application wiring to Claude
Code; the current delivery includes a complete local website frontend, the asset
kit, a partial system prototype and this implementation specification.

**The website UI is implemented with an explicitly local demo adapter. Backend
code remains a partial prototype. No complete multiplayer application, hosted
deployment, live AI integration, or Base Sepolia transaction flow has been
verified.** A private Sites project was reserved
but has not been deployed. Do not present its expected URL as a live application.

The older `../RECEIPT_MUSEUM_MVP.md` belongs to an abandoned idea. Do not implement
it, merge its collectible/payment design into CTRL, or rename CTRL back to a museum.
`CTRL_SPEC.md` is a short earlier sketch; this document takes precedence.

Work autonomously on reversible implementation and tests. Request only genuinely
missing credentials or launch decisions, preserving user authorization already
given. Never request private keys in chat or invent a confirmed deployment.

## 1. Product: what a visitor actually sees

**CTRL: One world. Your turn.**

A single shared 2D aquarium appears in everyone's browser. Visitors can watch
without connecting a wallet. A participant obtains a short control turn and types
a bounded instruction. The aquarium changes for everyone. The next participant
inherits that world, including consequences and the previous player's creations.

Example sequence:

1. Alice gets the keyboard and adds a shark.
2. Bob's browser sees the shark without refreshing the page.
3. Alice passes, or her turn expires. Bob receives the keyboard.
4. Bob builds a shelter. Small fish now visibly seek shelter from the shark.
5. Cara reverses gravity, and the world's movement visibly changes.
6. All three inspect the same durable event history and can replay its snapshots.

The audience is crypto communities, builders, and stream viewers who want to
create/watch an evolving shared situation. Ordinary collaboration often leaves
most people watching one person work; the turn mechanism gives a spectator a
specific consequential role. Entertainment, participation, and returning to see
what happened are the value hypotheses. Demand and willingness to pay are not
verified. Do not invent user numbers, revenue, or a probability of winning.

The strongest ordinary alternative is a collaborative sandbox, stream-controlled
game, or multiplayer coding tool. CTRL must earn its place through fast visible
changes, consequential turn-taking, inherited state, and entertaining history.

## 2. Scope and product boundaries

### Required for the first complete release

- Two aquarium habitats (Public and Whale), with original supplied art; see the demo amendment.
- A free shared sandbox and separate Base Sepolia token-backed rooms.
- Server-enforced FIFO control, expiry, action budgets, and concurrency.
- Three accepted changes per turn; one command in flight at a time.
- A natural-language command composer, supported example buttons, clear errors.
- Live spectator updates, presence counts based on recent actual clients, queue.
- Durable changes after refresh/reconnect and cross-session snapshot replay.
- Wallet connection, testnet room creation, faucet, booking, activation, refunds.
- Accessible desktop/mobile UI, loading/empty/error/recovery states, muted audio.
- A reproducible three-client demo and a truthful deployment/readiness report.

### Explicitly outside this release

Do not build a real remote operating system, arbitrary generated JS execution,
general-purpose code deployment, user-uploaded scripts/assets, a prediction
market, NFT trading, prize payouts, yield, secondary tokens per object, or token
price incentives. This is a bounded aquarium world, not an unrestricted computer.
New world types, unrestricted generation, chat, object NFT ownership, and additional
species are later work. Do not broaden scope before the core demo passes.

## 3. User flows and acceptance behavior

### A. Watch

Open the room, load art, show live world, current controller, remaining slot time,
queue, recent changes, and whether this is sandbox or testnet. Watching needs no
wallet. A short explanation and supported actions must be visible without reading
a tutorial. Presence is approximate (recent heartbeat), never a fabricated crowd.

### B. Take a free sandbox turn

Visitor receives an opaque HttpOnly session cookie and editable callsign. Selecting
`Take the keyboard` joins a queue of at most six waiting sessions. If idle, the
server starts the first 60-second turn. The same session cannot occupy the active
turn and queue simultaneously. On expiry or `Pass the keyboard`, the next waiting
participant starts. Changing callsign does not create a new identity or budget.
On reconnect, the visitor recovers their same current slot or queue entry.

### C. Submit a change

The composer accepts 1–240 characters. Suggested commands populate it; submitting
is explicit. Show progress, preserve text on error, and explain unsupported requests.
The server authenticates the current controller before any paid model call and
again before commit. Only a committed change consumes one of the three actions.
Use a client-generated request ID for retry deduplication. Accepted events include
author, source prompt, normalized operation, authoritative timestamp, interpreter
used, snapshot, and unique event ID. Out-of-turn requests fail server-side.

### D. Inspect history

Live mode shows the current authoritative state. Selecting an event shows that
snapshot at its event timestamp with an obvious `REPLAY` label. Include `Back to
live`. Replay must not call mutation endpoints, change the live room, charge tokens,
or show an advancing physics time as if it were a fixed historical frame.

### E. Token-backed room

Connect a supported injected EOA wallet and sign a scoped expiring challenge.
Switch to Base Sepolia. Create or open a room tied to a verified turn contract.
Claim valueless faucet tokens. Approve only 10 tCTRL, reserve a ticket, inspect the
confirmed start/end times, activate during the slot, then issue world commands.
Other clients observe the same controller and world. An unused ticket can be
refunded once. Refresh/recover must not book/pay a second time.

## 4. Token utility and launch boundary

Utility is **exclusive time to affect the shared world**, with a bounded command
allowance. Spectating is free. Token consumption purchases a concrete capability;
it does not imply future profits or prove sustainable demand.

The supplied test token is **tCTRL**, not the eventual launch token:

| Property | Existing test design |
|---|---|
| Chain | Base Sepolia 84532; local EVM 31337 for tests |
| Faucet | 100 tCTRL per wallet per 24 hours, valueless |
| Reservation price | 10 tCTRL, held by turn contract |
| Slot | 60 seconds, fixed wall-clock schedule |
| Activation | Burns the reserved 10 tCTRL and enables server-authorized control |
| Unactivated reservation | Full refund once, including after a missed slot |
| Activated reservation | Not refundable by the current prototype |
| Wait bound | At most 600 seconds ahead, as enforced in contract |
| Application budget | Three accepted world commands per slot |

**Important timing limitation:** the slot end is fixed at booking. Activating
late does not grant a fresh 60 seconds. Wallet confirmation latency reduces usable
time. Display the actual scheduled interval and remaining time before activation;
offer refund/rebooking for an unused late slot. Do not promise a full minute after
activation. Test realistic network latency and consider a separately reviewed
queue redesign before mainnet if the experience is unacceptable.

These contracts intentionally refuse deployment on mainnet. Mainnet token launch
is a later distinct step requiring the owner's chosen token name/symbol, supply,
allocations/vesting, launch venue, liquidity policy, contract addresses, recipients,
and price policy. Do not select or deploy those financial terms silently.

If using an external launchpad ERC-20, inspect its real contract: it may not expose
`burn(uint256)`. The current controller assumes that API. Production may need a
treasury-payment adapter instead. A transfer to a dead address is not necessarily
a reduction in totalSupply. Never claim a burn that did not occur. Test any
fee-on-transfer/rebasing behavior or explicitly disallow it.

The product could use ordinary credits/USDC instead. The owner's choice to launch
a tradeable utility token is an economic/product decision, not a technical
necessity. Demonstrate the purchased access before making launch claims.

## 5. Asset kit: use these files, do not replace them with placeholders

Read `public/assets/asset-manifest.json`, `public/assets/ASSET_GUIDE.md`, and
`public/assets/ASSET_LICENSES.md`. Inspect `public/asset-gallery.html` for an
asset-only local preview. That preview has no multiplayer, wallet, or backend.

The kit includes:

- A generated painterly 1586×992 aquarium backdrop, original file preserved.
- Three fish variants, shark, jellyfish, crab, shelter, treasure, seaweed in SVG.
- Seventeen 2× PNG exports for renderers preferring raster textures.
- Thirteen four-frame SVG/PNG motion sheets and their frame metadata.
- Six additional set-dressing props and transparent full-scene/effect SVGs.
- CTRL mark/wordmarks/favicon, a test-credit illustration, social-card SVG/PNG.
- Eleven synthesized WAV sounds and an asset contact sheet.
- File hashes, dimensions, anchors, layering hints, and editable source scripts.

Keep sprite source files editable. Sheets are procedural squash/stretch frames,
not articulated character rigs. More expressive fin/tentacle animation can be
added in code later. Do not describe the supplied kit as a complete skeletal
animation system. Props and overlays are static resources; animate in renderer.

### Renderer layers, back to front

1. Backdrop, cover-fit to stage without distorting aspect ratio.
2. Optional distant light rays and scene tint.
3. Rear props / plants / ruins; foreground props may appear later by depth.
4. Swimming actors, depth-sorted as appropriate.
5. Foreground plants/rocks, pellets, bubbles, concern/sparkle effects.
6. Frozen-glass or disco overlay, with opacity clamped for readability.
7. HTML interface labels outside the canvas, for accessibility and crisp text.

Use normalized world positions and manifest anchors. Fish/shark source faces
right; flip horizontally for left motion. Mirror vertical movement deliberately
when gravity is reversed. Avoid rotating the whole world UI. Shelter seeking and
shark chasing must have visible behavior, not only an added static icon.

### Deterministic motion

Keep world creation/event times and seeds server-authored. Derive animation from
world snapshot + server time offset, not independent Math.random on each client.
Document whether simulation is server-driven or deterministic client presentation.
Do not imply pixel-identical distributed physics unless it is tested. Cap DPR at
2 and actor count at 32; pause or reduce animation for reduced-motion users.
Freezing must hold positions at the freeze timestamp, and thawing must not jump
everything back to its spawn location. New actors must not teleport unexpectedly
because phase ignores their birth time. Test repeat freeze/thaw and replay.

### Audio

Start muted. Unlock AudioContext/playback only after an intentional user gesture.
Offer a persistent mute toggle. Use a single quiet ambience loop, sparse one-shot
feedback, and no overlapping countdown spam. Honor tab visibility and the user's
preferences. Audio must never be necessary to understand a state change.

## 6. Screen and interaction specification

The aquarium is the product's first screen. Do not insert a large marketing hero
above it. Suggested desktop composition: top navigation, world title/status strip,
large stage (~two thirds width), right control column (~300px), history below.
At mobile widths, stage precedes controls and history; no horizontal overflow.

### Required components

- Header: CTRL wordmark, short tagline, How it works, Sandbox/Testnet selector,
  wallet connection when relevant; retain visible environment labels.
- World stage: art/canvas, loading/error states, live/replay badge, fullscreen,
  mute, pause presentation, optional local screenshot export.
- Control card: controller callsign, server-aligned countdown, action budget,
  take/join/pass/cancel actions, queue position, paid-ticket status when relevant.
- Composer: visible label, textarea, character budget, example chips, submit
  action, inline validation and unsupported-command feedback.
- Queue: actual callsigns and ordered positions; empty state invites participation.
- History: timestamp, actor, normalized summary, optional source prompt, replay.
- Wallet dialog: connect/switch/claim/reserve/activate/refund/recover, explorer
  links only for confirmed actual transaction hashes.
- Setup dialog: two-step deployment progress with resumable token address if the
  token deployed but the controller did not; no exposed private keys.

Preserve the implemented neutral CTRL website design and ocean artwork. Current
light/dark UI tokens live in app/globals.css; do not replace the finished design
with this document's earlier dark-dashboard suggestions. System
sans plus system monospace are sufficient; there is no external font requirement.
Use existing Lucide for interface icons instead of mixing icon packs.

Use native semantic controls, >=40px touch targets, visible focus, labelled fields,
Escape-close and focus return for dialogs, and prefers-reduced-motion support.
Test 375px, 768px, 1280px. Do not ship fake online users, queue entries, balances,
history or transaction confirmations. Explicitly label fixture/sample material.

## 7. Stack and current file map

Preserve the supplied **React 19 + TypeScript + Vinext/Vite + Cloudflare Worker +
D1/Drizzle** stack unless a concrete blocker requires a documented migration.
Although it uses Next-compatible app routes, this is not a stock Vercel Next
project: Cloudflare environment imports and bindings must be preserved/adapted.

| File | Current state / role |
|---|---|
| `app/page.tsx`, `app/ctrl-site.tsx` | Complete website UI, connected only to local demo state |
| `app/layout.tsx`, `app/globals.css` | CTRL metadata and full responsive light/dark design system |
| `website/demo.ts` | Local simulation seam; replace with a real data adapter |
| `website/`, `vite.website.config.ts` | Standalone frontend entry/build independent of backend |
| `app/aquarium.tsx` | Canvas renderer integrated into website with snapshot-at/pause support |
| `lib/world.ts` | World types, queue, bounded parser, mutations, snapshots |
| `lib/store.ts` | D1 room CAS, session cookie, origin check |
| `app/api/world/route.ts` | Prototype room/session/command/wallet/ticket API |
| `lib/interpreter.ts` | Deterministic fallback + unverified optional OpenAI adapter |
| `lib/chain.ts` | Base Sepolia contract-code/ticket verification |
| `lib/wallet.ts` | Browser wallet/deploy/faucet/book/activate/refund helpers |
| `contracts/CTRL.sol` | Test token + escrow/turn contracts |
| `contracts/compile.mjs` | Compiler and generated ABI/bytecode/runtime hashes |
| `lib/contracts.generated.json` | Generated artifact; regenerate after contract edits |
| `contracts/test.mjs` | Local Ganache contract integration checks |
| `db/schema.ts` | D1 tables: rooms, sessions, presence |
| `drizzle/0000_odd_wallflower.sql` | Generated initial schema migration |
| `tests/world.test.ts` | Five passing pure engine tests |
| `.openai/hosting.json` | Existing private Sites project identity and DB binding |
| `worker/index.ts`, `scripts/`, `vite.config.ts` | Retained hosting/runtime integration |
| `tools/` | Reproducible asset-kit generation/export/validation tools |

### Audit evidence from 2026-11-05

- Dependency installation completed; lockfile exists.
- Solidity compiled using solc 0.8.38, optimizer 200, Shanghai target.
- Initial Drizzle migration generated; not confirmed applied to local/hosted D1.
- `npm test`: **5/5 passed** (pure world engine).
- `npm run test:contracts`: **11/11 checks passed** on local Ganache chain 31337.
- Ganache emits a Windows native µWS incompatibility warning and falls back to
  its Node implementation; the contract checks still completed successfully.
- `npm run typecheck`: **fails** at `lib/wallet.ts` decoding `Booked` event args.
- No complete app build, multi-browser integration, live model call, Base Sepolia
  deployment, public URL, or end-to-end payment/renderer proof has passed yet.

Local test deployment addresses printed by Ganache are ephemeral test artifacts.
They are not Base Sepolia addresses and must never be copied into production.

## 8. Known fixes and design gaps: resolve before calling this complete

1. **TypeScript event decoding:** `decoded.args` in `lib/wallet.ts` is not typed
   as an object with ticketId. Use properly literal typed ABIs / parsed event
   definitions or validated narrowing. Do not suppress the whole file or disable
   strict mode. Recover a confirmed reservation from chain if log decoding fails.
2. **Stale chain snapshots vs CAS:** API `refresh()` calculates chain sync from
   an old room before `mutateRoom()` retries. A concurrent ticket link, session
   reassignment, or action can be overwritten by that stale sync. Bind the result
   to the version read and recompute on conflict; merge new tickets correctly.
   Write an actual concurrent-request regression test, including action counts.
3. **Command meaning:** the fallback parser currently picks a noun from many
   unsupported phrases. `don't add a shark` or `remove fish` must not silently
   add one. Reject unsupported negation/removal/counts and document supported
   grammar. Never advertise this fallback as a live language model.
4. **Replay/undo retention:** the history is capped at 80. Store the snapshot
   before the first retained event or explicit before/after snapshots; undo must
   not reset to initial state because an older snapshot was trimmed. Deduplicate
   retries across the documented retention window or store idempotency separately.
5. **Renderer correctness:** inspect freeze/thaw, playback time, effect ordering,
   stage resizing and object birth phase. The frontend now supplies exact replay
   time and holds viewer pause/world freeze; local visual QA is documented in
   WEBSITE_QA.md. Real synchronized multi-client timing remains unverified.
   If `onCanvas` is used, keep its reference stable
   so images/repaint loops are not repeatedly reinitialized on parent renders.
6. **Wallet identity boundaries:** current verification supports EOA signatures.
   Add tested ERC-1271 support before claiming smart-account compatibility, or
   communicate the supported EOA scope clearly. Watch accountsChanged/chainChanged.
7. **Chain-room bootstrap:** verify supported code/token before persisting arbitrary
   room rows. Add bounded RPC caching, timeouts, origin checks, request limits,
   and clean error handling. A public read should not create unlimited junk rows.
8. **Resource limits:** add server-side request budgets for anonymous sessions and
   model calls, expiring in-flight locks, presence cleanup and useful indexes.
   Cookie reset is not Sybil resistance. Keep claims proportional to protection.
9. **Paid service trust:** onchain access payment cannot prove the offchain game
   worked. Confirm backend readiness before activation and expose service failure
   honestly. Current contracts do not auto-refund an already activated slot after
   a server outage. Do not claim trustless delivery or full production readiness.
10. **Private hosting:** a reserved private Site is not a public judging link.
    Deployment and audience must be verified through actual hosting controls.

## 9. Data, API and synchronization contract

### Current storage model

`rooms` holds id, serialized room document and revision. Mutations use a
compare-and-swap update against revision; external async work must not bypass
that protection. `sessions` holds a hashed opaque cookie identity, callsign,
optional verified wallet, expiring one-time challenge and created timestamp.
`presence` holds room/session heartbeats. Never use a user-supplied name as auth.

State types are defined in `lib/world.ts`. Important fields include world epoch,
objects with stable IDs/seeds/birth timestamps, environment state, FIFO queue,
current turn, accepted-action count, optional processing lease, and history.

### Prototype endpoint

`GET /api/world?room=sandbox` or `?room=0x<controller>` returns:

```ts
{ room, me: { id, name, wallet }, viewers, serverTime,
  interpreter: 'rules' | 'openai', reservation }
```

`POST` to the same path uses JSON `action` with these variants:

| action | Additional fields |
|---|---|
| rename | name |
| join / leave | none; sandbox only |
| command | prompt, requestId |
| wallet-challenge | address |
| wallet-verify | address, signature |
| wallet-disconnect | none |
| link-ticket | ticket as decimal string |

Preserve or deliberately version the API when filling gaps. Model/wallet/chain
errors must map to human-readable recoverable messages. No raw secrets/stack
traces in browser responses. Reject cross-origin writes. Use SameSite HttpOnly
cookies, Secure on HTTPS, and never accept session IDs from a request body.

### Realtime

The first release may poll every 1.5–2 seconds with one request in flight per
client, visibility-aware backoff, version/serverTime monotonicity, and retry on
reconnect. The server remains authoritative. On a failed read, preserve last
world visibly as stale and disable writes until refreshed. A timer derived from
server time must not be extendable by editing localStorage or client Date.

SSE/WebSocket is optional only if correctly supported by the hosting runtime.
Never substitute BroadcastChannel/localStorage sync for actual cross-device
multiplayer. Do not claim a websocket connection if polling is used.

## 10. Interpretation and allowed operations

Supported assets/types for spawn: fish-orange, fish-blue, fish-yellow, shark,
jellyfish, crab, shelter, treasure, seaweed. Spawn 1–3 at a time; max 32 objects.
Other operations: day/night/sunset; normal/reverse gravity; slow/normal/fast speed;
freeze/thaw; feed; bubbles toggle; disco toggle; remove sharks; undo the author's
own latest eligible change. Extra set-dressing assets do not require new commands.

The model translates language into a strict finite command schema. Validate the
response again on the server before deterministic execution. Never evaluate
model-generated JS/HTML, give it wallet authority, or let it decide charging.
Schema/model refusal/timeouts are rejected without consuming an action. An
expired turn during interpretation must not commit after a new controller starts.

With no API key, keep the rules interpreter useful and clearly labeled. With
OpenAI configured, use the server-side Responses API structured-output adapter
after checking current official model/schema support. The existing adapter has
not been called or validated against a live account. Test refusal, timeout,
provider errors and unsupported prompts as well as a successful translation.

## 11. Credentials, infrastructure and owner inputs

| Requirement | Needed for | Current status / action |
|---|---|---|
| Node >=22.13, npm | Local build/test | Available during authoring; verify on Claude host |
| Git | Source/version/deploy | Available; source handoff is not a published repo |
| Python 3 | Rebuild vector/audio kit | Available; standard library script |
| sharp | Export SVG source to PNG | Present via installed dependency tree; pin in asset tooling if absent |
| Cloudflare Worker runtime + D1 | Shared persistent application | Starter/binding configured; provision/apply migrations |
| Hosting account/Sites access | Hosted multiplayer URL | Reserved private project; no deployment verified |
| OPENAI_API_KEY | Optional model interpretation | Not configured; use secret storage, not chat/source |
| OPENAI_MODEL | Explicit compatible model | Existing adapter fallback gpt-4.1-mini; verify before live use |
| BASE_SEPOLIA_RPC_URL | Reliable server chain reads | Not configured; public Sepolia endpoint fallback exists |
| Browser wallet + Base Sepolia test ETH | Test contract deploy and gas | Owner/testers supply via wallet and faucet |
| tCTRL + turn contract addresses | Paid testnet room | Not deployed on Base Sepolia yet |
| WalletConnect project ID | Optional mobile connection | Not required for EOA injected-wallet MVP |
| Final mainnet token terms | Future launch | Undecided; not a blocker for testnet demo |

`.env.example` in this handoff lists keys only. Cloudflare preview uses its actual
supported `.dev.vars`/runtime configuration; hosted secrets use the hosting
provider's secret mechanism. Update `cloudflare-env.d.ts` and server bindings as
needed. Never ship OPENAI_API_KEY to the browser. No deployer private key is
needed: the existing browser flow uses wallet confirmations.

If OpenAI Developers tooling is available, follow its key-provisioning workflow;
otherwise ask the owner to configure the secret using their provider's secure
settings. Do not keep repeating a plugin-install flow if the owner skips it.

The reserved Sites project ID is already in `.openai/hosting.json`:
`appgprj_6aeb3ff5ca1881919d4a21b24a071654`. Reuse that identity if using Sites.
Do not create duplicate Sites or assume Claude has access to Codex's tools.
The repo credential from the prior session was ephemeral, is not in this handoff,
and must be obtained afresh through authorized hosting tools if needed.

## 12. Work order for Claude Code

1. Inspect this spec, manifest, current source, tests and git status. Preserve
   user edits. Do not run an irreversible mainnet/deployment action as setup.
2. Run `npm ci` if dependencies are missing or lockfile inputs changed. Reproduce
   audit results and fix the event-decoding type error plus source-level bugs.
3. Preserve the finished website UI; wire renderer/control/queue/history using supplied
   assets. Metadata/favicon are already updated. Keep sandbox fully usable first.
4. Apply local D1 schema. Connect real sessions/API, queue, live updates and
   persistence. Test with three isolated browser contexts, not three tabs sharing
   one cookie. Add concurrent request/idempotency regressions.
5. Finish token-backed room setup and wallet transaction progress/recovery. Run
   contract tests locally and link confirmed tickets into server-owned sessions.
6. Configure and test optional model interpretation, retaining validated rules
   fallback and clear provider indicators. No key should block non-AI testing.
7. Complete mobile/accessibility/error-state checks; integrate sparse audio and
   reduced-motion behavior. Capture actual screenshots/demo evidence.
8. Build the deployable application. Provision hosted D1/migrations/secrets, deploy
   exact tested source through authorized hosting, and verify cross-device state.
9. Validate Base Sepolia with actual test wallet receipts when available. Report
   separately what passed locally, in hosted sandbox, and on public testnet.
10. Deliver the URL, source location, tests, known limitations, and a short demo
    script. If a dependency remains missing, name the exact remaining action and
    keep completed work runnable; do not claim the whole app is verified.

### Local commands

```text
npm ci
npm run contracts:compile
npm test
npm run test:contracts
npm run typecheck
npm run db:generate       # only after actual schema changes
npm run build
```

Inspect/retain the existing migration. Local D1 requires applying each unapplied
migration once after the build generated its Wrangler config:

```text
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_odd_wallflower.sql
npm run dev
```

The portable preview normally prints a loopback URL on port 5173. Use the URL
actually printed. Build preview uses `npm start`. Do not replay an already-applied
schema migration or silently destroy local state to clear an error. Hosted D1 is
a separate database; local migration success does not prove hosted migration.

For asset reproduction only:

```text
python tools/build-asset-kit.py
node tools/render-asset-kit.mjs
python tools/validate-asset-kit.py
```

Original hand-drawn SVGs/props and generated backdrop are retained inputs. The
scripts regenerate derived sheets, branding, synthesized audio and previews;
they do not recreate the original painting from a model seed.

## 13. Required verification matrix

| Area | Must demonstrate |
|---|---|
| Three clients | A, B, C see shared changes; FIFO moves A -> B -> C |
| Authorization | Spectator/expired/controller-spoof requests rejected by API |
| Action budget | Fourth accepted-change attempt rejected; invalid input spends none |
| Concurrency | Simultaneous joins, commands, polling and chain sync lose no accepted event |
| Retry | Same requestId commits once, including response-loss recovery |
| Persistence | Refresh/restart retains world/history; own session rejoins correctly |
| Replay | Fixed historical timestamp/snapshot; no writes or charges |
| Parser/model | Supported positives, negation, unsupported counts, refusal, timeout |
| Token | Faucet, exact allowance, escrow, single activation, real burn, one refund |
| Chain timing | No overlapping paid slots; early/late activation and missed slot |
| Wallet recovery | Reject signature, wrong chain, account switch, token-only deployment, confirmed booking with lost response, RPC outage, refund after expiry |
| Assets | Every URL returns correct type; no broken image; anchors/aspect correct |
| Audio | Muted start, gesture unlock, bounded volume, persistent mute |
| Responsive | 375/768/1280 widths, keyboard/dialog focus, reduced-motion |
| Hosted | Actual separate devices/users; D1 persistence and server permissions |

## 14. Demo and definition of done

Show one continuous 90–180 second recording with three clearly identified clients:
Alice takes a sandbox turn and adds a shark; Bob sees it and waits; Alice passes;
Bob adds a shelter; Cara then changes gravity. Reload one client, inspect the same
history, replay an earlier snapshot, and return to live. Demonstrate a rejected
spectator write and an unsupported command without spending an action.

Then show token proof separately: testnet chain badge, wallet faucet, exact
approval, reservation receipt, activation/burn, accepted world change, and an
unused reservation refund. Label local-EVM and Base-Sepolia recordings distinctly.
If a step is simulated, say so visibly. A collection of isolated happy-path clips
is not proof that the paid room and shared world are composed end to end.

Done means the actual homepage works, source builds/typechecks, meaningful tests
pass, supplied assets are integrated, shared server state is verified, and every
claim in the final handoff matches evidence. A mainnet token launch is not required
for this definition and must not be implied by a working tCTRL faucet.

## 15. References to recheck when wiring

- Event: https://blog.vibestarter.xyz/vibeathon-02
- Base network details: https://docs.base.org/get-started/connect-to-base
- Viem: https://viem.sh/docs/clients/wallet
- OpenZeppelin ERC-20: https://docs.openzeppelin.com/contracts/5.x/erc20
- OpenAI structured output: https://developers.openai.com/api/docs/guides/structured-outputs
- Existing alternative, Flok: https://github.com/munshkr/flok

Use current primary documentation for actual APIs and launch integration. Do not
assume model availability, free credits, working hosting access or sponsor support.
