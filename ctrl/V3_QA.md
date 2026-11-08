# Revision 3 verification — 2026-11-07

Executed on Windows with Node 24.16.0.

- `npm test`: 29/29 pass. Includes three distinct cookies over real HTTP, exclusive queue handoff, shared environment changes, restart persistence, ownership rejection, locked-result hash, exact probability boundaries in both habitats, retries, daily limits, stale black-hole quotes, reserve backing and incremental recovery.
- `npm run typecheck` and `npm run website:typecheck`: pass.
- `npm run website:build` and `npm run build`: pass. Framework build includes /api/demo and /api/world.
- Local Worker/D1 smoke on port 4175: page and cookie load, concurrent same-ID purchases return one pack and one charge, subsequent GET retains inventory and reserve, private outcome omitted. This verifies local D1 emulation, not a hosted deployment or load test. The temporary Worker was stopped after checking.

Browser checks use localhost:4174 as a separate demo identity from the user's 127.0.0.1 profile. Public shark purchase deducted 100, hatched, returned 40, and showed net -60. Reload retained the 1,440 balance and receipt. Browser-side SHA-256 verification matched the original purchase hash.

Treasure black hole quoted 30 extra credits, opened exactly one owned pack, reported 40 returned and net -90 including purchase, and advanced to round 2. The world was empty at collapse and later showed two arriving fish rather than the entire initial population.

Whale purchase deducted 500, reserved its maximum 1,600, and used the remaining cross-habitat purchase quota. The fourth purchase button was disabled. Opening returned 1,600 credits, showed net +1,100 and a fictional AAPL souvenir; no outcomes were edited for the test. Collection counts are stored independently of receipt retention. Mobile layout checked at 375px without horizontal overflow. Receipts can be reopened after reload; no second payout occurs.

Limits: browser identity is not verified human identity; no cross-device recovery. No real token/wallet/stock, hosted deployment, free-form AI, external VRF or production load test. Old v2 module tests are legacy coverage, not evidence that v3 caps paid results (it does not).
