> Historical credit-sandbox implementation. TESTNET_SPEC.md defines the current wallet/testnet system.

# CTRL revision 3 — implementation and remaining work

## Product checkpoint

Target: builder/streamer communities changing and collecting within a shared aquarium. The concrete failure is that another player can erase or claim a fish someone paid for. CTRL stores the owned entitlement independently of its visible artwork. A world reset cannot remove the opening right.

The strongest alternative is a private pack-opening screen: simpler and more predictable. CTRL's proposed advantage is the inherited public world and collective spectacle. Whether users value this enough to return remains an unvalidated demand assumption. The minimal demo is three identities sharing a world, taking exclusive turns, buying/opening owned packs once, and retaining balances/ownership after restart. This is implemented and tested.

No chain is needed for the credit prototype. A future chain integration should make settlement, reserves or randomness independently verifiable; launching a generic token alone would not establish that advantage.

## Current rules (authoritative)

| Rule | Public | Whale |
|---|---:|---:|
| Pack price | 100 | 500 |
| 60% outcome | 40 | 200 |
| 25% outcome | 100 | 500 |
| 10% outcome | 200 | 1,000 |
| 5% outcome | 320 | 1,600 |
| Expected payout | 85 | 425 |
| Initial finite reserve | 10,000 | 50,000 |
| Optional black-hole fee | 30 | 120 |

Amounts are demo credits. Expected gross difference is 15% of purchases before optional fees and operating costs. Actual provider results may be negative, especially with few openings; profit is not guaranteed. Species tiers are cosmetic and do not change odds. Whale Rare/Legendary results include a fictional stock-inspired souvenir.

- Start with 1,500 free credits. Two free 500-credit refills per rolling 24h, at least ten minutes apart.
- Three purchases and three opened packs per rolling 24h across both habitats. Up to three pending packs, constrained by remaining opening allowance. A batch counts each opened pack.
- Draw once on purchase, retain a private outcome/nonce, publish `SHA-256(id|payout|nonce)`, and reserve the maximum possible payout immediately. Insufficient reserve blocks new sales; existing entitlements are never capped to fit available funds.
- Hatch for 20 seconds using server time. Owner-only individual opening is free. Receipts distinguish returned credits from net gain/loss and disclose commitment inputs.
- Black holes quote explicit ready owned pack IDs and the current round. One per identity per rolling 24h, with a 90-second room cooldown. They reveal the same locked outcomes, without another draw or multiplier. Other players retain unopened inventory, openable even before artwork returns.
- Collapse animation: 4.2 seconds. Empty world then one scenery arrival every 15 seconds, with bigger species later. Other owners' fish return gradually. Regrowth creates no redeemable packs and never refills the reserve.
- Building queue: free 60-second turns, three accepted world changes. Added scenery has no entitlement. Pack opening is separate from the queue. Undo is disabled in the shared economy.

Credits/souvenirs cannot be purchased with money, transferred or redeemed. No real token emission, cash-out or security exists here. This demo does not demonstrate token anti-dump behavior or sustainability of a real-value economy.

## Code map

| File | Responsibility |
|---|---|
| lib/pack-game.ts | Rules, accounting, quotas, private entitlements, commitments, retries, recovery |
| server/api.ts | GET/POST handler, cookie identity, origin validation, personalized state |
| server/file-store.ts | Process lock, serialized clone/write/rename transactions, persistence |
| tools/preview-website.mjs | Loopback HTTP server for built frontend and API |
| app/api/demo/route.ts | D1 adapter with atomic document/revision compare-and-swap |
| drizzle/0001_shared_credit_game.sql | D1 table; route creates it if absent |
| website/demo.ts | API client, polling, stale-write protection, same-ID retry, shared effects |
| app/rewards-ui.tsx | Purchase, inventory, odds, caps, black-hole quote, receipts, species guide |
| app/aquarium.tsx | Canvas animation and ownership markers |
| app/ctrl-site.tsx | Website, queue, history, replay and preferences |
| tests/pack-game.test.ts, tests/http-preview.test.ts | Engine and HTTP integration tests |

website/reward-engine.ts still supplies prompt/effect/type helpers; its v2 payout functions are unused by v3. app/api/world and the wallet/testnet contracts remain separate legacy prototypes. Older specs do not override this document.

## Persistence and trust

Local data is .ctrl-data/game-v3.json, excluded from delivery archives and Git. It contains private unrevealed outcomes. A process lock prevents two writers. Failed mutations do not commit. Corrupt/incompatible state fails closed rather than silently creating fresh credits. Preserve a backup before any data migration.

Identity uses a random HttpOnly, SameSite=Strict cookie; the public player ID is its hash, not the credential. Clearing cookies loses access and can bypass quotas. Multiple profiles/bots can also bypass per-identity caps. No recoverable account or unique-person verification exists yet.

A commitment proves consistency with the previously published hash, not independent randomness or that the server did not choose an outcome. Demo reserves are finite and initialized once. Sales do not silently refill or reset them.

## Remaining production work

1. Validate demand with five target community users: comprehension of ownership, interest in shared consequences, voluntary return visits.
2. Add recoverable authentication, stronger identity verification and abuse protection. Cookie caps are not Sybil resistance.
3. Load-test and partition the single D1 document before significant scale. Add versioned migrations, retention, monitoring, backups and recovery procedures.
4. Configure a public deployment. Current preview is bound to this computer; no external publication has occurred.
5. If real value is proposed, separately design/review verifiable randomness, funded liabilities, custody, settlement, contracts and applicable market access. None is connected here.

No model key is needed: commands use a finite English/Indonesian parser. Free-form generated worlds, live wallets and mainnet transfers are not implemented or verified.
