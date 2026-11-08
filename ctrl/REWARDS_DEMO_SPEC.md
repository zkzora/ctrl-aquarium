> Historical document: revision 3 is implemented. CURRENT_STATUS.md defines current behavior; this older document is not the implementation authority.

# CTRL / discoveries and Whale Aquarium — current owner-approved demo scope

Updated 2026-11-07 (Asia/Jakarta). This amendment takes precedence over earlier
single-aquarium/no-reward frontend descriptions. Read it with WEBSITE_HANDOFF.md.

## Scope, product checkpoint and limits

The owner approved **demo credits only** for random creature/chest reveals and a
paid-in-demo-credits black hole. They also requested a second Whale Aquarium,
larger demo rewards, stock-inspired prizes, more creatures and a corrected shark.
All of this is local frontend simulation. There is no real-money stake, token
payout, wallet treasury, stock ownership, price feed, brokerage or redemption.
Do not convert this demo into live treasury payouts or real securities without a
separate explicit scope decision. Existing testnet turn-payment code remains a
different, still unconnected prototype.

Target user: community/stream participants who want to see a consequential shared
change. The failure is passive spectating without a turn or visible contribution.
The new mechanic adds discovery and a dramatic round-ending event. Its strongest
alternative is an ordinary loot/arcade game. The differentiated hypothesis is
that players enjoy creating a world that others inherit, and then witnessing a
shared collapse/rebirth. No demand, payment willingness or competition outcome
has been established.

Risk to the product: rewards can displace collaboration. In playtests observe
whether people still build shelters/scenery and return to see others' changes,
or only farm reveals and reset. Do not assume more rewards improves the game.

Minimal demo: switch Public/Whale, take a turn, open one chest, explode one
creature, review/confirm black hole, watch suction/reset, inspect the round/history,
then open the tier guide. Prove empty and non-empty branches in tests, not by
silently rigging the live demo. Real-world asset integration is outside this scope.

## Two habitats

| Habitat | Session reserve | Reward multiplier | Black hole cost |
| --- | ---: | ---: | ---: |
| Public Aquarium / 001 | 250 demo credits | 1× | 30 demo credits |
| Whale Aquarium / 002 | 2,500 demo credits | 5× | 120 demo credits |

Both aquariums retain independent worlds, history, rounds, allocation IDs and
reserve remaining while switching. The player credit balance and souvenir
collection are shared across the two habitats in this one browser session.
Switching is disabled while queued, controlling or processing a change.

Start balance: 300 free demo credits. `+500 demo credits` is a free testing refill
of the player's balance, not a reserve refill. The legacy simulated wallet faucet
can still add 100 once after a simulated connection. Refresh or explicit demo
reset restarts the whole local state; none of this is an accounting service.

## Inhabitants and published demo tiers

| Tier | Inhabitants | Empty probability | Non-empty base credit range |
| --- | --- | ---: | ---: |
| S / Leviathan | Whale | 10% | 35–60 |
| A / Abyssal | Manta ray, anglerfish | 25% | 16–30 |
| B / Rare | Shark v2, lionfish; treasure follows the same table | 35% | 8–15 |
| C / Uncommon | Clownfish, blue tang, jellyfish, crab | 50% | 3–7 |
| D / Everyday | Orange, blue and yellow reef fish | 60% | 1–4 |

Whale, manta and anglerfish are seeded in Whale Aquarium and the demo prevents
spawning them in Public Aquarium. Other creatures can be added to either habitat.
Prompt-created objects are **scenery without reward allocation**, regardless of
tier. Tier is a game category, not a financial valuation or biological taxonomy.

For each funded object: draw empty/non-empty using its probability. If non-empty,
draw a uniform integer in the inclusive base range, multiply by the habitat and
cap at reserve remaining. Debit that amount from reserve and credit the player.
If reserve is zero, nothing is awarded. Successful Whale A/S or treasure reveals
have a separate 20% chance of one uniformly selected NVDA/AAPL/MSFT demo card.
Cards carry no numeric share quantity, price, company claim or cash value.

Browser `Math.random()` is intentionally used for this entertainment-only local
demo. It is not verifiable randomness or suitable for a real treasury. Do not
advertise it as provably fair. Unit tests inject deterministic rolls into the
pure engine to verify all branches without rigging normal browser outcomes.

## Reveal and reset behavior

- `explode the orange fish`, `explode the shark`, `explode the whale`, and other
  supported creature aliases remove exactly one matching creature with bubble
  particles. No gore. A missing target rejects without charging/spending an action.
- `open the treasure` opens one unopened chest, leaves it in the scene and selects
  a full/glowing or truly empty art variant according to the result.
- Each funded object ID can reveal once. Restoring its image does not restore
  its eligibility. The engine maintains funded and claimed ID lists separately.
- `create a black hole` opens a cost review instead of charging immediately.
  It states cost, balance, reserve cap, zero-payout possibility and no undo.
- Confirmation checks the live turn, three-action budget and available credits.
  It charges once, reveals remaining eligible objects once, carries reserve
  remaining forward, reseeds the world with new IDs and increments the round.
- Black-hole proceeds currently go to the single local player. Contributor
  splitting is **not implemented or claimed**. Multiplayer distribution remains
  an unresolved future product decision.
- All three reveals use one accepted action each. Reward reveal/reset events
  cannot be undone. Existing normal build/environment undo remains available.
- A black hole does not reset turn time or give another three actions. A turn
  that expires during presentation ends after the busy effect completes.
- During snapshot replay, reward action buttons are disabled. History remains
  available; selected snapshots use their own habitat, world and timestamp.

## Presentation and assets

`app/aquarium.tsx` renders the appropriate background and twelve creature assets.
The black hole is a 4.2-second canvas effect: accretion glow/disk, every object's
spiraling position, shrinking scale, turning orientation, pulled bubbles, a dark
transition, and the next world's fade-in. It is an authored visual effect, not a
scientific relativistic fluid simulation. Creature bursts/chest effects last 1.4s.
Reduced motion skips the animated suction/particles and resolves in 350ms.
User presentation pause/freeze cannot extend the accepted action/credit result.

Effects use the world snapshot from before the change; the engine commits the
new state once and the renderer presents the transition. New effects have stable
IDs to avoid restarting on React updates. Full output/receipt is labeled demo.
Sound is off initially. Enabling sound permits original ambience and the new
pop/treasure/black-hole WAV cues; failures are nonfatal.

New original SVG sources: clownfish, blue tang, lionfish, manta ray, anglerfish,
whale, treasure-open, treasure-empty. Shark source, PNG exports and its motion
sheet were regenerated from a more natural side silhouette. All six new creatures
also have four-frame procedural SVG/PNG motion sheets and 2× PNG exports. These
are not skeletal animations; live canvas uses continuous pose/movement.

New native graphics: black-hole, bubble-burst, reward-coin, empty-reveal and three
clearly labeled demo souvenir cards with original chip motifs (no company logos).
New background: `whale-backdrop.png`, generated with the native image tool.
Exact provenance/prompt: `public/assets/ASSET_LICENSES.md`.

## Source integration seam

| File | Responsibility |
| --- | --- |
| `lib/catalog.ts` | Twelve inhabitants, tiers, odds/ranges and habitat settings |
| `lib/world.ts` | Expanded asset kinds; biome/round/opened flags; existing bounded world engine |
| `website/reward-engine.ts` | Pure clone-and-return local credit/reveal/reset transaction |
| `website/demo.ts` | Local two-room state, one in-flight command, review/reveal UI state, timing |
| `app/rewards-ui.tsx` | Habitat selector, reserve panel, cost review, result, collection, tier guide |
| `app/aquarium.tsx` | Background/creatures, before-world transition and VFX |
| `tests/rewards.test.ts` | Nine meaningful reward/reserve/round/eligibility/expiry tests |
| `tools/build-rewards-assets.py` | Reproducible original vector effects/cards and synthesized sounds |

The HTTP API and Solidity contracts do **not** implement this reward engine.
Merely importing this client module into the Worker does not establish secure
accounting. For real shared demo credits, Claude should move eligibility, balances,
RNG, serializable mutations, idempotency, reserve/round history and action/clock
checks to the server and expose an explicit versioned command contract. Ensure
one room mutation and one player-balance mutation are atomic under concurrency.

The shared parser knows the new creature names. The optional AI interpreter's
schema and backend habitat authorization still need review; the local frontend
enforces Whale-only creature spawning. Destructive/reveal commands are intercepted
by the demo adapter and must not silently fall back to adding an object.

## Verification

`npm test`: 14/14 (5 original world tests + 9 reward tests). Dedicated frontend
strict typecheck/build pass. Resource validator reports 106 resources at this
revision (58 SVG, 37 PNG, 11 WAV); exact hashes are in the manifest.

Browser inspection observed a Whale chest awarding 75 demo credits, a shark
revealing zero, then black hole charging 120 and revealing 505. Balance reconciled
300 + 75 + 0 - 120 + 505 = 760, reserve 2,500 - 75 - 505 = 1,920, round became 02
and inhabitants were reseeded. Those are observed random demo outcomes, not
promised returns. S-tier filtering showed one whale out of twelve guide entries.

No real treasury wallet, transfer, token claim, stock/share, mainnet launch,
verifiable randomness service or hosted multiplayer was involved.
