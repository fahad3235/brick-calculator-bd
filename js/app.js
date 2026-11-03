// Brick Calculator BD — DOM wiring. Pure math lives in js/logic.js.
'use strict';
(function () {
  const $ = (id) => document.getElementById(id);
  let lang = localStorage.getItem('brick-lang') || 'en';
  let walls = [{ lengthFt: 10, heightFt: 10, thicknessIn: 5 }];
  let lastEst = null, lastInput = null;

  function t(key) { return STR[lang][key]; }
  function num(id, def) {
    const v = parseFloat($(id).value);
    return Number.isFinite(v) ? v : def;
  }
  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    $('lang-toggle').textContent = lang === 'en' ? 'বাংলা' : 'English';
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    renderWalls(); renderSaved();
    if (lastEst) renderResults();
  }
  function wallRow(w, i) {
    const div = document.createElement('div');
    div.className = 'wall-row';
    div.innerHTML =
      '<label>' + t('length') + ' <input type="number" min="0" step="0.1" class="w-len" value="' + w.lengthFt + '"></label>' +
      '<label>' + t('height') + ' <input type="number" min="0" step="0.1" class="w-hgt" value="' + w.heightFt + '"></label>' +
      '<label>' + t('thickness') + ' <select class="w-thk">' +
      '<option value="5"' + (w.thicknessIn === 5 ? ' selected' : '') + '>' + t('in5') + '</option>' +
      '<option value="10"' + (w.thicknessIn === 10 ? ' selected' : '') + '>' + t('in10') + '</option></select></label>' +
      '<button type="button" class="w-del" ' + (walls.length <= 1 ? 'disabled' : '') + '>' + t('remove') + '</button>';
    div.querySelector('.w-len').addEventListener('input', (e) => { walls[i].lengthFt = parseFloat(e.target.value) || 0; });
    div.querySelector('.w-hgt').addEventListener('input', (e) => { walls[i].heightFt = parseFloat(e.target.value) || 0; });
    div.querySelector('.w-thk').addEventListener('change', (e) => { walls[i].thicknessIn = parseInt(e.target.value, 10); });
    div.querySelector('.w-del').addEventListener('click', () => { walls.splice(i, 1); renderWalls(); });
    return div;
  }
  function renderWalls() {
    const box = $('walls-list'); box.innerHTML = '';
    walls.forEach((w, i) => box.appendChild(wallRow(w, i)));
  }
  function readOpenings() {
    return { doors: Math.max(0, Math.floor(num('doors', 0))), doorArea: Math.max(0, num('door-area', 21)),
      windows: Math.max(0, Math.floor(num('windows', 0))), windowArea: Math.max(0, num('window-area', 15)) };
  }
  function calculate() {
    const err = $('calc-error'); err.hidden = true;
    for (const w of walls) {
      const e = validateWall(w);
      if (e) { err.textContent = t('errWall') + ' ' + e; err.hidden = false; return; }
    }
    const openings = readOpenings();
    const oe = validateOpenings(openings);
    if (oe) { err.textContent = t('errOpenings'); err.hidden = false; return; }
    const opts = { wastagePct: Math.max(0, num('wastage', 5)), sandRatio: parseInt($('ratio').value, 10) };
    lastEst = estimate(walls, openings, opts);
    lastInput = { walls: JSON.parse(JSON.stringify(walls)), openings, opts,
      prices: { brick: num('price-brick', 0), cementBag: num('price-cement', 0), sandCft: num('price-sand', 0) } };
    renderResults();
  }
  function renderResults() {
    const e = lastEst; if (!e) return;
    const card = $('result-card'); card.hidden = false;
    $('res-gross').textContent = fmt(e.grossAreaSqFt, lang, 2);
    $('res-openings').textContent = fmt(e.openingsAreaSqFt, lang, 2);
    $('res-net').textContent = fmt(e.netAreaSqFt, lang, 2);
    $('res-bricks').textContent = fmt(e.bricksWithWastage, lang, 0);
    $('res-bricks-raw').textContent = fmt(Math.round(e.bricksRaw * 100) / 100, lang, 2);
    $('res-mortar').textContent = fmt(e.dryMortarCft, lang, 2);
    $('res-cement').textContent = fmt(e.cementBags, lang, 0) + ' ' + t('bags') + ' (' + fmt(e.cementBagsExact, lang, 2) + ')';
    $('res-sand').textContent = fmt(e.sandCft, lang, 2);
    const p = lastInput.prices;
    const costBox = $('cost-box');
    if (p.brick > 0 || p.cementBag > 0 || p.sandCft > 0) {
      const c = estimateCost(e, p);
      costBox.innerHTML = '<div>' + t('bricks') + ': ৳' + fmt(c.bricks, lang, 2) + '</div>' +
        '<div>' + t('cement') + ': ৳' + fmt(c.cement, lang, 2) + '</div>' +
        '<div>' + t('sand') + ': ৳' + fmt(c.sand, lang, 2) + '</div>' +
        '<div><strong>' + t('total') + ': ৳' + fmt(c.total, lang, 2) + '</strong></div>';
    } else {
      costBox.textContent = t('costHint');
    }
  }
  function loadSaved() {
    try { return JSON.parse(localStorage.getItem('brick-saved') || '[]'); }
    catch { return []; }
  }
  function storeSaved(list) { localStorage.setItem('brick-saved', JSON.stringify(list)); }
  function renderSaved() {
    const list = loadSaved(); const ul = $('saved-list'); ul.innerHTML = '';
    $('saved-empty').hidden = list.length > 0;
    list.forEach((s, i) => {
      const li = document.createElement('li');
      li.textContent = fmt(s.est.bricksWithWastage, lang, 0) + ' ' + t('bricks') + ' — ' +
        fmt(s.est.netAreaSqFt, lang, 2) + ' sq ft — ' + new Date(s.when).toLocaleDateString();
      const b = document.createElement('button'); b.textContent = t('delete');
      b.addEventListener('click', () => { const l = loadSaved(); l.splice(i, 1); storeSaved(l); renderSaved(); });
      li.appendChild(b); ul.appendChild(li);
    });
  }
  function init() {
    renderWalls(); applyLang();
    $('btn-add-wall').addEventListener('click', () => { walls.push({ lengthFt: 10, heightFt: 10, thicknessIn: 5 }); renderWalls(); });
    $('btn-calc').addEventListener('click', calculate);
    $('lang-toggle').addEventListener('click', () => {
      lang = lang === 'en' ? 'bn' : 'en';
      localStorage.setItem('brick-lang', lang); applyLang();
    });
    $('btn-save').addEventListener('click', () => {
      const msg = $('save-msg'); msg.hidden = true;
      if (!lastEst) { msg.textContent = t('needCalc'); msg.hidden = false; return; }
      const l = loadSaved(); l.unshift({ when: new Date().toISOString(), input: lastInput, est: lastEst });
      storeSaved(l); renderSaved(); msg.textContent = t('savedMsg'); msg.hidden = false;
    });
    $('btn-export').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(loadSaved(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'brick-estimates.json'; a.click(); URL.revokeObjectURL(a.href);
    });
    $('file-import').addEventListener('change', (ev) => {
      const msg = $('save-msg'); msg.hidden = true;
      const f = ev.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          if (!Array.isArray(data) || !data.every((x) => x && x.est && Number.isFinite(x.est.bricksWithWastage))) throw new Error('bad');
          storeSaved(data); renderSaved(); msg.textContent = t('importedMsg');
        } catch { msg.textContent = t('importErr'); }
        msg.hidden = false;
      };
      r.readAsText(f);
    });
    $('btn-clear').addEventListener('click', () => {
      storeSaved([]); renderSaved();
      const msg = $('save-msg'); msg.textContent = t('clearedMsg'); msg.hidden = false;
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
