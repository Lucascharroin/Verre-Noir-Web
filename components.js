// =====================================================================
//  Composants métier : sélecteurs, formulaire de réponse, révélation…
// =====================================================================
import { esc, fmt, pct, shuffle, sample, uniq, sheet, haptic, countUp, confetti, confirmBox, $, $$ } from './ui.js';
import { APPELLATIONS, GRAPES, REGIONS, REGIONS_FR, COLORS, searchApps, searchGrapes, searchRegions, findApp, findGrape, canonGrape, norm } from './data.js';
import { CRITS, QCM_KEYS, isQcm, activeCrits, wineMax, critMax } from './scoring.js';

// ---------------------------------------------------------------------
//  Sélecteur en feuille du bas (recherche + liste)
// ---------------------------------------------------------------------
export function openPicker({ title, kind, multi = false, selected = [], exclude = [], allowCustom = false, onDone }) {
  const sel = new Set(selected);
  const ex = new Set(exclude.map(norm));
  const search = q => {
    if (kind === 'grape') return searchGrapes(q, 80).map(g => ({ v: g.n, sub: (g.c === 'r' ? 'Rouge' : 'Blanc') + (g.alias.length ? ' · ' + g.alias.slice(0, 2).join(', ') : ''), dot: g.c }));
    if (kind === 'app') return searchApps(q, 80).map(a => ({ v: a.n, sub: a.r }));
    if (kind === 'region') return searchRegions(q).map(r => ({ v: r, sub: REGIONS_FR.includes(r) ? 'France' : 'Étranger' }));
    return [];
  };
  sheet(title, (body, close) => {
    body.innerHTML = `<div class="search"><input type="search" placeholder="Rechercher…" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
      <div class="pick-list"></div>${multi ? `<div class="sheet-foot"><button class="btn primary block" data-done>Valider</button></div>` : ''}`;
    const input = $('input', body), listEl = $('.pick-list', body);
    const render = () => {
      const q = input.value.trim();
      let items = search(q).filter(i => !ex.has(norm(i.v)));
      let html = items.map(i => `<button class="pick ${sel.has(i.v) ? 'on' : ''}" data-v="${esc(i.v)}">
          ${i.dot ? `<i class="gdot ${i.dot}"></i>` : ''}<span class="pick-t">${esc(i.v)}<small>${esc(i.sub || '')}</small></span><b class="chk">✓</b></button>`).join('');
      if (allowCustom && q && !items.some(i => norm(i.v) === norm(q))) html += `<button class="pick custom" data-v="${esc(q)}"><span>${items.length ? 'Autre : ' : ''}utiliser « ${esc(q)} »</span></button>`;
      listEl.innerHTML = html || `<p class="muted center pad">Aucun résultat</p>`;
      if (multi) $('[data-done]', body).textContent = sel.size ? `Valider (${sel.size})` : 'Valider';
    };
    input.oninput = render;
    listEl.onclick = e => {
      const b = e.target.closest('.pick'); if (!b) return;
      haptic();
      const v = b.dataset.v;
      if (multi) { sel.has(v) ? sel.delete(v) : sel.add(v); if (b.classList.contains('custom')) input.value = ''; render(); }
      else { close(); onDone(v); }
    };
    if (multi) $('[data-done]', body).onclick = () => { close(); onDone([...sel]); };
    render();
    if (!('ontouchstart' in window)) setTimeout(() => input.focus(), 250);
  }, { full: true });
}

// ---------------------------------------------------------------------
//  Leurres : suggestion, validation, construction des options
// ---------------------------------------------------------------------
const colorOfWine = w => w.couleur || 'R';
function grapePool(w) {
  const c = colorOfWine(w);
  if (c === 'R' || c === 'P') return GRAPES.filter(g => g.c === 'r');
  if (c === 'E') return GRAPES;
  return GRAPES.filter(g => g.c === 'b');
}
export function suggestLures(crit, w, n) {
  const have = new Set((w.lures?.[crit] || []).map(norm));
  const truth = crit === 'cepages' ? (w.cepages || []) : [w[crit]];
  truth.forEach(t => have.add(norm(t)));
  const need = n - (w.lures?.[crit] || []).length;
  if (need <= 0) return w.lures[crit];
  let pool = [];
  if (crit === 'cepages') {
    const regionGrapes = uniq(APPELLATIONS.filter(a => a.r === w.region).flatMap(a => a.g));
    const colorSet = new Set(grapePool(w).map(g => g.n));
    const near = shuffle(regionGrapes.filter(g => colorSet.has(g)));
    const french = shuffle(grapePool(w).filter(g => APPELLATIONS.some(a => REGIONS_FR.includes(a.r) && a.g.includes(g.n))).map(g => g.n));
    pool = [...near.slice(0, Math.ceil(need / 2)), ...french, ...near];
  } else if (crit === 'region') {
    pool = REGIONS_FR.includes(w.region) || !w.region ? shuffle(REGIONS_FR.filter(r => r !== 'Vin de France')) : shuffle(REGIONS);
  } else if (crit === 'appellation') {
    const c = colorOfWine(w);
    const okColor = a => a.c.includes(c) && !a.n.startsWith('IGP') && !a.n.startsWith('Alsace Grand Cru ') && !a.n.startsWith('Côtes du Rhône Villages ');
    const same = shuffle(APPELLATIONS.filter(a => a.r === w.region && okColor(a)).map(a => a.n));
    const other = shuffle(APPELLATIONS.filter(a => a.r !== w.region && REGIONS_FR.includes(a.r) && okColor(a)).map(a => a.n));
    pool = [...same.slice(0, Math.ceil(need / 2)), ...other, ...same];
  } else if (crit === 'millesime') {
    const t = Number(w.millesime) || new Date().getFullYear() - 3;
    pool = shuffle([1, -1, 2, -2, 3, -3, 4, 5, -4].map(d => t + d).filter(y => y <= new Date().getFullYear()));
    if (w.millesime !== 'NM' && Math.random() < .3) pool.unshift('NM');
  }
  const out = [...(w.lures?.[crit] || [])];
  for (const p of pool) { if (out.length >= n) break; if (!have.has(norm(p))) { out.push(p); have.add(norm(p)); } }
  return out;
}

export function wineIssues(w, s) {
  const miss = [];
  const on = k => s.crit[k]?.on;
  if (on('appellation') && !w.appellation) miss.push('appellation');
  if (on('region') && !w.region) miss.push('région');
  if (on('cepages') && !(w.cepages || []).length) miss.push('cépage(s)');
  if (on('millesime') && (w.millesime == null || w.millesime === '')) miss.push('millésime');
  if (on('prix') && !(Number(w.prix) > 0)) miss.push('prix');
  if (on('alcool') && !(Number(w.alcool) > 0)) miss.push('degré');
  for (const k of QCM_KEYS) if (isQcm(s, k) && (w.lures?.[k] || []).length < s.choices - 1) miss.push('leurres ' + CRITS[k].label.toLowerCase());
  return miss;
}

export function buildOptions(w, s) {
  const o = {};
  const n = s.choices - 1;
  for (const k of QCM_KEYS) {
    if (!isQcm(s, k)) continue;
    const truth = k === 'cepages' ? w.cepages : [w[k]];
    const all = uniq([...truth, ...(w.lures?.[k] || []).slice(0, n)].map(String));
    o[k] = k === 'millesime' ? all.sort((a, b) => (a === 'NM' ? 1e9 : +a) - (b === 'NM' ? 1e9 : +b)) : all.sort((a, b) => a.localeCompare(b, 'fr'));
  }
  return o;
}

export const publicWine = w => ({
  appellation: w.appellation || '', region: w.region || '', cepages: w.cepages || [], millesime: w.millesime ?? '',
  prix: w.prix ?? null, alcool: w.alcool ?? null, couleur: w.couleur || 'R',
  producteur: w.producteur || '', cuvee: w.cuvee || '', commentaire: w.commentaire || '',
});

// ---------------------------------------------------------------------
//  Affichage des valeurs
// ---------------------------------------------------------------------
export function showVal(k, v) {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '—';
  if (k === 'cepages') return v.join(', ');
  if (k === 'millesime') return v === 'NM' ? 'Non millésimé' : String(v);
  if (k === 'prix') return fmt(v) + ' €';
  if (k === 'alcool') return fmt(v) + ' %';
  return String(v);
}
const ST_ICON = { ok: '✓', partial: '≈', ko: '✗', none: '–' };
export const PLAISIR = ['Imbuvable', 'Très décevant', 'Décevant', 'Bof', 'Passable', 'Correct', 'Agréable', 'Bon', 'Très bon', 'Superbe', 'Sublime'];

// Prix : curseur logarithmique 3 € → 500 €
const PMIN = 3, PMAX = 500;
export const sliderToPrice = t => { const v = PMIN * Math.pow(PMAX / PMIN, t / 1000); return v < 20 ? Math.round(v) : v < 100 ? Math.round(v / 5) * 5 : Math.round(v / 10) * 10; };
export const priceToSlider = p => Math.round(1000 * Math.log(p / PMIN) / Math.log(PMAX / PMIN));

// ---------------------------------------------------------------------
//  Formulaire de réponse joueur
// ---------------------------------------------------------------------
const NEZ = ['Fruits rouges', 'Fruits noirs', 'Fruits blancs', 'Agrumes', 'Fruits exotiques', 'Fruits secs', 'Floral', 'Épices', 'Boisé / Vanille', 'Grillé / Torréfié', 'Beurre / Brioche', 'Minéral', 'Végétal', 'Animal / Cuir', 'Sous-bois'];
export const emptyAnswer = () => ({ cepages: [], region: '', appellation: '', millesime: null, prix: null, alcool: null, plaisir: null, grille: { robe: '', nez: [], acidite: 0, tanins: 0, longueur: '', notes: '' } });

export function answerForm(root, { s, opts, idx, total, deadline, ans, onChange, onSubmit, submitLabel = 'Valider ma réponse' }) {
  ans = Object.assign(emptyAnswer(), ans || {});
  const thisYear = new Date().getFullYear();
  const sec = (k, inner, hint = '') => `<section class="card q" data-sec="${k}">
      <div class="q-head"><h3>${CRITS[k]?.label || k}</h3>${hint ? `<span class="hint">${hint}</span>` : ''}</div>${inner}</section>`;
  const optBtns = (k, list, multi) => `<div class="opts ${list.length > 4 ? 'cols2' : ''} ${k === 'millesime' ? 'cols3' : ''}">${list.map(v =>
    `<button class="opt" data-k="${k}" data-v="${esc(v)}" ${multi ? 'data-multi' : ''}><span>${esc(k === 'millesime' && v === 'NM' ? 'Non millésimé' : v)}</span><i class="tick">✓</i></button>`).join('')}</div>`;

  let html = `<div class="wine-head"><span class="eyebrow">${total > 1 ? `Vin ${idx + 1} / ${total}` : 'Votre vin'}</span>
      <h2 class="title">Votre verdict</h2><div class="timer" hidden></div></div>`;
  for (const k of activeCrits(s)) {
    const libre = CRITS[k].qcm && !isQcm(s, k);
    const coef = libre ? `<span class="coef">×1,5</span>` : '';
    if (k === 'cepages') html += sec(k, isQcm(s, k) ? optBtns(k, opts.cepages, true) : `<div class="chips" data-chips="cepages"></div><button class="field add" data-pick="cepages">＋ Ajouter un cépage</button>`, (isQcm(s, k) ? 'Un ou plusieurs' : 'Saisie libre') + coef);
    if (k === 'region') html += sec(k, isQcm(s, k) ? optBtns(k, opts.region) : `<button class="field" data-pick="region"><span data-show="region">Choisir une région</span><i>›</i></button>`, libre ? 'Saisie libre' + coef : '');
    if (k === 'appellation') html += sec(k, isQcm(s, k) ? optBtns(k, opts.appellation) : `<button class="field" data-pick="appellation"><span data-show="appellation">Rechercher une appellation</span><i>›</i></button>`, libre ? 'Saisie libre' + coef : '');
    if (k === 'millesime') html += sec(k, isQcm(s, k) ? optBtns(k, opts.millesime) : `
      <div class="stepper big"><button data-step="-1" aria-label="moins">−</button><output data-show="millesime">—</output><button data-step="1" aria-label="plus">＋</button></div>
      <label class="check"><input type="checkbox" data-nm> Non millésimé</label>`, libre ? 'Saisie libre' + coef : '');
    if (k === 'prix') html += sec(k, `<div class="range-val" data-show="prix">Glissez pour estimer</div>
      <input type="range" min="0" max="1000" value="${priceToSlider(15)}" data-range="prix" class="untouched"><div class="range-scale"><span>3 €</span><span>20 €</span><span>100 €</span><span>500 €</span></div>`, 'Prix public estimé');
    if (k === 'alcool') html += sec(k, `<div class="range-val" data-show="alcool">Glissez pour estimer</div>
      <input type="range" min="8" max="20" step="0.5" value="13" data-range="alcool" class="untouched"><div class="range-scale"><span>8 %</span><span>12 %</span><span>16 %</span><span>20 %</span></div>`, 'Degré d’alcool');
  }
  if (s.grille) html += `<section class="card q" data-sec="grille"><div class="q-head"><h3>Grille de dégustation</h3><span class="hint">Facultatif · non noté</span></div>
      <label class="lbl">Robe</label><div class="seg" data-g="robe">${['Pâle', 'Moyenne', 'Soutenue', 'Profonde'].map(x => `<button data-v="${x}">${x}</button>`).join('')}</div>
      <label class="lbl">Nez</label><div class="chipsel" data-g="nez">${NEZ.map(x => `<button data-v="${x}">${x}</button>`).join('')}</div>
      <label class="lbl">Acidité</label><div class="dots" data-g="acidite">${[1, 2, 3, 4, 5].map(i => `<button data-v="${i}"></button>`).join('')}</div>
      <label class="lbl">Tanins / structure</label><div class="dots" data-g="tanins">${[1, 2, 3, 4, 5].map(i => `<button data-v="${i}"></button>`).join('')}</div>
      <label class="lbl">Longueur</label><div class="seg" data-g="longueur">${['Courte', 'Moyenne', 'Longue'].map(x => `<button data-v="${x}">${x}</button>`).join('')}</div>
      <label class="lbl">Notes</label><textarea data-g="notes" rows="2" placeholder="Vos impressions…"></textarea></section>`;
  if (s.plaisir) html += `<section class="card q" data-sec="plaisir"><div class="q-head"><h3>Note de plaisir</h3><span class="hint">Non comptée dans le score</span></div>
      <div class="plaisir"><b data-show="plaisir">–</b><span>/10</span><em data-show="plaisirTxt">Glissez pour noter</em></div>
      <input type="range" min="0" max="10" step="1" value="5" data-range="plaisir" class="untouched"></section>`;
  html += `<div class="sticky-foot"><button class="btn primary block lg" data-submit>${submitLabel}</button></div>`;
  root.innerHTML = `<div class="answer-form">${html}</div>`;
  const form = root.firstElementChild;

  const changed = () => { onChange && onChange(ans); };
  const paint = () => {
    $$('.opt', form).forEach(b => {
      const k = b.dataset.k, v = b.dataset.v;
      b.classList.toggle('on', k === 'cepages' ? ans.cepages.includes(v) : String(ans[k]) === v);
    });
    const ch = $('[data-chips="cepages"]', form);
    if (ch) ch.innerHTML = ans.cepages.map(c => `<span class="chip on">${esc(c)}<button data-rm="${esc(c)}" aria-label="retirer">✕</button></span>`).join('');
    const show = (k, txt, empty) => { const el = $(`[data-show="${k}"]`, form); if (el) { el.textContent = txt ?? empty; el.closest('.field')?.classList.toggle('filled', txt != null); } };
    show('region', ans.region || null, 'Choisir une région');
    show('appellation', ans.appellation || null, 'Rechercher une appellation');
    const ms = $('[data-show="millesime"]', form);
    if (ms) { ms.textContent = ans.millesime === 'NM' ? 'NM' : ans.millesime ?? '—'; const nm = $('[data-nm]', form); nm.checked = ans.millesime === 'NM'; }
    if (ans.prix != null) { show('prix', '≈ ' + fmt(ans.prix) + ' €'); const r = $('[data-range="prix"]', form); r.value = priceToSlider(ans.prix); r.classList.remove('untouched'); }
    if (ans.alcool != null) { show('alcool', fmt(ans.alcool) + ' % vol.'); const r = $('[data-range="alcool"]', form); r.value = ans.alcool; r.classList.remove('untouched'); }
    if (ans.plaisir != null && $('[data-range="plaisir"]', form)) { show('plaisir', ans.plaisir); show('plaisirTxt', PLAISIR[ans.plaisir]); const r = $('[data-range="plaisir"]', form); r.value = ans.plaisir; r.classList.remove('untouched'); }
    const g = ans.grille;
    $$('[data-g]', form).forEach(el => {
      const k = el.dataset.g;
      if (k === 'notes') { if (el.value !== g.notes) el.value = g.notes || ''; return; }
      $$('button', el).forEach(b => b.classList.toggle('on', k === 'nez' ? g.nez.includes(b.dataset.v) : (k === 'acidite' || k === 'tanins') ? +b.dataset.v <= g[k] : g[k] === b.dataset.v));
    });
  };

  form.addEventListener('click', e => {
    if (form.classList.contains('locked')) return;
    const o = e.target.closest('.opt');
    if (o) {
      haptic();
      const k = o.dataset.k, v = o.dataset.v;
      if (k === 'cepages') ans.cepages = ans.cepages.includes(v) ? ans.cepages.filter(x => x !== v) : [...ans.cepages, v];
      else ans[k] = String(ans[k]) === v ? (k === 'millesime' ? null : '') : (k === 'millesime' && v !== 'NM' ? +v : v);
      paint(); changed(); return;
    }
    const rm = e.target.closest('[data-rm]');
    if (rm) { ans.cepages = ans.cepages.filter(x => x !== rm.dataset.rm); paint(); changed(); return; }
    const p = e.target.closest('[data-pick]');
    if (p) {
      const k = p.dataset.pick;
      if (k === 'cepages') openPicker({ title: 'Cépages', kind: 'grape', multi: true, selected: ans.cepages, allowCustom: true, onDone: v => { ans.cepages = v.map(canonGrape); paint(); changed(); } });
      if (k === 'region') openPicker({ title: 'Région', kind: 'region', onDone: v => { ans.region = v; paint(); changed(); } });
      if (k === 'appellation') openPicker({ title: 'Appellation', kind: 'app', allowCustom: true, onDone: v => {
        ans.appellation = findApp(v)?.n || v;
        if (s.crit.region?.on && !isQcm(s, 'region') && !ans.region && findApp(v)) ans.region = findApp(v).r;
        paint(); changed();
      } });
      return;
    }
    const st = e.target.closest('[data-step]');
    if (st) {
      haptic();
      const cur = typeof ans.millesime === 'number' ? ans.millesime : thisYear - 3;
      ans.millesime = ans.millesime == null || ans.millesime === 'NM' ? cur : Math.min(thisYear, Math.max(1900, cur + +st.dataset.step));
      paint(); changed(); return;
    }
    const gb = e.target.closest('[data-g] button');
    if (gb) {
      haptic();
      const k = gb.parentElement.dataset.g, v = gb.dataset.v, g = ans.grille;
      if (k === 'nez') g.nez = g.nez.includes(v) ? g.nez.filter(x => x !== v) : [...g.nez, v];
      else if (k === 'acidite' || k === 'tanins') g[k] = g[k] === +v ? 0 : +v;
      else g[k] = g[k] === v ? '' : v;
      paint(); changed(); return;
    }
    if (e.target.closest('[data-submit]')) submit(false);
  });
  form.addEventListener('input', e => {
    const r = e.target.dataset.range;
    if (r) {
      e.target.classList.remove('untouched');
      if (r === 'prix') ans.prix = sliderToPrice(+e.target.value);
      if (r === 'alcool') ans.alcool = +e.target.value;
      if (r === 'plaisir') ans.plaisir = +e.target.value;
      paint(); changed();
    }
    if (e.target.dataset.g === 'notes') { ans.grille.notes = e.target.value; changed(); }
    if ('nm' in e.target.dataset) { ans.millesime = e.target.checked ? 'NM' : thisYear - 3; paint(); changed(); }
  });

  const missing = () => activeCrits(s).filter(k => { const a = ans[k]; return a == null || a === '' || (Array.isArray(a) && !a.length); });
  async function submit(auto) {
    const m = missing();
    if (!auto && m.length) {
      if (!await confirmBox(`Il manque : ${m.map(k => CRITS[k].label.toLowerCase()).join(', ')}. Valider quand même ?`, { ok: 'Valider' })) return;
    }
    haptic(true);
    onSubmit(JSON.parse(JSON.stringify(ans)), auto);
  }

  // Chrono
  let tick;
  if (deadline) {
    const tEl = $('.timer', form); tEl.hidden = false;
    const upd = () => {
      const r = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      tEl.textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
      tEl.classList.toggle('urgent', r <= 15);
      if (r <= 1 && !form.classList.contains('locked')) { form.classList.add('locked'); clearInterval(tick); submit(true); }
    };
    upd(); tick = setInterval(upd, 500);
  }
  paint();
  return { destroy: () => clearInterval(tick), lock: () => form.classList.add('locked') };
}

// ---------------------------------------------------------------------
//  Révélation
// ---------------------------------------------------------------------
const COLOR_CLASS = { R: 'red', B: 'white', P: 'rose', E: 'spark', D: 'sweet' };
export function wineCard(w, photo, { s } = {}) {
  const on = k => !s || s.crit[k]?.on;
  return `<article class="reveal-card ${COLOR_CLASS[w.couleur] || 'red'}">
    ${photo ? `<button class="label-photo" data-zoom><img src="${photo}" alt="Étiquette"></button>` : ''}
    <div class="rc-body">
      <span class="pill">${esc(COLORS[w.couleur] || '')}</span>
      <h2 class="rc-app">${esc(w.appellation || '—')}</h2>
      <p class="rc-region">${esc(w.region || '')}${w.millesime !== '' && w.millesime != null ? ' · ' + esc(showVal('millesime', w.millesime)) : ''}</p>
      ${w.producteur || w.cuvee ? `<p class="rc-prod">${esc(w.producteur)}${w.cuvee ? ` — <em>${esc(w.cuvee)}</em>` : ''}</p>` : ''}
      <div class="chips">${(w.cepages || []).map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>
      <div class="rc-facts">
        ${w.prix ? `<div><small>Prix</small><b>${fmt(w.prix)} €</b></div>` : ''}
        ${w.alcool ? `<div><small>Degré</small><b>${fmt(w.alcool)} %</b></div>` : ''}
      </div>
      ${w.commentaire ? `<p class="rc-comment">${esc(w.commentaire)}</p>` : ''}
    </div></article>`;
}
export function resultRows(res, s) {
  if (!res) return `<p class="muted center">Pas de réponse pour ce vin.</p>`;
  return `<div class="res-rows">${activeCrits(s).map(k => {
    const b = res.b?.[k] || { pts: 0, max: critMax(s, k), st: 'none' };
    return `<div class="res-row ${b.st}"><i class="st">${ST_ICON[b.st]}</i><div class="rr-t"><small>${CRITS[k].label}</small><span>${esc(showVal(k, res.a?.[k]))}</span></div><b>${fmt(b.pts)}<small>/${fmt(b.max)}</small></b></div>`;
  }).join('')}</div>`;
}
export function leaderboard(scores, { me, limit = 99, perWineIdx } = {}) {
  const rows = Object.entries(scores || {}).map(([uid, p]) => ({ uid, ...p })).sort((a, b) => b.total - a.total);
  let rank = 0, prev = null;
  rows.forEach((r, i) => { if (r.total !== prev) rank = i + 1; r.rank = rank; prev = r.total; });
  return `<ol class="lb">${rows.slice(0, limit).map(r => {
    const w = perWineIdx != null ? r.perWine?.[perWineIdx] : null;
    return `<li class="${r.uid === me ? 'me' : ''}"><span class="lb-rank">${r.rank}</span><span class="lb-av">${esc(r.avatar || '🍷')}</span><span class="lb-name">${esc(r.name)}</span>${w ? `<span class="lb-delta">+${fmt(w.pts)}</span>` : ''}<b class="lb-pts">${fmt(r.total)}</b></li>`;
  }).join('')}</ol>`;
}
export function rankOf(scores, uid) {
  const rows = Object.entries(scores || {}).map(([u, p]) => ({ u, t: p.total })).sort((a, b) => b.t - a.t);
  const me = rows.find(r => r.u === uid); if (!me) return null;
  return { rank: rows.filter(r => r.t > me.t).length + 1, of: rows.length, total: me.t };
}
export function bindZoom(root) {
  root.addEventListener('click', e => {
    const z = e.target.closest('[data-zoom]'); if (!z) return;
    const src = $('img', z).src;
    sheet('Étiquette', b => { b.innerHTML = `<img class="zoomed" src="${src}" alt="">`; }, { full: true });
  });
}

/** Révélation côté joueur */
export function playerReveal(root, { wine, photo, res, s, idx, total, scores, me, footer = '' }) {
  const rk = rankOf(scores, me);
  root.innerHTML = `<div class="reveal">
      <span class="eyebrow center">${total > 1 ? `Vin ${idx + 1} / ${total} · ` : ''}Révélation</span>
      ${wineCard(wine, photo, { s })}
      <section class="card score-card">
        <div class="sc-top"><div><small>Vos points</small><div class="big-pts">+<span data-count>0</span><small> / ${fmt(res?.max ?? wineMax(s))}</small></div></div>
        ${rk && rk.of > 1 ? `<div class="sc-rank"><small>Classement</small><b>${rk.rank}<sup>${rk.rank === 1 ? 'er' : 'e'}</sup></b><small>sur ${rk.of}</small></div>` : ''}</div>
        ${resultRows(res, s)}
        ${res?.a?.plaisir != null ? `<p class="muted small">Votre note de plaisir : <b>${res.a.plaisir}/10</b></p>` : ''}
      </section>
      ${scores && Object.keys(scores).length > 1 ? `<section class="card"><h3 class="h-sm">Classement général</h3>${leaderboard(scores, { me, limit: 8, perWineIdx: idx })}</section>` : ''}
      ${footer}
    </div>`;
  const c = $('[data-count]', root); if (c) countUp(c, res?.pts || 0);
  if (res && res.max && res.pts / res.max >= .8) setTimeout(() => confetti(1800), 400);
  bindZoom(root);
  haptic(true);
}

// ---------------------------------------------------------------------
//  Écran final : podium, classement, vins préférés, distinctions
// ---------------------------------------------------------------------
export function finalView(root, { game, me, actions = '' }) {
  const s = game.settings, scores = game.scores || {}, wines = game.summary?.wines || [];
  const rows = Object.entries(scores).map(([uid, p]) => ({ uid, ...p })).sort((a, b) => b.total - a.total);
  const maxTotal = wineMax(s) * (game.summary?.played ?? wines.length);
  const podium = [rows[1], rows[0], rows[2]];
  const award = (k, title) => {
    if (!s.crit[k]?.on || rows.length < 2) return '';
    const best = rows.map(r => ({ r, v: Object.values(r.perWine || {}).reduce((t, w) => t + (w.b?.[k]?.pts || 0), 0) })).sort((a, b) => b.v - a.v)[0];
    return best && best.v > 0 ? `<div class="award"><span>${title}</span><b>${esc(best.r.avatar || '')} ${esc(best.r.name)}</b><small>${fmt(best.v)} pts</small></div>` : '';
  };
  const fav = wines.map((w, i) => ({ w, i })).filter(x => x.w.plaisirAvg != null).sort((a, b) => b.w.plaisirAvg - a.w.plaisirAvg);
  root.innerHTML = `<div class="final">
    <span class="eyebrow center">${esc(game.name || 'Partie terminée')}</span>
    <h1 class="title center">${rows.length > 1 ? 'Le podium' : 'Résultat'}</h1>
    ${rows.length > 1 ? `<div class="podium">${podium.map((r, i) => r ? `<div class="pod p${[2, 1, 3][i]}">
        <div class="pod-av">${esc(r.avatar || '🍷')}</div><div class="pod-name">${esc(r.name)}</div><div class="pod-pts">${fmt(r.total)} pts</div>
        <div class="pod-bar"><span>${[2, 1, 3][i]}</span></div></div>` : '<div class="pod empty"></div>').join('')}</div>`
      : rows[0] ? `<div class="solo-score"><div class="big-pts"><span data-count>0</span><small> / ${fmt(maxTotal)}</small></div><p>${pct(rows[0].total, maxTotal)} % de réussite</p></div>` : ''}
    ${rows.length > 1 ? `<section class="card"><h3 class="h-sm">Classement final</h3>${leaderboard(scores, { me })}</section>` : ''}
    ${rows.length > 1 ? `<section class="awards">${award('cepages', 'Nez d’or · cépages')}${award('appellation', 'Maître des appellations')}${award('millesime', 'Horloge du millésime')}${award('region', 'Boussole des terroirs')}</section>` : ''}
    ${fav.length ? `<section class="card"><h3 class="h-sm">Vins préférés de la tablée</h3><ol class="fav">${fav.map(x => `<li><span class="fav-n">Vin ${x.i + 1}</span><span class="fav-t">${esc(x.w.appellation)} ${x.w.millesime && x.w.millesime !== 'NM' ? x.w.millesime : ''}<small>${esc([x.w.producteur, x.w.cuvee].filter(Boolean).join(' — '))}</small></span><b>${fmt(x.w.plaisirAvg)}<small>/10</small></b></li>`).join('')}</ol></section>` : ''}
    ${actions}
  </div>`;
  const c = $('[data-count]', root); if (c) countUp(c, rows[0]?.total || 0, 1200);
  setTimeout(() => confetti(), 500);
}
