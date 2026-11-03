# Brick Calculator BD

Offline, bilingual (English / বাংলা) brick-and-mortar estimator for Bangladesh:
how many bricks, how much cement and sand, and what it costs — for the walls
you actually plan to build.

## Problem

A mason or homeowner planning a brick wall in Bangladesh usually estimates
bricks with a rough rule of thumb and guesses mortar by feel. This tool replaces
the guesswork with a stated, checkable formula: standard Bangladeshi brick size,
an explicit mortar-joint thickness, and an explicit wastage allowance — so the
number can be re-derived, not just trusted.

## Features

1. **Multi-wall builder** — add any number of walls, each with length (ft),
   height (ft), and thickness (5-inch half-brick or 10-inch one-brick).
2. **Openings deduction** — doors and windows deducted from the wall area,
   with editable area per opening (defaults: 21 sq ft per door, 15 sq ft per window).
3. **Brick estimate** — bricks per sq ft from the brick-plus-joint face area,
   with an adjustable wastage percentage (default 5%), rounded up to whole bricks.
4. **Mortar estimate** — cement bags (50 kg bags, 1.25 cft each) and sand (cft)
   from wall volume minus brick volume, with selectable 1:4 / 1:5 / 1:6
   cement:sand ratios and a 1.33 wet-to-dry mortar factor.
5. **Cost estimate** — enter your own brick, cement-bag, and sand prices to get
   a line-item cost. No prices are shipped and no live market prices are used.
6. **Saved estimates** — save results in the browser, export/import them as JSON
   (strict validation; a malformed file is rejected with data intact).
7. **Bilingual UI** — English / বাংলা toggle, persisted, with Bengali digits in
   বাংলা mode. Fully offline; zero network requests.

## The math (stated, so it can be checked)

- Standard Bangladeshi brick: **9.5 in × 4.5 in × 2.75 in**; mortar joint **0.4 in**
  (~10 mm).
- Bricks per sq ft, 5-inch wall = 144 / ((9.5 + 0.4) × (2.75 + 0.4))
  = 144 / 31.185 ≈ **4.6176**. A 10-inch wall is exactly double: ≈ **9.2352**.
- Net area = sum of wall areas − openings area (clamped at 0).
- Bricks = ceil(net-area bricks × (1 + wastage %)).
- Mortar: wall volume (net area × thickness) − brick volume (raw bricks × brick
  volume) = wet mortar; dry mortar = wet × 1.33. Cement share = 1 / (1 + sand
  parts); sand share = sand parts / (1 + sand parts). Bags = ceil(cement cft / 1.25).
- Mixed-thickness note: when walls of both thicknesses are combined, openings are
  deducted at the area-weighted average bricks-per-sq-ft rate, so the total stays
  exact; when all walls share one thickness this is exactly net area × rate.

Worked example (verified by the test suite): one 10 ft × 10 ft, 5-inch wall, no
openings, 5% wastage, 1:4 mix → 485 bricks, 3 cement bags, ~10.91 cft sand.

## Stack

Vanilla HTML, CSS, and JavaScript. No framework, no build step, no dependencies,
no network calls. Pure calculation logic lives in `js/logic.js` so it can be
unit-tested in Node without a browser.

## Prerequisites

Any modern browser. For tests: Node.js 18+ and a headless Chromium (the smoke
test uses `/opt/meta-chromium/chrome` on the author's machine; adjust the path
in `tests/smoke.mjs` if yours differs).

## Install & run

```sh
# Just open it — it is a static site:
open index.html
# or serve it locally:
python3 -m http.server 8000
# then visit http://localhost:8000/
```

## Dev commands

```sh
node tests/test.js    # unit tests (logic only)
node tests/smoke.mjs  # headless-Chrome UI smoke tests
```

## Testing

- `tests/test.js`: 33 assertions — bricks-per-sq-ft derivation, the canonical
  10×10 wall (485 bricks / 3 bags / ~10.91 cft sand), openings deduction,
  10-inch doubling, over-deduction clamping, mix-ratio ordering, cost math,
  validation, and Bengali-digit formatting.
- `tests/smoke.mjs`: 17 headless-Chrome checks — default calculation, cost
  rendering, save + reload persistence, validation error, বাংলা toggle +
  persistence, adding a second wall (970 bricks), 390 px mobile no-overflow,
  zero console/page errors.

## Deployment

Static site — any static host works. On GitHub Pages: enable Pages for the
`main` branch, root folder.

## Limitations

- This is an **educational estimator, not a structural or quantity-surveying
  tool**. Brick size varies by kiln; actual joint thickness, plaster, pillars,
  lintels, and foundation brickwork are not modelled. Verify quantities with
  your mason or contractor before ordering.
- The 21 / 15 sq ft opening defaults are typical sizes, not measurements of
  your doors and windows — edit them.
- Prices are whatever you type in. Nothing here is a live market price, and no
  price data is shipped with the app.
- Saved estimates live in the browser's localStorage on one device only.

## Status

Complete MVP. All tests pass (33/33 unit, 17/17 smoke, 0 console errors).
