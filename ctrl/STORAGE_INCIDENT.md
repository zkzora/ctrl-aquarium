# Storage incident and repair — 2026-11-07

## Cause

The first Vercel backend used Blob as a frequently updated database. The browser polled roughly every four seconds while visible. Each request performed several private Blob reads, a cursor update, and persisted seenAt/presence even without a user action. A 22.69 KB dataset exhausted the Hobby operation quotas (screenshot: about 3.2K advanced / 2K and 15K simple / 10K). Deleting projects cannot undo operation usage. Blob was confirmed Suspended; private document reads returned 403.

## Repair

- Upstash Redis Free, autoUpgrade=false, eviction=false. No paid plan was enabled.
- Deployed testnet handler imports Redis storage only; it has no Blob client or automatic fallback.
- One ordinary GET reads one Redis document and returns a detached snapshot. It persists no sessions, presence, timers, scenery or index cursor. Repeated GETs cause zero writes.
- Browser animation/timers stay local. No recurring API calls on home/docs/guide, hidden tabs, signed-out views, a service error, or after two minutes without input.
- Interacting signed-in aquarium viewers refresh at most once per 30 seconds; active keyboard controller at most once per five seconds. Actions/transaction settlement explicitly refresh and synchronize chain events.
- Missing durable data fails closed. Atomic Redis compare-and-swap retries prevent dropped concurrent changes. No expiration is assigned to game state.

## Recovery

The suspended Blob is retained, not deleted. Reads were blocked, so this was not a complete byte-for-byte Blob migration. A preserved local pre-transaction snapshot plus all contract events were recovered. At the checkpoint, chain history contained exactly one faucet claim, one purchased QA pack and its completed opening, with zero unopened packs. Public reveal data allowed reconstruction without inventing or redrawing a secret. Migration checked each wallet balance, pending pack IDs and both habitat reserves/rounds against the contract at the indexed block. Contract address, balances, payouts and wallet quotas were preserved.

Private backup and audit: .ctrl-data/backups/testnet-recovered-for-redis.json and .ctrl-data/recovery/redis-migration.json. Both are excluded from source/deployment archives. The independent legacy production off-chain sandbox is paused rather than replacing inaccessible balances with a fresh account. It can be migrated only after its original data becomes readable. Any profile/visual-only edits made exclusively in suspended Blob after the local snapshot are not proven recoverable; its original source remains intact.

The existing Blob usage counters cannot be reduced by this code change. Redis Free has its own limits; no unlimited-usage claim is made. Do not restore frequent polling or make page reads persist presence again.

## Evidence

34 Node tests cover the common engine, concurrent Redis CAS, missing-state rejection and polling rules. Local EVM integration includes a twenty-refresh byte-for-byte durable-state check plus actual wallet/contract purchase/open/black-hole behavior. Hosted verification passed: 20 authenticated GETs left the Redis document byte-for-byte unchanged. Recovered QA balance remained 1,440 tCTRL, Public reserve 9,960 and no pending packs. The deployed API bundle contains neither the Blob storage endpoint nor BLOB_READ_WRITE_TOKEN. No new on-chain transaction was submitted during repair. Production deployment: dpl_EjLFkRpu4FEFbJ6ZT1gvvQBcaQz2.
