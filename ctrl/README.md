# CTRL — one world, too many hands

A shared aquarium controlled through paid keyboard turns. The website runs on Vercel, with test credits on Base Sepolia and durable state in Upstash Redis.

[Live website](https://ctrl-aquarium.vercel.app/#room) · [Current mechanism](KEYBOARD_SPEC.md) · [Status](CURRENT_STATUS.md) · [Repository overview](../README.md)

## Try it

Connect an EVM wallet, switch to Base Sepolia, and sign in. Claim 1,500 test credits. Public turns cost 10 credits; Whale turns cost 50. One paid turn executes one command. Add fish or treasure to contribute, then use reward commands such as exploding fish or opening treasure. Random outcomes include zero. Black holes clear the aquarium and start gradual regrowth under the round rules. There is no current fish purchase or hatch step.

Every transaction requires Base Sepolia test ETH for gas. kCTRL cannot be transferred, traded, or redeemed. Stock-inspired souvenirs are fictional.

## Local preview

Node 24 is tested.

```sh
npm ci --include=optional
npm run demo:start
```

Open http://127.0.0.1:4174/#room. See `.env.example` for configuration names. A fresh clone contains no live credentials or user state. Use the hosted site for the configured wallet experience, or configure an isolated contract, oracle, and Redis store.

A mirror serving the production contract must share its durable Redis data and oracle configuration, including outstanding private commitments. Do not use a separate empty store with the same contract.

## Checks

```sh
npm test
npm run test:keyboard
npm run typecheck
npm run website:typecheck
npm run vercel:build
```

Latest checks passed: 45 Node tests, 17 keyboard-contract EVM scenarios, both TypeScript checks, and the production build. Confirmed testnet evidence is in `public/docs/keyboard-live-qa.json`.

## Deploy

Set Vercel Root Directory to `ctrl`. The local `vercel.json` builds the frontend and native ESM API entries. Generated `api/*.mjs` files are recreated during the build. Configure runtime secrets privately in Vercel.

Current contract: `0x115dcc1c6d311d65c0c1df808da3bd1467bae7e7` on Base Sepolia (84532).

`KEYBOARD_SPEC.md` is authoritative. Pack/hatch-era specs and `/legacy/` remain for historical reference and legacy recovery. The hosted backend has no runtime Blob calls. See [storage recovery](STORAGE_INCIDENT.md) and [RPC recovery](RPC_INCIDENT.md).
