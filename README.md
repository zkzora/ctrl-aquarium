# CTRL — One computer. Everyone wants the keyboard.

A shared aquarium where each paid keyboard turn executes one command and the next player inherits the result. Built for Vibeathon 02 with original visual assets, a Base Sepolia credit contract, and a narrated product demo.

[Try CTRL](https://ctrl-aquarium.vercel.app/#room) · [Mechanism docs](https://ctrl-aquarium.vercel.app/#docs)

## Repository

- [`ctrl/`](ctrl/): website, server, Solidity contracts, tests, assets, and implementation specs.
- [`ctrl-demo-video/`](ctrl-demo-video/): editable Remotion video, ElevenLabs narration, captions, and final 1080p MP4.
- [Current mechanism](ctrl/KEYBOARD_SPEC.md) and [verified release status](ctrl/CURRENT_STATUS.md).

## Run the website

Node 24 is tested.

```sh
cd ctrl
npm ci --include=optional
npm run demo:start
```

Open http://127.0.0.1:4174/#room. A fresh clone does not contain live credentials or user state. For the full wallet experience use the hosted site, or configure an isolated testnet contract, oracle, and Redis store. See [environment setup](ctrl/.env.example).

## Current rules

Connect an EVM wallet, switch to Base Sepolia, sign in, and claim 1,500 test credits. Public turns cost 10 credits; Whale turns cost 50. One turn buys one command, including adding objects, exploding fish, opening treasure, or invoking a black hole. There is no current fish-purchase or hatch flow.

At settlement, 80% of the turn fee funds the reward pool and 20% goes to the developer allocation. Random rewards can be zero. Reward commands require a prior contribution in that habitat and round. Global per-wallet rolling 24-hour limits apply across both aquariums. Each new round receives up to 300 credits from a finite seeded reserve; see the mechanism spec for exact conditions.

Base Sepolia contract: `0x115dcc1c6d311d65c0c1df808da3bd1467bae7e7`.

Credits and stock-inspired souvenirs have no cash value. Outcome selection is server-controlled; commitments establish consistency, not independently verifiable random selection. This is a testnet prototype, without an independent security audit.

## Validation

```sh
cd ctrl
npm test
npm run test:keyboard
npm run typecheck
npm run website:typecheck
npm run vercel:build
```

Latest implementation validation: 45 Node tests and 17 local EVM scenarios, both TypeScript checks, and the production build passed. [Confirmed live QA](ctrl/public/docs/keyboard-live-qa.json) records one observed payout, not a promised return.

## Video

[Final MP4](ctrl-demo-video/out/CTRL-demo-final.mp4) · [English subtitles](ctrl-demo-video/out/CTRL-demo-en.srt) · [Editing instructions](ctrl-demo-video/README.md)

2:20, 1920×1080, English narration by Ryan through the user-authorized ElevenLabs MCP connection. Narration and timing files are included; rendering needs no ElevenLabs key. The video distinguishes actual product UI and confirmed transaction evidence from mechanism visualizations.

## Deployment

For Vercel, set the project Root Directory to `ctrl`; its `vercel.json` supplies the build settings. Store secrets in the deployment environment. Live configuration, wallet keys, private outcome records, Redis data, and local service credentials are excluded from Git.
