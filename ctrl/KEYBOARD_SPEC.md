# CTRL Keyboard — current specification

The current game sells keyboard turns, not fish, cards or packs. Community builders inherit the same world. A player writes a supported command, pays one turn and executes it; the command changes the aquarium for everyone. Fish and treasure are shared targets. The former pack and hatch design is retired.

## Exact rules

| Rule | Public | Whale |
|---|---:|---:|
| One turn / one command | 10 credits | 50 credits |
| Reward-pool share | 8 (80%) | 40 (80%) |
| Developer share | 2 (20%) | 10 (20%) |
| Initial and next-round base seed | 300 | 300 |
| Total finite seed treasury including first seed | 10,000 | 50,000 |

Per fish or chest: 60% zero, 25% 10/50, 10% 30/150, 5% 80/400 (Public/Whale). Appearance tiers do not change odds. Each roll is capped by available pool plus this turn's pool share. Nominal mean before caps: 9.5 / 47.5 credits per target, not per paid turn. Add/environment commands pay no direct reward. No guaranteed player or developer profit.

Every add command containing fish or treasure unlocks one reward command in that same habitat and round. Adding three targets still grants one contribution. Explode, open and black hole each consume one contribution when their ticket is paid. Plants, shelters and environment changes grant no contribution. Across both habitats: 20 paid turns, 5 paid reward commands, 1 paid black hole per wallet per rolling 24 hours. These are wallet caps, not Sybil resistance.

A black hole requires three executed turns and 90 seconds in the round, costs one normal keyboard turn, rolls once for every fish/chest visible at quote time, in world order, pays the aggregate capped reward to its controller and removes the whole world. A natural clear also closes a round once when every object is gone and scheduled arrivals are complete. Unspent pool funds carry forward; the next round receives min(300, seed reserve). There is no extra guaranteed 300-credit payment to the last player. At reserve exhaustion no seed is minted. New inhabitants appear every 15 seconds after the 4.2-second effect; deleted arrivals never respawn in that round. Initial Public has 8 objects; initial Whale uses the inherited live scene. Both have a 300-credit pool.

Whale payouts of 150+ also award one fictional NVDA/AAPL/MSFT souvenir chosen from the commitment nonce. These are not securities, tokens or redeemable assets.

## Transactions and recovery

1. Connect injected EVM wallet, switch Base Sepolia 84532, sign SIWE login (8 hours; five-minute one-use challenge).
2. Claim 1,500 nontransferable credits once per rolling 24 hours. Test ETH pays gas.
3. Server validates one prompt and world sequence before signing an EIP-712 Keyboard quote. It stores a private plan/nonce/payout in Redis before returning the quote. The result remains hidden.
4. `buyTurn(quote,signature)` imports an old balance once if required, charges the turn fee into escrow, reserves the aquarium keyboard and daily allowances, and consumes a reward contribution where required.
5. Server reveals the proof only after indexing that paid ticket, to its authenticated buyer.
6. `executeTurn(id,payout,nonce)` requires ownership, matching commitment and an unspent unexpired ticket. It charges no second credit fee. Pool share, developer transfer, payout, counters, round and seed update atomically. The backend projects confirmed events into the world.
7. If the user cancels the second wallet confirmation, Execute paid turn resumes it. At five minutes `expireTurn(id)` is callable by anyone: it releases the keyboard, allocates the already-paid fee 80/20, advances sequence and gives no reward. Daily allowances remain spent. There is no refund after a result is knowable, preventing cost-free rerolls. Gas is additional and nonrefundable.

Quote expiry is two minutes; paid ticket expiry is five minutes. Quotes bind buyer, habitat, sequence, round, action hash, outcome commitment, flags and target count. A stale quote fails before payment. Unpaid expired quotes are pruned; paid plans are permanent recovery data. A pending paid ticket blocks only that aquarium. Other-world transactions cannot bypass daily allowance reservations.

## Trust boundary

Contract: credit balances, ownership, one execution, fee split, contribution counters, limits, pool cap, finite seed reserve, timeout allocation. Backend: command validation, visual world, targeted objects, random selection and signatures. Commit/reveal proves consistency, not independent fairness. No VRF. tCTRL from the old version imports as kCTRL in the new contract, once per wallet. Both are valueless test credits. No transfer, approval, trade or cash-out methods.

Storage: new persistent Redis key `ctrl:state:keyboard:v1`; legacy `ctrl:state:v4` retained unchanged. CAS retries mutations; ordinary GET uses one Redis read and no writes or RPC. Hidden/background/idle/signed-out/passive pages do not poll; active room refreshes are bounded. No runtime Blob operations. Upstash Free auto-upgrade remains disabled.

## Migration

The immutable old pack contract remains readable. `/legacy/#room` retains old receipts and lets existing packs settle; new pack quotes/free building turns are rejected by the hosted legacy adapter. New contract `migrate()` imports the current old on-chain balance and preserves its faucet timestamp exactly once. Unopened old packs must be opened before migration; the contract enforces this so future pack payouts are not stranded after import. Later old-ledger changes are not imported again. The old contract cannot be disabled, so this is a testnet migration rather than a bridge or burn migration.

`tools/migrate-keyboard.ts` verifies runtime/signer, saves a private pre-migration backup and seeds a separate Redis document using SET NX only. It preserves callsigns, souvenir collection, inherited scene and history. Credit balances are projected from on-chain migration events, not reminted from an untrusted browser snapshot. No existing destination is reset.

## Code and checks

- `contracts/CTRLKeyboard.sol`, `contracts/compile-keyboard.mjs`
- `lib/keyboard-config.ts`, `lib/keyboard-game.ts`
- `server/keyboard-api.ts`, `server/vercel-keyboard.ts`
- `website/game-client.ts`, `app/rewards-ui.tsx`, `app/testnet-ui.tsx`
- `npm run test:keyboard`: 17 local EVM integration scenarios, including exact fee split, immediate explode/open, both habitat collapses, one-time seed, legacy import/cooldown, expiration anti-reroll, shared reward and turn caps.
- `npm test`: 40 engine/storage/parser/legacy scenarios, including six new keyboard tests.
- `npm run website:typecheck`, `npm run typecheck`, `npm run vercel:build`.

This is an unaudited testnet prototype. Mainnet randomness, real token economics, bot resistance and production review are separate work. The demo video remains paused until this corrected mechanism is verified live.
