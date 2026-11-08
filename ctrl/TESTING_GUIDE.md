# Testing CTRL

Start with the [live Public Aquarium](https://ctrl-aquarium.vercel.app/#room). No source checkout, deployment permission, or private key entry is required to play. A local clone does not contain the hosted service's credentials or persistent state.

## Before you start

- Use a browser with an injected EVM wallet, such as Chrome/Brave with MetaMask, Rabby, or Coinbase Wallet. If an embedded browser reports that no wallet is available, open the URL in your wallet-enabled browser.
- Select **Base Sepolia**, chain ID **84532**. Use Base Sepolia test ETH for gas, not Ethereum Sepolia ETH or Base mainnet ETH. The [Coinbase Developer Platform faucet](https://www.coinbase.com/developer-platform/products/faucet) supports Base Sepolia; select that network when requesting funds. Faucet access and limits are controlled by its provider.
- The app grants **1,500 kCTRL** once per rolling 24 hours. kCTRL pays command fees; test ETH pays transaction gas. These are separate balances.
- Public costs **10 kCTRL per command**; Whale costs **50**. Both aquariums share the same wallet credit balance and daily allowances.

## First successful flow: add, then explode

1. Open the Public Aquarium and click **Connect & sign in**. Approve the network switch and sign the login message. This signature authenticates the wallet and moves no funds.
2. Click **Claim 1,500 kCTRL**. Confirm the on-chain transaction and wait for the credit balance to update. If the wallet already claimed within 24 hours, use its existing balance or wait for its cooldown.
3. Type `Add an orange fish` under **What happens next?** and click **Buy keyboard turn & run · 10 credits**.
4. Confirm **payment** in the wallet, then confirm **execution** when prompted. One command requires two transactions. The second transaction has a gas fee but does not charge another 10 credits. Wait for confirmation before continuing.
5. Check that an orange fish appears, the change is in World history, and the balance has decreased by 10. Adding a fish or treasure grants one reward contribution for that habitat and round.
6. Type `Explode the orange fish` and complete payment plus execution again. The command targets one matching shared fish; it does not require ownership of that particular fish.
7. Inspect the effect, reward receipt, balance, and transaction links. The matching fish is removed. A reward may be zero. Over both commands, the balance change is **−20 + actual payout**. For a fresh 1,500-credit wallet, that means **1,480 + actual payout**, assuming no other wallet activity.

The world is live and shared. Another player can remove a target or advance the round before your quote settles. Check the current scene and follow the validation message rather than repeatedly submitting the same stale command. A paid pending turn temporarily reserves that aquarium's keyboard.

## Other supported things to try

| Experience | Command / action | Expected behavior |
|---|---|---|
| Treasure | `Add a treasure`, then `Open the treasure` as separate paid turns | Adding grants one contribution; opening consumes one and rolls a reward, including zero. |
| Shared environment | `Turn gravity upside down` | One paid turn changes the shared scene; this grants no reward contribution and pays no direct reward. |
| Whale Aquarium | Switch aquariums, then `Add a whale` and `Explode the whale` as separate turns | Same payment/execution flow at 50 credits per command. Add a contribution in Whale first; Public contributions do not carry over. |
| Shared persistence | Open a second browser/device as a spectator and inspect the room/history | Changes persist after the controller leaves. Spectating requires no transaction; signed-out views do not continuously poll, so reload to see the newest state. |

Commands are a supported vocabulary, not arbitrary code execution. Use one direct command per turn. For example, submit `Add an orange fish` and `Explode the orange fish` separately, not as a combined sentence. Unsupported commands are rejected before payment.

## Black-hole walkthrough

This optional flow clears the shared scene, so complete the basic flow first.

1. Make sure you have an unused contribution in the selected habitat and round. After the initial add/explode flow, adding another fish grants one.
2. The current round must have **at least three executed turns** and be **at least 90 seconds old**. You must also have a reward-command slot and your daily black-hole allowance left.
3. Enter `Create a black hole`, review its targets and cost, and confirm the normal payment/execution flow. It costs one ordinary turn: 10 Public or 50 Whale.
4. The visible world collapses. The controller receives the aggregate random reward for the quoted fish/treasure targets, capped by available pool funds; the result can be zero.
5. After the 4.2-second effect, scheduled inhabitants return gradually, one every 15 seconds. The next round adds **up to 300 credits to the pool from a finite seed reserve**, with unspent funds carried over. This is not a guaranteed 300-credit payment to the player.

## Limits and expected outcomes

- Per wallet, across both aquariums, per rolling 24 hours: **20 paid turns, 5 paid reward commands, and 1 paid black hole**. Payment reserves allowances; switching aquariums does not reset them.
- Every add command containing fish or treasure grants **one** contribution in that habitat and round. Adding three fish in one command still grants only one. Environment changes, plants, and shelters grant none.
- Explode, open, and black hole each consume one contribution. A new round has its own contribution counters.
- On execution, **80% of the command fee goes to the reward pool and 20% to the developer allocation**. Public splits 8/2; Whale splits 40/10. Adding objects pays no direct reward.
- Per target, Public nominal rewards are **0 / 10 / 30 / 80**, with **60% / 25% / 10% / 5%** probabilities. Whale rewards are **0 / 50 / 150 / 400** at the same probabilities. Actual payouts are capped by pool availability. Fish appearance tiers do not improve odds.
- Whale rewards of 150+ may include a fictional stock-inspired souvenir. These are not actual shares or redeemable assets.

## Troubleshooting and recovery

| What you see | What to do |
|---|---|
| No wallet detected | Open the live URL in a browser with an EVM wallet extension enabled. |
| Wrong network / insufficient gas | Switch to Base Sepolia and obtain test ETH on that network. Claiming kCTRL does not supply ETH. |
| Confirmed claim, balance not updated | Check the submitted transaction on Base Sepolia. Use **Recover transaction** if offered; otherwise use **Reconnect** to synchronize confirmed events. Do not resend a confirmed claim. |
| Transaction still pending | Keep the transaction hash and check its explorer status. Use **Recover transaction** to resume tracking; a slow response does not prove failure. |
| Payment succeeded but execution was canceled | Use **Execute paid turn** before its five-minute expiry. The paid turn remains owned by that wallet; it does not need to be bought again. Gas is still needed to execute. |
| Paid turn expired | Use **Release expired turn**. It releases the keyboard and allocates the paid fee 80/20, with no reward or credit refund. Daily allowances remain spent. |
| Another turn is settling / stale quote | Wait for the pending turn or timeout to resolve, then prepare a fresh command against the current scene. |
| Add-first validation / no matching target | Add a fish or treasure in this habitat and round, and choose a target that is currently present. Check remaining daily reward slots. |
| No room for another object | The shared scene has reached its object cap. Choose a valid command against existing objects or wait for the world to change. |
| RPC/storage unavailable | Wait for service recovery, then reconnect/synchronize. No failed response should be treated as evidence of a successful transaction. Preserve hashes for transactions already submitted. |
| Wallet account changed | Connect and sign in with the active account again. Balances and paid turns belong to the wallet address. |
| Existing legacy wallet | Follow the migration notice. Existing unopened legacy packs must settle before a one-time balance migration; new users do not use the retired pack/hatch flow. |

## Verify the evidence

- [Keyboard contract](https://sepolia.basescan.org/address/0x115dcc1c6d311d65c0c1df808da3bd1467bae7e7): balances, paid tickets, pool accounting, fee split, and payouts settle on Base Sepolia.
- [Recorded live QA](public/docs/keyboard-live-qa.json): a dedicated wallet started with 1,440 credits, paid 20 for add + explode, received 30, and ended with 1,450. Pool allocation was 16 and developer allocation was 4.
- [Confirmed payout transaction](https://sepolia.basescan.org/tx/0x61177b4868de344e341b0c48f79ec3f20af780f9d6361f4ca5e0d3f0e7e46045). This is one historical outcome; your result can differ.
- [Current mechanism and trust boundary](KEYBOARD_SPEC.md): the server validates commands, simulates the world, and chooses random outcomes. Commitments establish consistency, not independent VRF fairness. All credits and souvenirs have no cash value.

## Developer checks

From the repository root, with Node 24:

```sh
cd ctrl
npm ci --include=optional
npm test
npm run test:keyboard
npm run typecheck
npm run website:typecheck
npm run vercel:build
```

`npm test` covers the game, storage, refresh policy, HTTP behavior, and RPC recovery. `npm run test:keyboard` runs local Ganache contract integration scenarios; it does not spend testnet funds. Type checks and the build verify source compatibility. Historical live QA is separate from these automated checks.

For local preview, run `npm run demo:start` and open http://127.0.0.1:4174/#room. Full wallet behavior needs a configured contract, oracle, and Redis store. See [README.md](README.md) and [.env.example](.env.example). A fresh clone cannot recover hosted private commitments from Git, and an isolated store must not be used to serve the production contract.
