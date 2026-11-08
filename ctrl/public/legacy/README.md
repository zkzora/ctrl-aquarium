# CTRL built frontend — revision 4

Public website: https://ctrl-aquarium.vercel.app
Mechanism docs: https://ctrl-aquarium.vercel.app/#docs

This folder needs /api/testnet and /api/demo; a generic static server or file:// cannot provide game state or transactions. Use the complete source archive and npm run demo:start (Node 24 tested), or the hosted website.

Connect an injected EVM wallet, switch to Base Sepolia, sign in and claim 1,500 valueless tCTRL per 24h. Public packs cost 100, Whale packs 500, with a 20-second hatch. Test ETH pays gas. No real-money asset, tokenized stock, transfer or redemption exists.

Production contract mirrors must share the same private quote database and oracle key; never run one deployed contract against two independent state stores. See TESTNET_SPEC.md in the source project. The ?mode=sandbox#room option has separate off-chain credits and no token conversion.
