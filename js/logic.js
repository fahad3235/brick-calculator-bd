// Brick Calculator BD — pure calculation + i18n logic (no DOM, no network).
// Standard Bangladeshi brick: 9.5 in x 4.5 in x 2.75 in. Mortar joint: 0.4 in (~10 mm).
// 5-inch wall = half-brick (stretcher bond): one brick thickness deep.
// 10-inch wall = one-brick wall: two brick widths deep, so twice the bricks per sq ft.
'use strict';
const BRICK = { L: 9.5, W: 4.5, H: 2.75, JOINT: 0.4 };
const WALL_THICKNESS_IN = { 5: 5, 10: 10 };
const CEMENT_BAG_CFT = 1.25; // 50 kg bag ~= 1.25 cft
const DRY_FACTOR = 1.33;     // wet -> dry mortar volume factor

function bricksPerSqFt(thicknessIn) {
  const face = (BRICK.L + BRICK.JOINT) * (BRICK.H + BRICK.JOINT); // sq in per brick incl. joint
  const perSqFt = 144 / face; // 144 sq in = 1 sq ft
  return thicknessIn === 10 ? perSqFt * 2 : perSqFt;
}
function wallAreaSqFt(wall) {
  return wall.lengthFt * wall.heightFt;
}
function openingsAreaSqFt(openings) {
  return openings.doors * openings.doorArea + openings.windows * openings.windowArea;
}
function netAreaSqFt(walls, openings) {
  const gross = walls.reduce((s, w) => s + wallAreaSqFt(w), 0);
  return Math.max(0, gross - openingsAreaSqFt(openings));
}
// walls: [{lengthFt, heightFt, thicknessIn}], openings: {doors, doorArea, windows, windowArea}
// opts: {wastagePct, sandRatio} where sandRatio = parts of sand per 1 part cement.
function estimate(walls, openings, opts) {
  const gross = walls.reduce((s, w) => s + wallAreaSqFt(w), 0);
  const open = openingsAreaSqFt(openings);
  const net = Math.max(0, gross - open);
  let bricksRaw = 0;
  let wallVolumeCft = 0;
  for (const w of walls) {
    // Openings are deducted from total area; per-wall brick counts use the wall's
    // share of net area so the total stays exact. Simpler and exact: compute total
    // bricks from net area weighted by thickness mix below.
    void w;
  }
  // Exact approach: bricks per wall on gross area, minus openings' bricks at the
  // average per-sq-ft rate of the walls (area-weighted). When all walls share one
  // thickness this is exactly net * rate.
  const totalGross = gross;
  let bricksGross = 0;
  let volGross = 0;
  for (const w of walls) {
    bricksGross += wallAreaSqFt(w) * bricksPerSqFt(w.thicknessIn);
    volGross += wallAreaSqFt(w) * (w.thicknessIn / 12);
  }
  const avgRate = totalGross > 0 ? bricksGross / totalGross : 0;
  bricksRaw = Math.max(0, bricksGross - open * avgRate);
  const avgThickFt = totalGross > 0 ? volGross / totalGross : 0;
  wallVolumeCft = net * avgThickFt;
  const brickVolCft = bricksRaw * (BRICK.L * BRICK.W * BRICK.H / 1728);
  const wetMortarCft = Math.max(0, wallVolumeCft - brickVolCft);
  const dryMortarCft = wetMortarCft * DRY_FACTOR;
  const parts = 1 + opts.sandRatio;
  const cementCft = dryMortarCft / parts;
  const sandCft = dryMortarCft * opts.sandRatio / parts;
  const cementBagsExact = cementCft / CEMENT_BAG_CFT;
  const bricksWithWastage = Math.ceil(bricksRaw * (1 + opts.wastagePct / 100));
  return {
    grossAreaSqFt: gross, openingsAreaSqFt: open, netAreaSqFt: net,
    bricksRaw, bricksWithWastage,
    wallVolumeCft, brickVolumeCft: brickVolCft,
    wetMortarCft, dryMortarCft, cementCft, sandCft,
    cementBagsExact, cementBags: Math.ceil(cementBagsExact),
  };
}
function estimateCost(est, prices) {
  const bricks = est.bricksWithWastage * (prices.brick || 0);
  const cement = est.cementBags * (prices.cementBag || 0);
  const sand = est.sandCft * (prices.sandCft || 0);
  return { bricks, cement, sand, total: bricks + cement + sand };
}
function validateWall(w) {
  if (!(w.lengthFt > 0) || !(w.heightFt > 0)) return 'length and height must be positive';
  if (w.lengthFt > 1000 || w.heightFt > 100) return 'wall size out of range';
  if (w.thicknessIn !== 5 && w.thicknessIn !== 10) return 'thickness must be 5 or 10 inches';
  return null;
}
function validateOpenings(o) {
  if (o.doors < 0 || o.windows < 0 || o.doorArea < 0 || o.windowArea < 0) return 'openings cannot be negative';
  if (o.doors > 100 || o.windows > 100) return 'too many openings';
  return null;
}
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBnDigits(str) {
  return String(str).replace(/[0-9]/g, (d) => BN_DIGITS[+d]);
}
function fmt(n, lang, decimals) {
  const s = Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
  return lang === 'bn' ? toBnDigits(s) : s;
}
const STR = {
  en: {
    title: 'Brick Calculator BD', subtitle: 'Bricks, mortar, cement & cost for your walls',
    walls: 'Walls', length: 'Length (ft)', height: 'Height (ft)', thickness: 'Wall thickness',
    in5: '5 inch (half-brick)', in10: '10 inch (one-brick)', addWall: 'Add wall', remove: 'Remove',
    openings: 'Openings deducted', doors: 'Doors', windows: 'Windows',
    doorArea: 'Area per door (sq ft)', windowArea: 'Area per window (sq ft)',
    options: 'Options', wastage: 'Wastage (%)', ratio: 'Cement : sand ratio',
    prices: 'Prices (optional — leave blank to skip cost)', brickPrice: 'Brick price (৳ each)',
    cementPrice: 'Cement price (৳ per bag)', sandPrice: 'Sand price (৳ per cft)',
    calculate: 'Calculate', results: 'Estimate', grossArea: 'Gross wall area',
    openingsArea: 'Openings area', netArea: 'Net wall area', bricks: 'Bricks needed (with wastage)',
    bricksRaw: 'Bricks before wastage', mortar: 'Mortar (dry volume)', cement: 'Cement',
    bags: 'bags', sand: 'Sand', cost: 'Estimated cost', costHint: 'Enter prices above to see the cost.',
    total: 'Total', saved: 'Saved estimates', save: 'Save this estimate', noSaved: 'No saved estimates yet.',
    delete: 'Delete', export: 'Export JSON', import: 'Import JSON', clearAll: 'Clear all',
    errWall: 'Fix the wall inputs first.', errOpenings: 'Fix the openings inputs first.',
    savedMsg: 'Estimate saved.', importedMsg: 'Import successful.', importErr: 'Import failed: file is not a valid saved estimate.',
    clearedMsg: 'All saved estimates cleared.', needCalc: 'Calculate an estimate before saving.',
    footer: 'Educational estimator only. Brick size, joint and wastage assumptions are stated in the README — verify with your mason/contractor before ordering. Prices are whatever you enter; no live market prices are used.',
  },
  bn: {
    title: 'ইট ক্যালকুলেটর বিডি', subtitle: 'আপনার দেয়ালের জন্য ইট, মসলা, সিমেন্ট ও খরচ',
    walls: 'দেয়াল', length: 'দৈর্ঘ্য (ফুট)', height: 'উচ্চতা (ফুট)', thickness: 'দেয়ালের পুরুত্ব',
    in5: '৫ ইঞ্চি (হাফ-ব্রিক)', in10: '১০ ইঞ্চি (এক-ব্রিক)', addWall: 'দেয়াল যোগ করুন', remove: 'মুছুন',
    openings: 'বাদ দেওয়া খোলা জায়গা', doors: 'দরজা', windows: 'জানালা',
    doorArea: 'প্রতি দরজার ক্ষেত্রফল (বর্গফুট)', windowArea: 'প্রতি জানালার ক্ষেত্রফল (বর্গফুট)',
    options: 'অপশন', wastage: 'অপচয় (%)', ratio: 'সিমেন্ট : বালি অনুপাত',
    prices: 'দাম (ঐচ্ছিক — খরচ দেখতে চাইলে লিখুন)', brickPrice: 'ইটের দাম (৳ প্রতি পিস)',
    cementPrice: 'সিমেন্টের দাম (৳ প্রতি ব্যাগ)', sandPrice: 'বালির দাম (৳ প্রতি সিএফটি)',
    calculate: 'হিসাব করুন', results: 'আনুমানিক হিসাব', grossArea: 'মোট দেয়াল ক্ষেত্রফল',
    openingsArea: 'খোলা জায়গার ক্ষেত্রফল', netArea: 'নিট দেয়াল ক্ষেত্রফল', bricks: 'প্রয়োজনীয় ইট (অপচয়সহ)',
    bricksRaw: 'অপচয়ের আগের ইট', mortar: 'মসলা (শুকনো আয়তন)', cement: 'সিমেন্ট',
    bags: 'ব্যাগ', sand: 'বালি', cost: 'আনুমানিক খরচ', costHint: 'খরচ দেখতে উপরে দাম লিখুন।',
    total: 'মোট', saved: 'সংরক্ষিত হিসাব', save: 'এই হিসাব সংরক্ষণ করুন', noSaved: 'এখনো কোনো হিসাব সংরক্ষিত হয়নি।',
    delete: 'মুছুন', export: 'JSON এক্সপোর্ট', import: 'JSON ইমপোর্ট', clearAll: 'সব মুছুন',
    errWall: 'প্রথমে দেয়ালের তথ্য ঠিক করুন।', errOpenings: 'প্রথমে খোলা জায়গার তথ্য ঠিক করুন।',
    savedMsg: 'হিসাব সংরক্ষিত হয়েছে।', importedMsg: 'ইমপোর্ট সফল হয়েছে।', importErr: 'ইমপোর্ট ব্যর্থ: ফাইলটি বৈধ সংরক্ষিত হিসাব নয়।',
    clearedMsg: 'সব সংরক্ষিত হিসাব মোছা হয়েছে।', needCalc: 'সংরক্ষণের আগে হিসাব করুন।',
    footer: 'শুধুমাত্র শিক্ষামূলক আনুমানিক হিসাব। ইটের মাপ, জয়েন্ট ও অপচয়ের ধারণা README-তে দেওয়া আছে — অর্ডারের আগে মিস্ত্রি/ঠিকাদারের সঙ্গে যাচাই করুন। দাম আপনিই লিখবেন; কোনো লাইভ বাজারদর ব্যবহার করা হয় না।',
  },
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BRICK, bricksPerSqFt, wallAreaSqFt, openingsAreaSqFt, netAreaSqFt,
    estimate, estimateCost, validateWall, validateOpenings, toBnDigits, fmt, STR };
}
