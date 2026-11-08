# RPC recovery — 8 November 2026 (Asia/Jakarta)

Production logs showed HTTP 429 from `https://sepolia.base.org` for `eth_blockNumber` and `eth_getLogs`. Redis reads were healthy. A confirmed 1,500-credit faucet claim had not reached the visual ledger because the cursor was almost 200,000 blocks behind. No replacement claim or credit mint was sent.

Saved a private pre-recovery backup, then read every missing range with PublicNode and applied the existing confirmed-event projector and CAS cursor updates. The claimant's durable balance became 1,500, matching `balanceOf`. Pool balances remained 286 Public / 300 Whale.

Changes:

- A configured dedicated RPC remains preferred. Otherwise PublicNode is preferred, with the official Base endpoint as fallback. Failover happens only on real requests; no background health polling.
- Catch-up reads up to 50,000 blocks per log query. A provider range-limit response falls back to 200 blocks, without skipping history. A 429 does not trigger many smaller requests.
- Cursor progress and projected events still commit atomically. A current cursor also clears a stale syncing flag.
- RPC failures have a distinct recoverable message. Confirmed transactions must not be resubmitted.
- Reconnect performs explicit chain synchronization, clearing an old action error through the normal successful action flow.
- Ordinary GET remains a single Redis read, with no chain reads or durable writes. No Blob runtime operations were added.

Validation: five targeted regressions for 429 failover, large idle gaps, strict range fallback, bounded requests and one-time claim projection; normal engine/storage suite; TypeScript; production build; local EVM integration and production sign-in/sync verification.
