> Storage repair supersedes the original Blob design: see STORAGE_INCIDENT.md. Testnet runs on Redis, with 34 Node tests plus 11 EVM integration scenarios. Repeated GETs are verified not to persist any mutation.

# Revision 4 verification — 2026-11-07

Production: https://ctrl-aquarium.vercel.app
Contract: 0x06be0d3e30f135a3fd9a18a9e0476ed077fb5c15 (Base Sepolia 84532)

- 29 common/world/sandbox tests pass.
- TypeScript checks pass for the whole project and website.
- 10 local EVM integration scenarios pass, including cross-habitat three-purchase caps and batch-counted opening limits. They exercise actual compiled bytecode, three independent EIP-4361 logins, challenge replay rejection, one-per-day faucet, nontransferability, signed buyer-bound quotes, ownership/maturity checks, maximum reserve backing, black-hole settlement, another owner's retained entitlement, repeat-open rejection and wallet recovery.
- Private Vercel Blob CAS was tested against actual storage, including three concurrent writers and compressed weak ETags. Strong metadata ETags are checked before conditional updates; no lost increment was observed.
- Native ESM bundled function boot was checked locally. Hosted GET /api/testnet returns 200 and the configured chain/contract. The public RPC's 200-block log limit is honored; initial catch-up is bounded and visible.

## Live hosted transaction evidence

A separate disposable QA wallet was funded with 0.0002 Base Sepolia test ETH, keeping the admin's tCTRL faucet and purchase quota unused.

QA wallet: 0x85AB6A9E8437Ff0d70444Ad4E78542EB6e857361

- Claim: 0x0b13761ee24ca4b8d96863ff7efe1a81bdae0f1aada3a9a54fb0c4feff5656ca
- Purchase: 0x262ca23e4f23053f5f86c24b85b0215bc38a361bbc72d65e38f5a2e8234a9eb9
- Opening: 0x993a7ee20030d63640f4a2f5de0e2187352df2d76bc2d450c79103b2200bdbb9

The website issued a quote with no payout/nonce disclosure, received a confirmed 100-tCTRL purchase, reserved 320, enforced hatching and revealed a matching Keccak commitment. The contract paid 40 tCTRL. Website balance 1,440 matched balanceOf on-chain, reserve liability returned to zero, inventory became empty and both daily allowances decreased once. Net result -60; no outcome was changed to stage a win. Public evidence: /docs/live-testnet-qa.json.

## Hosted/UI checks

Production HTML, wallet onboarding, mechanism docs and contract links load successfully. Mobile 375px and tablet 768px layouts showed no horizontal overflow. The missing-wallet path directs users to an extension-enabled browser without asking for a key. Sandbox and testnet balances remain isolated. Local production mirror and hosted API return the same world/reserve from one private Blob store. Private env/state/source paths return 404. The admin on-chain faucet timestamp remains zero, with all three purchase/open allowances available.

## Limits

The in-app browser has no injected wallet: its fallback instructions were verified; no fake wallet was injected. Cryptographic login and on-chain transactions were verified with real locally signed testnet requests. No mainnet transfer occurred. Source bytecode hash verification is not a claim of an independent contract audit or BaseScan source verification. See TESTNET_SPEC.md and the website Docs page for the operator-randomness, per-wallet Sybil and backup/reorg limitations.
