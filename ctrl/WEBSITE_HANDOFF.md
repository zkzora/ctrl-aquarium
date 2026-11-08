> Historical document: revision 3 is implemented. CURRENT_STATUS.md defines current behavior; this older document is not the implementation authority.

# CTRL — complete website frontend handoff

**2026-11-07 update:** Read `REWARDS_DEMO_SPEC.md` first. Two habitats, twelve
inhabitants, the corrected shark, tier guide and reveal/black-hole flows are
implemented with local demo credits only. No real rewards or securities are wired.


Updated: 2026-11-07 (Asia/Jakarta). Read this before `CLAUDE_CODE_SPEC.md`.

## What the owner asked for

Deliver one complete website with its visual assets, layouts, components, content,
responsive behavior, and interactive frontend states. Claude Code will implement
the actual system. Preserve this website; connect the system to it instead of
replacing it with a generic dashboard or starting the frontend again.

This is **a finished frontend demo and a partial backend prototype**. It is not a
deployed multiplayer application. The website does not request a real wallet,
call an AI provider, send a transaction, or fetch `/api/world`. Its local adapter
and seeded participants are explicitly labeled. There is no token launch here.

## Product checkpoint

- **Who:** community builders and stream viewers who want to participate in an
  evolving world instead of watching one person do all the work.
- **Failure:** the audience's ideas have no clear turn or visible consequence;
  the person at the controls carries the work and everyone else waits.
- **Mechanism:** temporary FIFO control, a 60-second limit, three accepted changes,
  inherited world state, and replayable authorship.
- **Strongest alternative:** an ordinary collaborative sandbox or a
  stream-controlled game. A token by itself does not differentiate CTRL.
- **Advantage to validate:** short, visible interventions and the desire to return
  to see what someone else did to your creation.
- **Validation:** observe three independent participants taking turns. Check
  whether they understand their role, see a change quickly, and want another turn.
  Willingness to pay is unverified.
- **Smallest real demo:** Alice adds a shark, Bob sees it on another device and
  adds shelter, Cara reverses gravity, then all inspect the same persisted history.
  Separately prove one Base Sepolia booking/activation/refund lifecycle.
- **Chain rationale:** Base Sepolia is the current payment prototype and fits the
  event's Base context. Confirmed ERC-20 spend/escrow supports auditable access;
  world simulation and rendering remain offchain. Deployment alone is not an edge.

## Open it now

### No installation

Extract `CTRL_WEBSITE.zip`, then open `index.html` inside its website folder.
The production JS and CSS are inlined so local file previews do not need a
bundler, CDN, remote font, account, or backend. Keep the adjacent `assets/` folder.
The full source handoff also includes this in `website-dist/index.html`.

File previews may restrict screenshot export and clipboard. Both controls show
recovery guidance. The bundle is authored without external code dependencies;
direct file:// launch was not browser-verified because the automation browser
allows HTTP/HTTPS only. The actual production bundle was tested over local HTTP.

### Source development

Use Node >=22.13.0, then from this directory:

```sh
npm ci
npm run website:dev
```

The dedicated frontend server is `http://127.0.0.1:4173/`. It does not require D1,
Wrangler bindings, an RPC key, test ETH, or a model key.

```sh
npm run website:typecheck
npm run website:build
npm run website:preview
```

`website:preview` serves the build at `http://127.0.0.1:4174/`.
`website:build` builds Vite assets and creates an offline-ready
`website-dist/index.html`. The full backend build remains `npm run build` and is
a separate integration check. A successful frontend build is not evidence that
the Worker API or contracts work end to end.

## Website inventory

| Surface | Included behavior |
| --- | --- |
| `#home` | Editorial landing, custom CSS keyboard sculpture, aquarium preview, shark/shelter story, three-step handoff, token explanation, final CTA |
| `#room` | Canvas aquarium, controller/timer, watch/queue/control states, local queue, action budget, composer, examples, latest changes, replay mode |
| `#history` | Snapshot cards, text search, all/your/environment filters, empty states, replay selection |
| `#guide` | Rules, illustrated inhabitants, supported environment actions, expandable FAQs, room/token CTAs |
| Wallet dialog | Disconnected/connected demo identity, faucet, credits, callsign validation, reservation, insufficient credits/duplicate-turn disables, disconnect |
| Token dialog | Concrete access utility and a truthful distinction between simulation and planned onchain behavior |
| Preferences | Light/dark UI, user-initiated ambience, presentation pause, local reset |
| Share dialog | Copy frontend URL with explicit independent-world limitation and clipboard recovery |
| Shared UI | Responsive navigation, skip link, visible focus, native modal focus trap/Escape/focus return, toast feedback, error boundary |
| Asset archive | Existing standalone gallery and all 106 original visual/audio resource files |

Global navigation is hash based. Browser back/forward and direct `#room`,
`#history`, `#guide` entry work. Replay selection, filters and the local world are
session state, not durable shareable records. The real backend integration must
introduce room IDs and durable event IDs in URLs.

## Visual system to preserve

- Light neutral paper background, black primary buttons, large close-spaced
  sans-serif titles, monospace experiment labels, thin dividers, restrained radius.
- The existing original blue aquarium is the dominant colored image; don't add
  unrelated stock photography, trading charts, token price cards, or testimonials.
- Dark interface is available without changing aquarium lighting.
- CSS keys, arrow motifs, specimen grids, initials avatars and timeline numbering
  are authored website graphics. They don't need additional image downloads.
- Fonts are system Arial/Helvetica, Courier New/Consolas, and Georgia for selected
  italic display text. No external font loading or font license dependency.
- Lucide React supplies UI icons. Keep one icon family.
- Tokens and light/dark values live at the top of `app/globals.css`; layout
  breakpoints are 1100, 800, and 600 px. Mobile prioritizes the control panel
  immediately after the world and its status bar, before the illustrative queue.
- Audio starts muted; no autoplay. Reduced-motion preference stops nonessential
  CSS movement and holds the world presentation. Viewer pause is separate from
  the world `freeze` command.

`brand.md` remains deferred: this is the neutral frontend direction, not an
approved future mainnet token identity. Do not block wiring on a brand interview.

## Source and integration map

| File | Purpose / what to do next |
| --- | --- |
| `app/ctrl-site.tsx` | Complete client UI. Components include WorldStage, CommandPanel, Controller, RecentChanges, HistoryPage, GuidePage, WalletModal, ModalFrame. Replace data handlers, preserve presentation. |
| `app/page.tsx` | Re-exports the same frontend into the existing Next-compatible/Vinext app. |
| `app/layout.tsx` | Real CTRL metadata/favicon; starter title removed. |
| `app/globals.css` | Full responsive neutral design system, components, dark mode and accessibility states. |
| `website/demo.ts` | Explicit local-only demo adapter and seeded events per habitat. This is the principal seam to replace. No server/model/wallet requests. |
| `app/aquarium.tsx` | Shared canvas renderer. Accepts world, offset, paused, optional `at` for exact snapshot time, and stable onCanvas callback. |
| `website/main.tsx`, `website/index.html` | Standalone frontend entry. Keep usable for design QA independent of backend. |
| `vite.website.config.ts` | Dedicated static build/dev configuration, separate from existing Worker config. |
| `tsconfig.website.json` | Checks frontend and pure world engine without importing unfinished wallet/backend helpers. |
| `tools/build-website.mjs` | Standard Vite build plus JS/CSS inlining for local-file delivery. |
| `public/assets/` | Existing original artwork, audio, license/provenance, motion sheets, branding, manifest. |
| `lib/`, `app/api/`, `contracts/`, `db/` | Partial system prototype described in CLAUDE_CODE_SPEC.md. It is not connected to this UI. |

### Data adapter contract

Current `useDemo()` exposes:

```ts
{
  room: Room,
  mode: 'watching' | 'queued' | 'controlling',
  seconds: number, name: string, busy: boolean, error: string,
  connected: boolean, balance: number, claimed: boolean,
  paid: boolean, receipt: boolean, notice: string,
  setName(name), announce(message),
  join(token?: boolean), leave(), command(prompt): Promise<boolean>,
  connect(), claim(), disconnect(), reset()
}
```

Do not model real token amounts as JavaScript floating point. Add a production
adapter with bigint/string balances and explicit transaction state rather than
forcing actual chain semantics into these simplified demo fields.

The UI currently derives its Demo type from `useDemo`. Extract a neutral UI
interface and a deliberate mode selector when adding the real adapter. Retain a
separate explicit demo route/flag for demonstrations; never silently fall back to
seeded data after an API failure.

### Wiring steps

1. Audit/fix the known engine/API/contract issues in CLAUDE_CODE_SPEC.md. Re-run
   the full-repo typecheck; the known wallet event-args error remains outside the
   frontend typecheck. Do not suppress strict errors to get a green checkbox.
2. Replace useDemo with a server-backed room hook. Read `/api/world`, authenticate
   with the opaque server session, reconcile versions/server time, and handle
   reconnect/stale/offline states. Polling every 1.5–2s is acceptable initially.
3. Derive controller, countdown, queue, accepted actions and presence from actual
   server data. Remove `miso.eth`, pixel.bob, softsignal and the decorative demo
   controller from live UI. Empty rooms need their own empty state.
4. Connect name/join/leave/command actions. Keep text on rejection. Disable writes
   while stale or in flight. A rejected/expired command cannot consume an action.
5. Populate history from persisted changes. Snapshot replay must preserve the
   actual prior world's timing, lighting, gravity and objects. Add real room/event
   URL state; `at` is already a renderer input.
6. Replace WalletModal simulation with EOA connection, chain switch, confirmed
   allowance/approval/booking/activation/refund/recovery. Add appropriate states
   for no provider, wrong network, rejection, insufficient test ETH, pending,
   reverted, confirmed, activation window, missed slot, refund eligibility.
7. Add the contract setup/deployment flow and explicit sandbox/testnet selector.
   Those **real flows are not implemented in this frontend**. Keep sandbox watch
   free and separate a wallet signature from an onchain payment.
8. For actual receipts, show the verified chain/network/hash and explorer link.
   Remove `receipt: boolean` and replace with an auditable typed result. No
   simulated address/hash or explorer link exists in this delivery.
9. Configure optional server-side AI only after authorizing the controller.
   Keep bounded rules mode available; show the actual interpreter in the UI.
10. Test three independent browser sessions against one backend. Then verify
    Base Sepolia separately. Only after live behavior passes, replace demo labels
    with accurate sandbox/testnet connection status and remove fixture disclaimers
    from the live route. Keep truthful labels on the retained demo.

### Deliberate demo shortcuts, never production rules

- Join waits eight seconds, then locally grants a turn; illustrative queue entries
  don't run genuine remote players. The display loop recycles a fake controller.
- The local timer uses a browser interval. Production uses server-aligned time.
- Six authored history entries are created each fresh session; refresh resets it.
- Credits are local integers. Connect never touches `window.ethereum`.
- A claim grants 100 credits once per local session; a booking holds 10; leaving
  while queued returns them. Activation/burn is only simulated by the local turn.
- Parser is finite and deterministic. Demo adds a negation guard; the underlying
  parser still needs server-side semantics validation for unsupported removals,
  quantities and compound instructions.
- History card thumbnails are illustrative static compositions. The actual
  replay canvas receives the real selected snapshot and its timestamp.
- The fixed 25°C badge is decorative world metadata, not a measured sensor value.
- Pause/resume holds the current presentation, then resumes current world time;
  it cannot pause a real paid/control slot.
- Screenshot export can be blocked for file:// canvas images. Local HTTP works.
- Preferences reset intentionally discards local state. Production reset must
  have authorization and must not erase a shared world via a client-only button.

## System requirements for Claude Code

See the detailed matrix in CLAUDE_CODE_SPEC.md. Minimum actual wiring needs:

| Need | Frontend demo | Real system |
| --- | --- | --- |
| Node + npm dependencies | Needed for source work only | Needed |
| Persistent database / D1 bindings + migrations | No | Yes |
| Server session, concurrency, request budgets | No | Yes |
| Realtime/polling endpoint | No | Yes |
| Public HTTPS hosting/access suitable for judges | No | Yes |
| OpenAI key | No | Optional; rules mode still works |
| RPC | No | Yes for testnet rooms; dedicated endpoint preferred |
| Wallet + Base Sepolia test ETH | No | Yes for actual onchain tests |
| Verified deployed test contract addresses | No | Yes for token-backed rooms |
| Mainnet token launch terms/audit/liquidity | No | Separate scope; not authorized here |

No credentials are in the website or archive. Preserve `.openai/hosting.json`
and its existing project ID if using Sites later; do not register a duplicate.
No hosted Site was deployed for this frontend delivery.

## Verification and next-owner checklist

Actual verification evidence is recorded in `WEBSITE_QA.md`. Re-run checks after
wiring. Static build/typecheck and local UI tests cannot prove multiplayer,
authorization, durable writes, real AI, or transaction correctness.

Before calling the real product done, demonstrate: three independent clients,
server-enforced FIFO and expiry, idempotent command handling, persistence after
reload, accurate replay, RPC/AI failure recovery, confirmed testnet spend and
refund rules, and mobile operation. Preserve the supplied visual quality.
