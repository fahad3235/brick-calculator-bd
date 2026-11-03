// Node unit tests for brick-calculator-bd logic. Run: node tests/test.js
'use strict';
const assert = require('node:assert');
const L = require('../js/logic.js');
let n = 0;
function check(name, cond) { n++; assert.ok(cond, name); console.log('PASS — ' + name); }
function close(a, b, tol) { return Math.abs(a - b) <= tol; }

// Bricks per sq ft from first principles: 144 / ((9.5+0.4) x (2.75+0.4))
check('5in rate = 144/31.185', close(L.bricksPerSqFt(5), 144 / 31.185, 1e-9));
check('10in rate is double 5in', close(L.bricksPerSqFt(10), 2 * L.bricksPerSqFt(5), 1e-9));
check('5in rate ~4.617', close(L.bricksPerSqFt(5), 4.6173, 0.001));

// Canonical case: one 10x10 ft wall, 5 in, no openings, 5% wastage, 1:4.
const e = L.estimate([{ lengthFt: 10, heightFt: 10, thicknessIn: 5 }],
  { doors: 0, doorArea: 21, windows: 0, windowArea: 15 }, { wastagePct: 5, sandRatio: 4 });
check('gross 100', e.grossAreaSqFt === 100);
check('net 100', e.netAreaSqFt === 100);
check('raw bricks ~461.76', close(e.bricksRaw, 461.760, 0.01));
check('bricks with 5% wastage = 485', e.bricksWithWastage === 485);
check('wall volume 41.667 cft', close(e.wallVolumeCft, 100 * 5 / 12, 0.001));
check('brick volume ~31.41 cft', close(e.brickVolumeCft, 31.41, 0.05));
check('dry mortar ~13.6 cft', close(e.dryMortarCft, 13.64, 0.1));
check('cement bags exact ~2.18', close(e.cementBagsExact, 2.18, 0.05));
check('cement bags rounded up = 3', e.cementBags === 3);
check('sand ~10.91 cft', close(e.sandCft, 10.91, 0.1));

// Openings: one 21 sq ft door off the same wall -> net 79, raw 364.79, x1.05 = 383.03 -> 384.
const e2 = L.estimate([{ lengthFt: 10, heightFt: 10, thicknessIn: 5 }],
  { doors: 1, doorArea: 21, windows: 0, windowArea: 15 }, { wastagePct: 5, sandRatio: 4 });
check('net 79 after door', e2.netAreaSqFt === 79);
check('bricks with door = 384', e2.bricksWithWastage === 384);

// 10-inch wall doubles bricks on same area.
const e3 = L.estimate([{ lengthFt: 10, heightFt: 10, thicknessIn: 10 }],
  { doors: 0, doorArea: 21, windows: 0, windowArea: 15 }, { wastagePct: 0, sandRatio: 4 });
check('10in raw ~923.52', close(e3.bricksRaw, 923.521, 0.01));
check('10in 0% wastage = 924 (ceil)', e3.bricksWithWastage === 924);

// Openings larger than walls clamp net to 0.
const e4 = L.estimate([{ lengthFt: 5, heightFt: 5, thicknessIn: 5 }],
  { doors: 2, doorArea: 21, windows: 0, windowArea: 15 }, { wastagePct: 5, sandRatio: 4 });
check('over-deduction clamps to 0', e4.netAreaSqFt === 0 && e4.bricksWithWastage === 0);

// Ratio 1:6 gives less cement than 1:4 on the same wall.
const e6 = L.estimate([{ lengthFt: 10, heightFt: 10, thicknessIn: 5 }],
  { doors: 0, doorArea: 21, windows: 0, windowArea: 15 }, { wastagePct: 5, sandRatio: 6 });
check('1:6 uses less cement than 1:4', e6.cementCft < e.cementCft);
check('1:6 uses more sand than 1:4', e6.sandCft > e.sandCft);

// Cost: 485 bricks @12 + 3 bags @550 + sand @60.
const c = L.estimateCost(e, { brick: 12, cementBag: 550, sandCft: 60 });
check('cost bricks 5820', c.bricks === 5820);
check('cost cement 1650', c.cement === 1650);
check('cost total ~8124.6', close(c.total, 5820 + 1650 + e.sandCft * 60, 0.01));
const c0 = L.estimateCost(e, { brick: 0, cementBag: 0, sandCft: 0 });
check('zero prices -> zero cost', c0.total === 0);

// Validation.
check('valid wall passes', L.validateWall({ lengthFt: 10, heightFt: 8, thicknessIn: 5 }) === null);
check('zero length rejected', L.validateWall({ lengthFt: 0, heightFt: 8, thicknessIn: 5 }) !== null);
check('bad thickness rejected', L.validateWall({ lengthFt: 10, heightFt: 8, thicknessIn: 3 }) !== null);
check('negative openings rejected', L.validateOpenings({ doors: -1, doorArea: 21, windows: 0, windowArea: 15 }) !== null);
check('valid openings pass', L.validateOpenings({ doors: 1, doorArea: 21, windows: 2, windowArea: 15 }) === null);

// Bengali digits + formatting.
check('digits 485 -> ৪৮৫', L.toBnDigits('485') === '৪৮৫');
check('fmt en 1234.5 -> 1,234.50', L.fmt(1234.5, 'en', 2) === '1,234.50');
check('fmt bn uses Bengali digits', L.fmt(485, 'bn', 0) === '৪৮৫');
check('i18n has both languages', L.STR.en.title === 'Brick Calculator BD' && L.STR.bn.title.length > 0);
console.log(`UNIT: ${n} passed, 0 failed`);
