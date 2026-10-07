import { norm, regionOfApp } from './data.js';

export const CRITS = {
  cepages:     { label: 'Cépage(s)',   max: 4, qcm: true },
  region:      { label: 'Région',      max: 2, qcm: true },
  appellation: { label: 'Appellation', max: 3, qcm: true },
  millesime:   { label: 'Millésime',   max: 3, qcm: true },
  prix:        { label: 'Prix',        max: 2, qcm: false },
  alcool:      { label: 'Degré',       max: 2, qcm: false },
};
export const QCM_KEYS = ['cepages', 'region', 'appellation', 'millesime'];
export const LIBRE_COEF = 1.5;

export const PRESETS = {
  facile:  { label: 'Facile',        desc: 'Tout en choix multiples', modes: { cepages: 'qcm', region: 'qcm', appellation: 'qcm', millesime: 'qcm' } },
  inter:   { label: 'Intermédiaire', desc: 'Cépages et région en choix multiples, le reste en saisie libre', modes: { cepages: 'qcm', region: 'qcm', appellation: 'libre', millesime: 'libre' } },
  expert:  { label: 'Expert',        desc: 'Tout en saisie libre (points ×1,5)', modes: { cepages: 'libre', region: 'libre', appellation: 'libre', millesime: 'libre' } },
};

export function defaultSettings() {
  return {
    name: '', wineCount: 4, difficulty: 'facile', choices: 4, timer: 0, plaisir: true, grille: false,
    crit: {
      cepages: { on: true, mode: 'qcm' }, region: { on: true, mode: 'qcm' },
      appellation: { on: true, mode: 'qcm' }, millesime: { on: true, mode: 'qcm' },
      prix: { on: false }, alcool: { on: false },
    },
  };
}
export function applyPreset(s, key) {
  s.difficulty = key;
  const p = PRESETS[key];
  if (p) for (const k of QCM_KEYS) s.crit[k].mode = p.modes[k];
}
export const isQcm = (s, k) => s.crit[k]?.on && CRITS[k].qcm && s.crit[k].mode === 'qcm';
export const critMax = (s, k) => CRITS[k].max * (CRITS[k].qcm && s.crit[k].mode === 'libre' ? LIBRE_COEF : 1);
export const activeCrits = s => Object.keys(CRITS).filter(k => s.crit[k]?.on);
export const wineMax = s => activeCrits(s).reduce((t, k) => t + critMax(s, k), 0);
const r05 = x => Math.round(x * 2) / 2;

/** Compare une réponse à la solution. Renvoie { pts, max, b:{crit:{pts,max,st}} } ; st = ok|partial|ko|none */
export function scoreWine(sol, ans, s) {
  const b = {};
  let pts = 0, max = 0;
  for (const k of activeCrits(s)) {
    const m = critMax(s, k), coef = m / CRITS[k].max;
    let p = 0, st = 'ko';
    const a = ans?.[k];
    const empty = a == null || a === '' || (Array.isArray(a) && !a.length);
    if (empty) st = 'none';
    else if (k === 'cepages') {
      const T = new Set((sol.cepages || []).map(norm)), A = new Set(a.map(norm));
      let hits = 0, wrong = 0;
      A.forEach(x => T.has(x) ? hits++ : wrong++);
      const raw = T.size ? Math.max(0, (hits - 0.5 * wrong) / T.size) : 0;
      p = r05(raw * m);
      st = hits === T.size && !wrong ? 'ok' : p > 0 ? 'partial' : 'ko';
    } else if (k === 'region') {
      if (norm(a) === norm(sol.region)) { p = m; st = 'ok'; }
    } else if (k === 'appellation') {
      if (norm(a) === norm(sol.appellation)) { p = m; st = 'ok'; }
      else if (sol.region && norm(regionOfApp(a)) === norm(sol.region)) { p = r05(1 * coef); st = 'partial'; }
    } else if (k === 'millesime') {
      const t = sol.millesime;
      if (String(t) === 'NM' || String(a) === 'NM') { if (String(t) === String(a)) { p = m; st = 'ok'; } }
      else {
        const d = Math.abs(Number(a) - Number(t));
        if (d === 0) { p = m; st = 'ok'; } else if (d === 1) { p = r05(2 * coef); st = 'partial'; }
        else if (d === 2) { p = r05(1 * coef); st = 'partial'; }
      }
    } else if (k === 'prix') {
      const t = Number(sol.prix), r = Math.abs(Number(a) - t) / (t || 1);
      if (r <= 0.2) { p = 2; st = 'ok'; } else if (r <= 0.4) { p = 1; st = 'partial'; }
    } else if (k === 'alcool') {
      const d = Math.abs(Number(a) - Number(sol.alcool));
      if (d <= 0.5) { p = 2; st = 'ok'; } else if (d <= 1) { p = 1; st = 'partial'; }
    }
    b[k] = { pts: p, max: m, st };
    pts += p; max += m;
  }
  return { pts, max, b };
}
