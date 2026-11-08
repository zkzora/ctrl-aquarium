> Historical document: revision 3 is implemented. CURRENT_STATUS.md defines current behavior; this older document is not the implementation authority.

# CTRL / proposed pack-opening economy

2026-11-07. Design proposal only; not applied to the current app. Preserve the
owner's approved credit-only demo boundary. No real funds or assets are involved.

## Product decision

The owner wants paid randomized discoveries: some results below purchase cost,
some above, with a sustainable provider margin. This shifts CTRL toward a shared
pack-opening aquarium. Its strongest alternative is an ordinary pack-opening
site. CTRL must differentiate through the living shared habitat, growth, visible
ownership/provenance and a dramatic opening presentation; a random payout alone
does not establish an advantage or demand.

Players need a trustworthy stated price, actual deliverable, odds and claim
ownership. The concrete failure to prevent is paying for a fish that another
player destroys, or receiving a prize with an invented valuation/no backing.

Three mechanisms considered:

1. Free reward fish with daily limits: useful for a demo, but payout comes from
   subsidy and identity controls do not create provider revenue.
2. Paid random treasury draws: statistically positive provider margin is possible,
   but variance, liquidity and inventory/value risks remain.
3. Paid sealed inventory represented by fish: closest to the referenced collectible
   experience. Prefer this for a credit-only prototype with explicit backing rules.

## Research evidence, not inferred provider profitability

- Solflare describes USDC-priced packs containing real graded cards held by
  Collector Crypt; odds precede purchase and users can hold, buy back or redeem.
  https://www.solflare.com/packs/
- Pump's Packs Terms describe a separate Pack Provider, a finite allocated pool,
  changing odds disclosed at purchase, and one collectible per pack. They state
  most displayed values are below pack price and displayed valuation is not a
  guaranteed executable sale price. They do not establish the provider's profit.
  https://pump.fun/docs/packs-terms
- Both referenced experiences specify age/region eligibility. Their existence is
  not evidence that a copied paid-chance product is lawful in every location.

## Illustrative credit-only math

Price: 100 non-purchasable, non-redeemable demo credits per sealed fish/pack.
The following exact credit outcomes are an example, not final chosen tokenomics:

| Probability | Credits revealed | Outcome relative to purchase |
| --- | ---: | --- |
| 60% | 40 | -60 |
| 25% | 100 | 0 |
| 10% | 200 | +100 |
| 5% | 320 | +220 |

Expected payout = .60*40 + .25*100 + .10*200 + .05*320 = 85 credits.
Expected provider gross contribution = 100 - 85 = 15 credits before all costs.
The player has a 60% loss probability, 25% break-even and 15% win probability
for one opening in this example. Repeating openings does not guarantee a win.
Do not describe a result below cost as a financial win because its artwork is rare.

These fixed odds describe independent draws with replacement. A finite inventory
without replacement has changing remaining odds; do not use this static table to
describe such a pool without recomputing/disclosing the actual purchase odds.

Positive expected contribution is not guaranteed profit per opening, batch or
period. Actual contribution subtracts deliverable acquisition/redemption costs,
provider/platform fees, RNG/gas, operating expense and losses. Liquidity must cover
possible outcomes even when high prizes arrive early. Do not rely on new players
to pay an already-promised prize. Collectible displayed value, inventory cost,
cash-out offer and executable sale proceeds are different measurements.

## Aquarium interpretation

- Buying an allocated sealed fish is buying one pack. Ownership attaches to the
  buyer; other visitors can see it but cannot take or destroy that entitlement.
- Growth/maturity is presentation/game progression, not additional generated
  yield. Repeated feeding, changing clocks and resets do not create extra payouts.
- Exploding/opening reveals that owned entitlement once. Reveal allocation and
  request identity must be committed before a result can be observed; no rerolls.
- A player can also add free decorative creatures, explicitly without a monetary
  entitlement. Do not silently mix decorative and purchased/funded fish.
- Black hole is optional batch opening for eligible owned packs. It does not
  supply another independent bonus draw or multiply the same reward.
- If a black hole visually resets the entire shared aquarium, other players'
  unopened owned entitlements remain safe in their inventory/hatchery. There is
  no loss of their purchase and no transfer to the caller.
- Gradual post-collapse arrivals replenish scenery. Additional funded inventory
  appears only when actually allocated, not automatically through spawn effects.
- Daily identity limits/cooldowns manage exposure and abuse; they do not create
  the provider margin. Daily caps also apply across both habitats and batch opens.

Any fee for optional batch-opening presentation must be disclosed separately from
the pack price. Individual reveal access to an already-purchased entitlement must
not become dependent on buying a black hole or another arbitrary paid action.

## Token and provider boundaries

A native token's fluctuating market price cannot be the evidence of prize value
or a guaranteed buyback. If real assets are ever considered, inventory ownership,
custody, executable valuation, payout denomination and reserve requirements need
separate review. Current NVDA/AAPL/MSFT cards remain fictional demo souvenirs.
Do not introduce real shares, securities, cash-out or mainnet launch via this file.

Odds, losing cases, fees, reserve limits and any changing pool composition must
be visible before commitment. Do not personalize outcomes to wallet size or past
losses, use fake winners, or promise recovery after enough openings.

## Validation before adopting

Test whether participants understand they own a sealed fish, distinguish a
decorative creature from an allocated pack, interpret a below-cost result, and
can return to an unopened purchase after someone else's reset. Compare the shared
aquarium experience with a simple pack-opening screen. Simulate reserve stress
and payout variance before choosing parameters. There is no evidence yet that
these example prices/odds are sustainable, enjoyable, or suitable for launch.
