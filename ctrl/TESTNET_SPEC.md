# Current version: paid keyboard turns

The pack/hatch design below is historical. The current mechanism is [KEYBOARD_SPEC.md](KEYBOARD_SPEC.md): one paid turn = one command, 80% reward pool / 20% developer, random zonk/rewards, and up to 300 treasury-funded credits for each new round in Public and Whale. Website: https://ctrl-aquarium.vercel.app .

> Storage update (2026-11-07): the deployed testnet now uses Upstash Redis Free, not Vercel Blob. GET is read-only; passive pages stop polling. Legacy off-chain sandbox is paused while its original Blob is suspended. See [STORAGE_INCIDENT.md](STORAGE_INCIDENT.md) for recovery evidence and limits.

# CTRL revision 4 — wallet, settlement and hosting

## Product checkpoint

Target: builder and streamer communities who want collective world changes and owned mysteries. A concrete failure is another participant erasing or claiming a fish someone bought. A pack entitlement belongs to its wallet independently of its artwork. The strongest alternative is a private pack-opening screen: simpler and more predictable. CTRL's proposed edge is a public inherited world and collective spectacle, not a novel randomness or financial primitive. Demand and retention are not yet validated.

Minimal demo: three wallets inherit a shared aquarium, take exclusive building turns, claim test credits, buy owned packs, reveal once, retain ownership after a collapse, and reconnect without resetting quota. Contract ownership and settlement are externally inspectable on Base Sepolia; the chain is used for actual accounting rather than a decorative token deployment.

## Deployment

- Website: https://ctrl-aquarium.vercel.app
- Docs: /#docs
- Chain: Base Sepolia, 84532
- Contract: 0x06be0d3e30f135a3fd9a18a9e0476ed077fb5c15
- Deployment transaction: 0x92af089a719aef0bb03beac17afe21d240701ffee2de8ce291204757d3d4d085
- Deployment block: 55546714
- Deployer/admin: 0xd41C88eE843dcCBe6E8AD3D62e4c33Ccb6C9787b
- Outcome oracle: 0xCCc109e39ADf2A6F8B12411F214c63Dea0CF3b5F
- Compiled runtime hash: 0xac3396ff91579fc8449fc10a6983d890be7986b1af261e44b7b1bfc6f61f1913

The deployed runtime was compared directly with the compiled artifact. This is bytecode verification, not a claim that BaseScan has independently verified source or that a security audit exists. Public source/ABI/deployment metadata are in public/docs.

## Economy

Amounts are nontransferable, nonredeemable tCTRL test credits (ERC-20 with zero decimals). No mainnet currency or actual stock is supported. Tokens cannot be externally transferred, approved or traded. Purchases are internal atomic token transfers; no approval transaction is needed.

| Rule | Public | Whale |
|---|---:|---:|
| Pack price | 100 | 500 |
| 60% outcome | 40 | 200 |
| 25% outcome | 100 | 500 |
| 10% outcome | 200 | 1,000 |
| 5% outcome | 320 | 1,600 |
| Expected return | 85 | 425 |
| Initial reserve | 10,000 | 50,000 |
| Optional black-hole fee | 30 | 120 |

The server's illustrative distribution has an expected gross difference of 15% before optional fees and costs. Profit is not guaranteed. The contract enforces allowed payout values and a purchased commitment, not the frequency of those values. Tiers/species are cosmetic. Whale outcomes of 1,000/1,600 also create a fictional stock-inspired souvenir in the backend collection, not an on-chain stock/NFT.

- Faucet: 1,500 tCTRL once per wallet every 24 hours. No automatic starting balance and no 500-credit sandbox refill in testnet mode.
- Three purchases and three opened packs per rolling 24h across both rooms. At most three pending packs, constrained by remaining opening allowance. Batch opening counts each pack.
- Maturity: 20 seconds from the purchase block timestamp. Only the owner can reveal. Individual opening has no additional tCTRL fee, but always costs test ETH gas.
- Maximum liability (320/1,600) is reserved at purchase. The contract rejects unfunded new sales. Rewards are never clipped after purchase. Sales and world resets do not refill the finite reserve allocation.
- Black hole: caller-owned, ready, explicitly quoted pack IDs and the current on-chain round. One per wallet every 24h and a 90-second habitat cooldown. Extra fee 30/120; same committed results, no additional draw.
- Other owners keep all unopened entitlements. The visual world collapses for 4.2 seconds, then scenery regrows every 15 seconds. Large species return later. Artwork arrivals never create new reward entitlements.
- Building: free server-side 60-second turns with three accepted commands. Added scenery has no reward allocation. Undo is disabled in the shared economy.

## Purchase and reveal

1. Authenticated wallet requests a quote. Backend selects a payout and private 32-byte nonce using crypto RNG.
2. Persist the private record before returning a signed EIP-712 Purchase quote. Domain binds chain 84532, contract, name and version; message binds buyer, pack ID, habitat, species, commitment and five-minute expiry.
3. Contract checks the oracle signature, buyer, bounds, cap, balance and reserves, then charges the fixed price and creates a pack.
4. Backend indexes confirmed PackBought events into the visual shared aquarium. A quote alone is not a purchase and never changes a balance.
5. After hatching, owner requests reveal inputs and confirms openPack / blackHole in their wallet.
6. Contract checks `keccak256(abi.encodePacked(bytes32(packId), uint256(payout), bytes32(nonce)))`, owner, maturity, allowed payout and quotas. It pays the full result and emits PackOpened.
7. Backend indexes events once using a durable block cursor. Receipt shows payout separately from net after purchase/effect fees and links to BaseScan. Client can recompute the commitment.

The oracle can choose outcomes, select issuance and withhold reveal data. This is not VRF or independently fair randomness. Private records must survive for reveals; there is no automatic refund or independent secret recovery if they are lost. The user sees the outcome before signing its opening; purchase cost has already been paid and cannot be refunded by selectively refusing a losing reveal.

## Identity and API

/api/testnet GET returns personalized safe state, testnet configuration, actual pinned on-chain balance and limits. POST supports wallet-challenge, wallet-verify, wallet-disconnect, quote, reveal, sync, setup, plus free building join/leave/command/rename. Cookie identifies a server session; inventory identity is wallet:<lowercase address>.

EIP-4361 sign-in: domain/origin/address/chain-specific nonce, five-minute challenge expiry, single use, eight-hour auth session. HttpOnly + SameSite=Strict cookies; Secure on HTTPS. JSON/origin/body-size checks and 30 mutations/minute/session. Wallet reconnect on a new device recovers the same inventory. Per-wallet caps do not stop Sybil wallets; cookie rate limits are not a global bot-defense system.

Transactions are never auto-resent after a mined/pending hash. Local public hash metadata supports Recover transaction after reload/timeout. Reverted transactions clear the pending lock; merely slow confirmation preserves it. Backend rejects any attempt to use the sandbox payout mutations against testnet mode.

## Hosting and private state

Vercel serves website-dist plus native ESM api/testnet.mjs and api/demo.mjs. tools/build-vercel-api.mjs bundles the TypeScript handlers, avoiding extensionless ESM imports and supplying native require for bundled CJS dependencies.

Production state is a PRIVATE Vercel Blob document, ctrl/state-v4.json. Uncached reads and strong ETag conditional writes serialize state across serverless instances. Compressed reads can have W/ ETags; the adapter confirms the matching strong metadata ETag before CAS. If another version was written, it retries against the new document. No filesystem/in-memory fallback creates fresh credits on a storage failure. Sandbox uses another document in production and a separate local file in the local preview.

Public Base Sepolia RPC permits at most a 200-block log range. The indexer advances a durable cursor in bounded pages and shows catching-up state while purchases are disabled. A one-confirmation projection is used. Automatic chain-reorganization rollback, large-scale partitioning, retention, complete backups and independent auditing remain future work.

CRITICAL: one deployed contract/oracle must use one shared private quote database. Local production mirrors use the same private Blob store as Vercel. A separate file store cannot reveal quotes issued elsewhere. The local preview loads .env.production.local when present and refuses a production-contract mirror without its shared storage credentials. A fresh isolated local lab needs a different contract and oracle.

Runtime Vercel settings: BLOB_READ_WRITE_TOKEN, CTRL_TESTNET_ORACLE_PRIVATE_KEY, CTRL_TESTNET_ADMIN_ADDRESS, CTRL_TESTNET_DEPLOYMENT_HASH, BASE_SEPOLIA_RPC_URL. The outcome oracle key is distinct from the deployer key. The dedicated deploy key was used only in a stdin process and is not saved in source or Vercel. Private runtime directories, env files and account tokens are excluded from deployment uploads and source archives.

Keep a private backup of the oracle key and Blob documents. Source ZIPs intentionally contain no private data and cannot recover unrevealed results by themselves. Do not reset the shared state to fix an error: preserve evidence and migrate explicitly.

## Verification and remaining work

29 common/sandbox tests; local EVM wallet/contract/API integration; exact deployed-bytecode hash check; actual private Blob CAS with three concurrent writers; browser UI/docs checks; hosted live testnet flow recorded separately. The in-app browser has no injected wallet, so extension transaction dialogs require a browser with the user's wallet. No fabricated browser wallet was injected for QA.

Remaining: independent contract/security review, stronger abuse control, load testing, production-grade event/reorg recovery, durable backup procedures, and user demand/retention validation. Any future mainnet/real-value design is separate from this valueless testnet build.
