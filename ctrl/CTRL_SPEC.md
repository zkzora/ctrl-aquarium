# CTRL — first working release

For crypto communities and stream audiences: a shared 2D aquarium where taking
a short turn changes what everyone sees. Viewers inherit the previous player's
decisions. The hypothesis is that this produces a reason to watch, participate,
and return; willingness to pay is unproven. The strongest ordinary alternative
is a collaborative browser sandbox or stream-controlled game.

Core proof: three distinct sessions queue, obtain exclusive 60-second turns,
apply bounded world commands, observe changes from other sessions, and inspect
durable history/replays after refresh. The server, not the browser, enforces
ownership, expiry, command budgets, and room revisions.

Free sandbox and token-backed rooms are explicitly separate. Testnet CTRL pays
for 60 seconds of exclusive control and up to three accepted world changes.
Unactivated reservations can be refunded. Activation consumes the test token;
it pays for access, not a guarantee that every requested instruction is supported.
Onchain scheduling/payment does not make the renderer or command service
trustless. The server verifies chain tickets and signs no financial transactions.

Base Sepolia is the target testnet. Contracts refuse mainnet deployment. The
user deploys with an injected wallet using their own test ETH. No deployer key
is generated, extracted, or embedded in the application. A local EVM test must
verify faucet, reservation, activation, burn, refund, and timing behavior.

The default bounded command interpreter is deterministic and labeled as such.
Optional OpenAI interpretation needs an explicitly configured API key; server
validation and deterministic execution remain authoritative. Unsupported text
must fail clearly and must not spend an action. There is no arbitrary generated
JavaScript execution in this release. Optional model access is not claimed live
until configured and tested.

Substantial implementation checkpoint: user, mechanism, alternative, advantages,
minimal demo, and validation boundaries are now explicit. This build is
authorized by the user's request for a complete end-to-end app with assets.
