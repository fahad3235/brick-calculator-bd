# Test results — brick-calculator-bd (2026-11-03, 11:00 slot)

## Unit tests: 33/33 passed (node tests/test.js, 0 repairs to app logic)

- Bricks per sq ft derived from first principles: 144/31.185 ≈ 4.6176 (5 in),
  exactly double for 10 in.
- Canonical case — one 10×10 ft, 5-inch wall, no openings, 5% wastage, 1:4:
  raw 461.76 bricks → 485 with wastage; wall volume 41.667 cft; dry mortar
  ~13.64 cft; cement ~2.18 bags exact → 3 bags; sand ~10.91 cft.
- One 21 sq ft door → net 79 sq ft → 384 bricks (raw 364.79 × 1.05 = 383.03 → 384).
- 10-inch wall on the same area: raw 923.52 → 924 at 0% wastage.
- Over-deduction (openings > wall area) clamps net area and bricks to 0.
- 1:6 mix uses less cement and more sand than 1:4, as expected.
- Cost: 485 × ৳12 = ৳5,820; 3 × ৳550 = ৳1,650; sand at ৳60/cft; zero prices → zero cost.
- Validation: zero length, bad thickness, and negative openings rejected.
- Bengali digits: 485 → ৪৮৫; fmt() renders 1,234.50 / ৪৮৫ correctly.

Note: two test expectations were corrected during the run (raw bricks 461.73 →
461.76; door case 383 → 384) after recomputing by hand — both were test-side
arithmetic slips, not app bugs. The app's formula was unchanged.

## Smoke tests: 17/17 passed (headless Chrome, raw CDP, file://, 0 repairs)

Default calculation (485 bricks, net 100.00, 3 cement bags), cost-hint without
prices, cost rendering with prices (৳5,820.00 / ৳1,650.00), save + reload
persistence, zero-length validation error, বাংলা toggle (title + Bengali
digits) with reload persistence, second wall added (2 rows → 970 bricks),
390 px mobile with no horizontal overflow, zero console/page errors.
