# RPC recovery — 8 November 2026

Public RPC 429 errors blocked indexing of a confirmed 1,500-credit claim. Recovered every missing event without reminting. Added RPC failover and bounded 50k-block catch-up, with 200-block fallback for strict providers. Production sign-in/sync verified. See [RPC_INCIDENT.md](RPC_INCIDENT.md). Validation: 45 Node tests, 17 EVM scenarios, both TypeScript checks and production build.

# Verified live keyboard release — 7 November 2026

Production: https://ctrl-aquarium.vercel.app/#room
Keyboard contract: `0x115dcc1c6d311d65c0c1df808da3bd1467bae7e7` (Base Sepolia).
Full current rules: [KEYBOARD_SPEC.md](KEYBOARD_SPEC.md). English 2:20 demo video is complete in `../ctrl-demo-video/out/CTRL-demo-final.mp4`.

One turn = one command. Public 10 credits, Whale 50. Fees: 80% pool / 20% developer. Random rewards include zonk. Add a fish/treasure before taking a reward. Both habitats receive a finite treasury-funded seed of up to 300 each new round. No new fish purchase or hatch flow.

Validation: 17 local EVM integration scenarios, 40 Node tests, both TypeScript checks and production build. Dedicated live QA wallet imported its existing 1,440 credits, paid 20 for add + explode, received 30, and ended at 1,450. Pool: 300 + 16 − 30 = 286. Developer allocation: 4. Evidence: `public/docs/keyboard-live-qa.json`. This is a successful example, not a promised return.

New Redis document: `ctrl:state:keyboard:v1`; old document/backups retained. Old public history and callsigns carried forward. Old balances import once from the old contract, with faucet cooldown retained and any old pending packs required to settle first. Old UI: `/legacy/#room`; hosted new pack quotes and old free building mutations return 410. No runtime Blob calls.

Below is historical context from previous releases.

# Current version: paid keyboard turns

The pack/hatch design below is historical. The current mechanism is [KEYBOARD_SPEC.md](KEYBOARD_SPEC.md): one paid turn = one command, 80% reward pool / 20% developer, random zonk/rewards, and up to 300 treasury-funded credits for each new round in Public and Whale. Website: https://ctrl-aquarium.vercel.app .

> Storage update (2026-11-07): the deployed testnet now uses Upstash Redis Free, not Vercel Blob. GET is read-only; passive pages stop polling. Legacy off-chain sandbox is paused while its original Blob is suspended. See [STORAGE_INCIDENT.md](STORAGE_INCIDENT.md) for recovery evidence and limits.

# CTRL revision 4 — Base Sepolia + Vercel

Production: https://ctrl-aquarium.vercel.app
Mechanism docs: https://ctrl-aquarium.vercel.app/#docs
Contract: 0x06be0d3e30f135a3fd9a18a9e0476ed077fb5c15
Network: Base Sepolia (84532)

Wallet sign-in, daily faucet claims, pack purchases and payouts are now wired to the testnet contract. Wallet ownership survives reconnects and device changes. The visual world, history and secret reveal records are served by the backend.

See [TESTNET_SPEC.md](TESTNET_SPEC.md) for rules, trust boundaries, deployment and data recovery. The earlier v3 design remains available as an isolated credit sandbox via ?mode=sandbox#room and [V3_IMPLEMENTATION.md](V3_IMPLEMENTATION.md). It cannot convert its balances to tCTRL.

Implemented: signed wallet login, claim 1,500 tCTRL per 24h, fixed-price sealed packs, 20-second hatch, committed reveal, exact treasury payouts, maximum-payout reserve backing, on-chain wallet limits, owned-only black holes, protected unopened inventory, gradual visual regrowth, pending-transaction recovery and public mechanism docs.

All assets are test assets with no real monetary value. Outcome selection is controlled by the server and is not independently fair VRF. Per-wallet limits do not prove unique people. The prototype has not received an independent security audit.
