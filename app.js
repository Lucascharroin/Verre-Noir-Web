// =====================================================================
//  Verre Noir — application de dégustation à l'aveugle
// =====================================================================
import { APP_NAME, MAX_PLAYERS } from './config.js';
import { createBackend } from './backend.js';
import { $, $$, esc, fmt, pct, uniq, shuffle, sample, dateFr, store, toast, sheet, confirmBox, haptic, keepAwake, compressImage, glassSVG, AVATARS, isIOS, isStandalone } from './ui.js';
import { APPELLATIONS, GRAPES, REGIONS_FR, COLORS, findApp, canonGrape, norm } from './data.js';
import { CRITS, QCM_KEYS, PRESETS, defaultSettings, applyPreset, isQcm, activeCrits, wineMax, scoreWine } from './scoring.js';
import { openPicker, suggestLures, wineIssues, buildOptions, publicWine, answerForm, playerReveal, wineCard, resultRows, leaderboard, rankOf, finalView, showVal, bindZoom } from './components.js';

const root = document.getElementById('app');
const S = { be: null, uid: null, profile: store.get('vn_profile', { name: '', avatar: AVATARS[0] }) };
let cleanups = [];
const onCleanup = (...f) => cleanups.push(...f);

// ---------------------------------------------------------------------
//  Navigation
// ---------------------------------------------------------------------
function go(name, params = {}) {
  cleanups.forEach(f => { try { f(); } catch { } }); cleanups = [];
  $$('.sheet-wrap,.modal-wrap').forEach(e => e.remove()); document.body.classList.remove('noscroll');
  S.screen = name; S.params = params;
  window.scrollTo(0, 0);
  SCREENS[name](params);
}
function view(html, cls = '') {
  root.innerHTML = `<main class="screen ${cls}">${html}</main>`;
  return root.firstElementChild;
}
const topbar = (title, { back = 'home', backParams, right = '' } = {}) => {
  S.backTarget = back ? [back, backParams] : null;
  return `<header class="topbar">${back ? `<button class="icon-btn" data-back aria-label="Retour">‹</button>` : '<span></span>'}<h1>${esc(title)}</h1><div class="tb-right">${right || '<span class="icon-btn ghost-spacer"></span>'}</div></header>`;
};
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { haptic(); go(g.dataset.go, g.dataset.params ? JSON.parse(g.dataset.params) : {}); return; }
  if (e.target.closest('[data-back]') && S.backTarget) { haptic(); go(S.backTarget[0], S.backTarget[1] || {}); }
});

// Brouillons (paramètres + vins) : en local, et en secret côté serveur pour le maître du jeu
const draftKey = ctx => ctx.code ? 'vn_host_' + ctx.code : 'vn_draft_' + ctx.mode;
const getDraft = ctx => store.get(draftKey(ctx));
const setDraft = (ctx, d) => store.set(draftKey(ctx), d);
async function pushSecret(code, d, photoIdx) {
  if (S.be.mode !== 'firebase' && S.be.mode !== 'local') return;
  const wines = d.wines.map(w => { const { photo, ...rest } = w; return { ...rest, hasPhoto: !!photo }; });
  try {
    await S.be.setSecret(code, { hostUid: S.uid, settings: d.settings, wines });
    if (photoIdx != null && d.wines[photoIdx]?.photo) await S.be.setPhoto(code, photoIdx, d.wines[photoIdx].photo, S.uid);
  } catch (e) { console.warn(e); }
}
const newWine = () => ({ couleur: 'R', appellation: '', region: '', cepages: [], millesime: null, prix: null, alcool: null, producteur: '', cuvee: '', commentaire: '', photo: null, lures: { cepages: [], region: [], appellation: [], millesime: [] } });
const ensureWines = d => { d.wines = d.wines || []; while (d.wines.length < d.settings.wineCount) d.wines.push(newWine()); d.wines.length = d.settings.wineCount; return d; };
const session = { get: () => store.get('vn_session'), set: v => store.set('vn_session', v), clear: () => store.del('vn_session') };

const SCREENS = {};

// ---------------------------------------------------------------------
//  ACCUEIL
// ---------------------------------------------------------------------
SCREENS.home = () => {
  const sess = session.get();
  const p = S.profile;
  view(`
    <div class="home">
      <div class="hero">${glassSVG('pour')}<h1 class="brand">${esc(APP_NAME)}</h1><p class="tagline">Dégustation à l’aveugle</p></div>
      ${sess ? `<button class="card resume" data-resume><span class="pulse"></span><div><small>Partie en cours</small><b>${esc(sess.code)} · ${sess.role === 'host' ? 'Maître du jeu' : 'Joueur'}</b></div><i>›</i></button>` : ''}
      <div class="stack">
        <button class="btn primary lg block" data-go="join">Rejoindre une partie</button>
        <button class="btn ghost lg block two" data-go="setup" data-params='{"mode":"online"}'><span>Créer une partie</span><small>Maître du jeu</small></button>
        <button class="btn ghost lg block two" data-go="solo"><span>Entraînement solo</span><small>Dégustation ou quiz</small></button>
      </div>
      <div class="tiles">
        <button class="tile" data-go="history"><span>📜</span>Historique</button>
        <button class="tile" data-go="stats"><span>📈</span>Statistiques</button>
      </div>
      <button class="profile-line" data-profile><span class="av">${esc(p.avatar)}</span>${p.name ? `Joue en tant que <b>${esc(p.name)}</b>` : 'Choisir mon pseudo'}<i>✎</i></button>
      ${isIOS && !isStandalone && !store.get('vn_hide_install') ? `<div class="install card"><b>Installer l’app</b><p>Dans Safari, touchez <span class="ios-share">⎋</span> Partager puis « Sur l’écran d’accueil ».</p><button class="icon-btn" data-hide-install>✕</button></div>` : ''}
      ${S.be.mode === 'local' ? `<p class="demo">Mode démo : Firebase n’est pas configuré, les parties ne fonctionnent qu’entre les onglets de cet appareil.</p>` : ''}
    </div>`, 'center-screen');
  $('[data-profile]').onclick = () => editProfile(() => go('home'));
  const hi = $('[data-hide-install]'); if (hi) hi.onclick = () => { store.set('vn_hide_install', 1); go('home'); };
  const r = $('[data-resume]');
  if (r) r.onclick = async () => {
    const g = await S.be.getGame(sess.code).catch(() => null);
    if (!g || g.phase === 'finished' && sess.role !== 'host') { session.clear(); toast('Cette partie est terminée'); return go('home'); }
    go(sess.role === 'host' ? 'host' : 'play', { code: sess.code });
  };
};

function editProfile(after) {
  sheet('Mon profil', (b, close) => {
    let av = S.profile.avatar;
    b.innerHTML = `<label class="lbl">Pseudo</label><input class="inp" maxlength="18" value="${esc(S.profile.name)}" placeholder="Votre prénom">
      <label class="lbl">Avatar</label><div class="avatars">${AVATARS.map(a => `<button class="${a === av ? 'on' : ''}" data-av="${a}">${a}</button>`).join('')}</div>
      <div class="sheet-foot"><button class="btn primary block" data-ok>Enregistrer</button></div>`;
    $('.avatars', b).onclick = e => { const x = e.target.closest('[data-av]'); if (!x) return; haptic(); av = x.dataset.av; $$('[data-av]', b).forEach(y => y.classList.toggle('on', y === x)); };
    $('[data-ok]', b).onclick = () => {
      const n = $('input', b).value.trim(); if (!n) return toast('Choisissez un pseudo', 'err');
      S.profile = { name: n, avatar: av }; store.set('vn_profile', S.profile); close(); after && after();
    };
  });
}

// ---------------------------------------------------------------------
//  REJOINDRE
// ---------------------------------------------------------------------
SCREENS.join = ({ code = '' } = {}) => {
  let av = S.profile.avatar;
  view(`${topbar('Rejoindre')}
    <section class="card">
      <label class="lbl">Code de la partie</label>
      <input class="code-input" maxlength="4" value="${esc(code)}" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABCD" inputmode="text">
      <label class="lbl">Votre pseudo</label>
      <input class="inp" data-name maxlength="18" value="${esc(S.profile.name)}" placeholder="Votre prénom">
      <label class="lbl">Avatar</label><div class="avatars">${AVATARS.map(a => `<button class="${a === av ? 'on' : ''}" data-av="${a}">${a}</button>`).join('')}</div>
    </section>
    <div class="sticky-foot"><button class="btn primary block lg" data-join>Entrer dans la cave</button></div>`);
  const ci = $('.code-input');
  ci.oninput = () => { ci.value = ci.value.toUpperCase().replace(/[^A-Z]/g, ''); };
  $('.avatars').onclick = e => { const x = e.target.closest('[data-av]'); if (!x) return; haptic(); av = x.dataset.av; $$('[data-av]').forEach(y => y.classList.toggle('on', y === x)); };
  $('[data-join]').onclick = async () => {
    const c = ci.value.trim(), name = $('[data-name]').value.trim();
    if (c.length !== 4) return toast('Le code fait 4 lettres', 'err');
    if (!name) return toast('Choisissez un pseudo', 'err');
    const btn = $('[data-join]'); btn.disabled = true;
    try {
      const g = await S.be.getGame(c);
      if (!g) throw new Error('Partie introuvable');
      if (g.phase === 'finished') throw new Error('Cette partie est terminée');
      if (g.hostUid === S.uid) { session.set({ code: c, role: 'host' }); return go('host', { code: c }); }
      const players = await S.be.getPlayers(c);
      if (!players.some(p => p.id === S.uid) && players.length >= MAX_PLAYERS) throw new Error(`Partie complète (${MAX_PLAYERS} joueurs max)`);
      S.profile = { name, avatar: av }; store.set('vn_profile', S.profile);
      await S.be.join(c, S.uid, { name, avatar: av, joinedAt: Date.now() });
      session.set({ code: c, role: 'player' });
      haptic(true);
      go('play', { code: c });
    } catch (e) { toast(e.message || 'Connexion impossible', 'err'); btn.disabled = false; }
  };
};

// ---------------------------------------------------------------------
//  PARAMÉTRAGE DE LA PARTIE (en ligne ou solo)
// ---------------------------------------------------------------------
SCREENS.setup = ({ mode = 'online' }) => {
  const ctx = { mode };
  const d = getDraft(ctx) || { settings: defaultSettings(), wines: [] };
  const s = d.settings;
  const save = () => setDraft(ctx, ensureWines(d));
  const render = () => {
    const y = scrollY;
    const diffLabel = PRESETS[s.difficulty] ? PRESETS[s.difficulty].desc : 'Réglage personnalisé';
    view(`${topbar(mode === 'solo' ? 'Dégustation solo' : 'Nouvelle partie', { back: mode === 'solo' ? 'solo' : 'home' })}
      <section class="card">
        <label class="lbl">Nom de la session</label>
        <input class="inp" data-name maxlength="40" value="${esc(s.name)}" placeholder="${mode === 'solo' ? 'Ex. Entraînement Loire' : 'Ex. Soirée Bourgogne'}">
        <div class="row-between mt"><div><b>Nombre de vins</b></div>${stepper('wc', s.wineCount)}</div>
      </section>
      <section class="card">
        <h3 class="h-sm">Difficulté</h3>
        <div class="seg" data-diff>${Object.entries(PRESETS).map(([k, p]) => `<button data-v="${k}" class="${s.difficulty === k ? 'on' : ''}">${p.label}</button>`).join('')}</div>
        <p class="muted small mt-s">${diffLabel}</p>
        <div class="crit-list">${Object.keys(CRITS).map(k => `
          <div class="crit ${s.crit[k].on ? '' : 'off'}">
            <span class="crit-n">${CRITS[k].label}</span>
            ${CRITS[k].qcm ? `<div class="seg mini" data-mode="${k}"><button data-v="qcm" class="${s.crit[k].mode === 'qcm' ? 'on' : ''}">Choix</button><button data-v="libre" class="${s.crit[k].mode === 'libre' ? 'on' : ''}">Libre</button></div>` : '<span class="muted small">Curseur</span>'}
            ${toggle('crit-' + k, s.crit[k].on)}
          </div>`).join('')}</div>
        <div class="row-between mt ${QCM_KEYS.some(k => isQcm(s, k)) ? '' : 'dim'}"><div><b>Choix proposés</b><small>par question à choix</small></div>${stepper('ch', s.choices)}</div>
        <p class="muted small mt-s">Barème : cépages 4 · appellation 3 · millésime 3 (±1 an : 2, ±2 ans : 1) · région 2 · prix 2 (±20 %) · degré 2 (±0,5°). Saisie libre : ×1,5. Points partiels sur les assemblages et pour une appellation de la bonne région.</p>
      </section>
      <section class="card">
        <h3 class="h-sm">Options</h3>
        <label class="lbl">Chrono par vin</label>
        <div class="seg" data-timer>${[[0, 'Aucun'], [120, '2 min'], [180, '3 min'], [300, '5 min'], [600, '10 min']].map(([v, l]) => `<button data-v="${v}" class="${s.timer === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="row-between mt"><div><b>Note de plaisir</b><small>sur 10, non comptée</small></div>${toggle('plaisir', s.plaisir)}</div>
        <div class="row-between mt"><div><b>Grille de dégustation</b><small>robe, nez, bouche (facultative)</small></div>${toggle('grille', s.grille)}</div>
      </section>
      <div class="sticky-foot"><button class="btn primary block lg" data-next>Suivant · saisir les vins</button></div>`);
    scrollTo(0, y);
    $('[data-name]').oninput = e => { s.name = e.target.value; save(); };
  };
  root.onclick = null;
  const handler = e => {
    const t = e.target;
    const st = t.closest('[data-step]');
    if (st) {
      haptic();
      const [k, dlt] = st.dataset.step.split(':');
      if (k === 'wc') s.wineCount = Math.min(15, Math.max(1, s.wineCount + +dlt));
      if (k === 'ch') s.choices = Math.min(8, Math.max(2, s.choices + +dlt));
      save(); return render();
    }
    const b = t.closest('.seg button');
    if (b) {
      haptic();
      const seg = b.parentElement;
      if ('diff' in seg.dataset) applyPreset(s, b.dataset.v);
      if (seg.dataset.mode) { s.crit[seg.dataset.mode].mode = b.dataset.v; s.difficulty = 'perso'; }
      if ('timer' in seg.dataset) s.timer = +b.dataset.v;
      save(); return render();
    }
    const tg = t.closest('[data-toggle]');
    if (tg) {
      haptic();
      const k = tg.dataset.toggle;
      if (k.startsWith('crit-')) { const c = k.slice(5); s.crit[c].on = !s.crit[c].on; if (!activeCrits(s).length) { s.crit[c].on = true; toast('Gardez au moins un critère', 'err'); } }
      else s[k] = !s[k];
      save(); return render();
    }
    if (t.closest('[data-next]')) { save(); go('wines', { mode }); }
  };
  root.addEventListener('click', handler); onCleanup(() => root.removeEventListener('click', handler));
  save(); render();
};
const stepper = (k, v) => `<div class="stepper"><button data-step="${k}:-1" aria-label="moins">−</button><output>${v}</output><button data-step="${k}:1" aria-label="plus">＋</button></div>`;
const toggle = (k, on) => `<button class="switch ${on ? 'on' : ''}" data-toggle="${k}" role="switch" aria-checked="${on}"><span></span></button>`;

// ---------------------------------------------------------------------
//  LISTE DES VINS
// ---------------------------------------------------------------------
SCREENS.wines = async ({ mode, code }) => {
  const ctx = { mode, code };
  const d = ensureWines(getDraft(ctx) || { settings: defaultSettings(), wines: [] });
  const s = d.settings;
  const g = code ? await S.be.getGame(code) : null;
  const served = i => g && (g.revealed?.[i] || g.current === i && g.phase !== 'lobby');
  const items = d.wines.map((w, i) => {
    const iss = wineIssues(w, s);
    return `<button class="wine-item ${iss.length ? '' : 'ok'}" data-i="${i}" ${served(i) ? 'disabled' : ''}>
      <span class="wi-n ${w.couleur ? 'c-' + w.couleur : ''}">${i + 1}</span>
      <span class="wi-t"><b>${esc(w.appellation || 'Vin à compléter')}${w.millesime ? ' ' + esc(showVal('millesime', w.millesime)) : ''}</b>
      <small>${served(i) ? 'Déjà servi' : iss.length ? 'Manque : ' + esc(iss.join(', ')) : esc([w.producteur, (w.cepages || []).join(', ')].filter(Boolean).join(' · '))}</small></span>
      <i>${served(i) ? '🔒' : iss.length ? '›' : '✓'}</i></button>`;
  }).join('');
  const done = d.wines.every(w => !wineIssues(w, s).length);
  view(`${topbar('Les vins', { back: code ? 'host' : 'setup', backParams: code ? { code } : { mode } })}
    <p class="lead">${mode === 'solo' ? 'Demandez à quelqu’un de saisir les vins à l’abri de vos regards, puis de vous rendre le téléphone.' : 'Saisissez chaque vin et ses leurres à l’abri des regards. Les joueurs ne voient rien avant la révélation.'}</p>
    <div class="wine-list">${items}</div>
    <div class="sticky-foot">${code ? `<button class="btn primary block lg" data-go="host" data-params='${JSON.stringify({ code })}'>Retour au salon</button>`
      : `<button class="btn primary block lg" data-start ${mode === 'solo' && !done ? 'disabled' : ''}>${mode === 'solo' ? 'Commencer la dégustation' : 'Créer la partie'}</button>`}</div>`);
  $('.wine-list').onclick = e => { const b = e.target.closest('[data-i]'); if (b) { haptic(); go('wineEdit', { mode, code, idx: +b.dataset.i }); } };
  const st = $('[data-start]');
  if (st) st.onclick = async () => {
    if (mode === 'solo') {
      if (!await confirmBox('Rendez le téléphone au dégustateur. Les vins resteront cachés jusqu’à chaque révélation.', { ok: 'C’est parti' })) return;
      store.set('vn_solo_run', { i: 0, results: {}, startedAt: Date.now() });
      return go('soloPlay');
    }
    if (!done && !await confirmBox('Certains vins sont incomplets. Vous pourrez les compléter depuis le salon avant de les servir.', { ok: 'Créer quand même' })) return;
    if (!S.profile.name) return editProfile(() => st.click());
    st.disabled = true;
    try {
      const c = await createGame(d);
      store.del(draftKey(ctx));
      go('host', { code: c });
    } catch (e) { console.error(e); toast('Création impossible : ' + (e.message || e), 'err'); st.disabled = false; }
  };
};

async function createGame(d) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  for (let k = 0; k < 12; k++) {
    code = Array.from({ length: 4 }, () => A[Math.random() * A.length | 0]).join('');
    if (!await S.be.getGame(code)) break;
  }
  const s = d.settings;
  await S.be.createGame(code, {
    code, hostUid: S.uid, hostName: S.profile.name, hostAvatar: S.profile.avatar, name: s.name || 'Dégustation du ' + dateFr(Date.now()),
    settings: s, wineCount: s.wineCount, phase: 'lobby', current: -1, options: null, deadline: null,
    scores: {}, revealed: {}, playerUids: [], createdAt: Date.now(),
  });
  const hostDraft = { settings: s, wines: d.wines };
  setDraft({ code }, hostDraft);
  await pushSecret(code, hostDraft);
  for (let i = 0; i < d.wines.length; i++) if (d.wines[i].photo) await S.be.setPhoto(code, i, d.wines[i].photo, S.uid).catch(() => { });
  session.set({ code, role: 'host' });
  return code;
}

// ---------------------------------------------------------------------
//  ÉDITION D'UN VIN
// ---------------------------------------------------------------------
SCREENS.wineEdit = ({ mode, code, idx }) => {
  const ctx = { mode, code };
  const d = ensureWines(getDraft(ctx));
  const s = d.settings;
  const w = d.wines[idx];
  w.lures ||= { cepages: [], region: [], appellation: [], millesime: [] };
  let photoChanged = false;
  const save = () => setDraft(ctx, d);
  const year = new Date().getFullYear();
  const render = () => {
    const y = scrollY;
    const app = findApp(w.appellation);
    const suggestions = app ? app.g.filter(g => !w.cepages.includes(g)) : [];
    const lureCard = k => {
      if (!isQcm(s, k)) return '';
      const need = s.choices - 1, have = w.lures[k] || [];
      return `<section class="card">
        <div class="q-head"><h3>Leurres · ${CRITS[k].label}</h3><span class="count ${have.length >= need ? 'ok' : ''}">${have.length}/${need}</span></div>
        <p class="muted small">Les joueurs verront ${k === 'cepages' ? 'les vrais cépages' : 'la bonne réponse'} mélangé${k === 'cepages' ? 's' : 'e'} à ces leurres.</p>
        <div class="chips">${have.map(v => `<span class="chip lure">${esc(k === 'millesime' ? showVal('millesime', v) : v)}<button data-unlure="${k}|${esc(v)}">✕</button></span>`).join('')}</div>
        <div class="row-btns"><button class="btn ghost sm" data-lure="${k}">＋ Choisir</button><button class="btn ghost sm" data-suggest="${k}">✨ Suggérer</button>${have.length ? `<button class="btn ghost sm" data-clear="${k}">Vider</button>` : ''}</div>
      </section>`;
    };
    view(`${topbar(`Vin ${idx + 1}`, { back: 'wines', backParams: { mode, code } })}
      <section class="card">
        <label class="lbl">Type</label>
        <div class="seg colors" data-color>${Object.entries(COLORS).map(([k, l]) => `<button data-v="${k}" class="${w.couleur === k ? 'on' : ''}"><i class="cdot c-${k}"></i>${l.split(' ')[0]}</button>`).join('')}</div>
        <label class="lbl">Appellation</label>
        <button class="field ${w.appellation ? 'filled' : ''}" data-pick="app"><span>${esc(w.appellation || 'Rechercher une appellation')}</span><i>›</i></button>
        <label class="lbl">Région</label>
        <button class="field ${w.region ? 'filled' : ''}" data-pick="region"><span>${esc(w.region || 'Choisir une région')}</span><i>›</i></button>
        <label class="lbl">Cépage(s) ${w.cepages.length > 1 ? '<span class="tag">Assemblage</span>' : ''}</label>
        <div class="chips">${w.cepages.map(c => `<span class="chip on">${esc(c)}<button data-rmg="${esc(c)}">✕</button></span>`).join('')}</div>
        ${suggestions.length ? `<div class="chips sugg"><small>Autorisés ici :</small>${suggestions.slice(0, 10).map(c => `<button class="chip ghost" data-addg="${esc(c)}">＋ ${esc(c)}</button>`).join('')}</div>` : ''}
        <button class="field add" data-pick="grape">＋ Ajouter un cépage</button>
        <div class="grid2 mt">
          <div><label class="lbl">Millésime</label><input class="inp" data-f="millesime" type="number" inputmode="numeric" min="1900" max="${year}" placeholder="${year - 3}" value="${w.millesime === 'NM' || w.millesime == null ? '' : w.millesime}" ${w.millesime === 'NM' ? 'disabled' : ''}>
            <label class="check"><input type="checkbox" data-nm ${w.millesime === 'NM' ? 'checked' : ''}> Non millésimé</label></div>
          <div><label class="lbl">Prix (€)</label><input class="inp" data-f="prix" type="number" inputmode="decimal" min="0" step="0.5" placeholder="${s.crit.prix.on ? 'requis' : 'facultatif'}" value="${w.prix ?? ''}">
            <label class="lbl">Degré (% vol.)</label><input class="inp" data-f="alcool" type="number" inputmode="decimal" min="0" max="25" step="0.5" placeholder="${s.crit.alcool.on ? 'requis' : 'facultatif'}" value="${w.alcool ?? ''}"></div>
        </div>
      </section>
      ${QCM_KEYS.map(lureCard).join('')}
      <section class="card">
        <h3 class="h-sm">Pour la révélation <span class="muted small">· facultatif</span></h3>
        <label class="lbl">Producteur</label><input class="inp" data-f="producteur" value="${esc(w.producteur)}" placeholder="Domaine, château…">
        <label class="lbl">Cuvée</label><input class="inp" data-f="cuvee" value="${esc(w.cuvee)}" placeholder="Nom de la cuvée">
        <label class="lbl">Commentaire</label><textarea class="inp" data-f="commentaire" rows="3" placeholder="Anecdote, accord, élevage…">${esc(w.commentaire)}</textarea>
        <label class="lbl">Photo de l’étiquette</label>
        ${w.photo ? `<div class="photo-prev"><img src="${w.photo}" alt=""><button class="btn ghost sm" data-rmphoto>Supprimer</button></div>` : ''}
        <label class="btn ghost block file-btn">📷 ${w.photo ? 'Remplacer la photo' : 'Photographier l’étiquette'}<input type="file" accept="image/*" data-photo hidden></label>
      </section>
      <div class="sticky-foot"><button class="btn primary block lg" data-save>Enregistrer le vin</button></div>`);
    scrollTo(0, y);
  };
  const handler = async e => {
    const t = e.target;
    const c = t.closest('[data-color] button');
    if (c) { haptic(); w.couleur = c.dataset.v; save(); return render(); }
    const p = t.closest('[data-pick]');
    if (p) {
      const k = p.dataset.pick;
      if (k === 'app') openPicker({ title: 'Appellation', kind: 'app', allowCustom: true, onDone: v => {
        const a = findApp(v);
        w.appellation = a?.n || v;
        if (a) { w.region = a.r; if (a.c.length === 1) w.couleur = a.c; if (!w.cepages.length && a.g.length === 1) w.cepages = [a.g[0]]; }
        w.lures.appellation = (w.lures.appellation || []).filter(x => norm(x) !== norm(w.appellation));
        save(); render();
      } });
      if (k === 'region') openPicker({ title: 'Région', kind: 'region', onDone: v => { w.region = v; save(); render(); } });
      if (k === 'grape') openPicker({ title: 'Cépages du vin', kind: 'grape', multi: true, selected: w.cepages, allowCustom: true, onDone: v => { w.cepages = uniq(v.map(canonGrape)); w.lures.cepages = w.lures.cepages.filter(x => !w.cepages.includes(x)); save(); render(); } });
      return;
    }
    const ag = t.closest('[data-addg]'); if (ag) { haptic(); w.cepages.push(ag.dataset.addg); w.lures.cepages = w.lures.cepages.filter(x => x !== ag.dataset.addg); save(); return render(); }
    const rg = t.closest('[data-rmg]'); if (rg) { w.cepages = w.cepages.filter(x => x !== rg.dataset.rmg); save(); return render(); }
    const lu = t.closest('[data-lure]');
    if (lu) {
      const k = lu.dataset.lure, need = s.choices - 1;
      const truth = k === 'cepages' ? w.cepages : [String(w[k] ?? '')];
      if (k === 'millesime') return pickYears(w, need, () => { save(); render(); });
      openPicker({ title: `Leurres · ${CRITS[k].label} (${need})`, kind: k === 'cepages' ? 'grape' : k === 'region' ? 'region' : 'app', multi: true, selected: w.lures[k], exclude: truth, allowCustom: k !== 'region',
        onDone: v => { w.lures[k] = v.slice(0, Math.max(need, v.length)); if (v.length > need) toast(`${v.length} leurres : seuls les ${need} premiers seront proposés`); save(); render(); } });
      return;
    }
    const sg = t.closest('[data-suggest]');
    if (sg) {
      const k = sg.dataset.suggest;
      if (k !== 'region' && k !== 'millesime' && !w.appellation && !w.region) return toast('Renseignez d’abord l’appellation', 'err');
      if (k === 'millesime' && (w.millesime == null || w.millesime === '')) return toast('Renseignez d’abord le millésime', 'err');
      haptic(); w.lures[k] = suggestLures(k, w, s.choices - 1); save(); return render();
    }
    const cl = t.closest('[data-clear]'); if (cl) { w.lures[cl.dataset.clear] = []; save(); return render(); }
    const ul = t.closest('[data-unlure]'); if (ul) { const [k, v] = ul.dataset.unlure.split('|'); w.lures[k] = w.lures[k].filter(x => String(x) !== v); save(); return render(); }
    if (t.closest('[data-rmphoto]')) { w.photo = null; photoChanged = true; save(); return render(); }
    if (t.closest('[data-save]')) {
      save();
      if (code) await pushSecret(code, d, photoChanged ? idx : null);
      const iss = wineIssues(w, s);
      if (iss.length) toast('Enregistré · il manque : ' + iss.join(', '));
      else { haptic(true); toast('Vin enregistré ✓', 'ok'); }
      go('wines', { mode, code });
    }
  };
  const onInput = e => {
    const f = e.target.dataset.f;
    if (f) {
      const v = e.target.value;
      if (f === 'millesime') w.millesime = v ? Math.round(+v) : null;
      else if (f === 'prix' || f === 'alcool') w[f] = v === '' ? null : +String(v).replace(',', '.');
      else w[f] = v;
      save();
    }
    if ('nm' in e.target.dataset) { w.millesime = e.target.checked ? 'NM' : null; w.lures.millesime = []; save(); render(); }
  };
  const onChange = async e => {
    if (!('photo' in e.target.dataset) || !e.target.files[0]) return;
    try { w.photo = await compressImage(e.target.files[0]); photoChanged = true; if (!save()) w.photo = null; render(); }
    catch { toast('Photo illisible', 'err'); }
  };
  root.addEventListener('click', handler); root.addEventListener('input', onInput); root.addEventListener('change', onChange);
  onCleanup(() => { root.removeEventListener('click', handler); root.removeEventListener('input', onInput); root.removeEventListener('change', onChange); });
  render();
};

function pickYears(w, need, done) {
  const t = Number(w.millesime) || new Date().getFullYear() - 3;
  const thisYear = new Date().getFullYear();
  const years = []; for (let y = Math.min(thisYear, t + 8); y >= t - 12; y--) if (y !== t) years.push(y);
  const sel = new Set(w.lures.millesime.map(String));
  sheet(`Leurres · Millésime (${need})`, (b, close) => {
    const paint = () => {
      b.innerHTML = `<div class="year-grid">${w.millesime !== 'NM' ? `<button data-y="NM" class="${sel.has('NM') ? 'on' : ''}">Non millésimé</button>` : ''}${years.map(y => `<button data-y="${y}" class="${sel.has(String(y)) ? 'on' : ''}">${y}</button>`).join('')}</div>
        <div class="sheet-foot"><button class="btn primary block" data-ok>Valider (${sel.size}/${need})</button></div>`;
    };
    paint();
    b.onclick = e => {
      const y = e.target.closest('[data-y]');
      if (y) { haptic(); const v = y.dataset.y; sel.has(v) ? sel.delete(v) : sel.add(v); return paint(); }
      if (e.target.closest('[data-ok]')) { w.lures.millesime = [...sel].map(v => v === 'NM' ? 'NM' : +v); close(); done(); }
    };
  }, { full: true });
}

// ---------------------------------------------------------------------
//  MAÎTRE DU JEU
// ---------------------------------------------------------------------
SCREENS.host = async ({ code }) => {
  view(`<div class="loading">${glassSVG('pour')}</div>`);
  let d = getDraft({ code });
  if (!d) {
    const sec = await S.be.getSecret(code);
    if (sec) { d = { settings: sec.settings, wines: sec.wines }; setDraft({ code }, d); }
  }
  if (!d) { toast('Données du maître du jeu introuvables sur cet appareil', 'err'); session.clear(); return go('home'); }
  const s = d.settings;
  let g = null, players = [], answers = [], ansIdx = null, unAns = null, busy = false, showSol = false, lastKey = '', rvCache = null;
  keepAwake(true);
  const vis = () => document.visibilityState === 'visible' && keepAwake(true);
  document.addEventListener('visibilitychange', vis);
  onCleanup(() => keepAwake(false), () => document.removeEventListener('visibilitychange', vis), () => unAns && unAns());

  const syncAnswers = () => {
    const need = g && (g.phase === 'answering' || g.phase === 'closed') ? g.current : null;
    if (need === ansIdx) return;
    unAns && unAns(); unAns = null; answers = []; ansIdx = need;
    if (need != null) unAns = S.be.watchAnswers(code, need, x => { answers = x; render(); });
  };
  onCleanup(S.be.watchGame(code, x => {
    if (!x) { toast('Partie introuvable', 'err'); session.clear(); return go('home'); }
    g = x; syncAnswers();
    const key = g.phase + g.current; if (key !== lastKey) { lastKey = key; showSol = false; scrollTo(0, 0); }
    render();
  }));
  onCleanup(S.be.watchPlayers(code, x => { players = x.sort((a, b) => a.joinedAt - b.joinedAt); render(); }));

  const tick = setInterval(() => {
    if (!g) return;
    const el = $('.timer');
    if (el && g.deadline) { const r = Math.max(0, Math.round((g.deadline - Date.now()) / 1000)); el.textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; el.classList.toggle('urgent', r <= 15); }
    if (g.phase === 'answering' && g.deadline && Date.now() > g.deadline + 2500 && !busy) setPhase('closed');
  }, 500);
  onCleanup(() => clearInterval(tick));

  const setPhase = async p => { busy = true; try { await S.be.updateGame(code, { phase: p }); } finally { busy = false; } };
  const joinUrl = () => location.origin + location.pathname + '?code=' + code;
  const menu = `<button class="icon-btn" data-menu aria-label="Menu">⋯</button>`;

  async function startWine(i) {
    const w = d.wines[i];
    const iss = wineIssues(w, s);
    if (iss.length) { toast('Vin ' + (i + 1) + ' incomplet : ' + iss.join(', '), 'err'); return go('wineEdit', { mode: 'host', code, idx: i }); }
    if (!players.length && !await confirmBox('Aucun joueur n’a encore rejoint. Servir quand même ?', { ok: 'Servir' })) return;
    busy = true; haptic(true);
    try { await S.be.updateGame(code, { phase: 'answering', current: i, options: buildOptions(w, s), deadline: s.timer ? Date.now() + s.timer * 1000 : null, startedAt: Date.now() }); }
    catch (e) { toast('Erreur réseau', 'err'); }
    busy = false;
  }
  async function reveal() {
    if (busy) return; busy = true;
    try {
      const i = g.current, w = d.wines[i], sol = publicWine(w);
      const list = await S.be.getAnswers(code, i);
      const scores = JSON.parse(JSON.stringify(g.scores || {}));
      const results = {};
      const uids = uniq([...players.map(p => p.id), ...list.map(a => a.uid)]);
      for (const uid of uids) {
        const a = list.find(x => x.uid === uid);
        const p = players.find(x => x.id === uid) || { name: a?.name || 'Joueur', avatar: a?.avatar || '🍷' };
        const r = a ? scoreWine(sol, a, s) : { pts: 0, max: wineMax(s), b: {} };
        const compact = a ? { cepages: a.cepages || [], region: a.region || '', appellation: a.appellation || '', millesime: a.millesime ?? null, prix: a.prix ?? null, alcool: a.alcool ?? null, plaisir: a.plaisir ?? null } : null;
        results[uid] = { name: p.name, avatar: p.avatar, pts: r.pts, max: r.max, b: r.b, a: compact };
        const prev = scores[uid] || { perWine: {} };
        prev.name = p.name; prev.avatar = p.avatar;
        prev.perWine = { ...(prev.perWine || {}), [i]: { pts: r.pts, max: r.max, b: r.b, a: compact } };
        prev.total = Object.values(prev.perWine).reduce((t, x) => t + x.pts, 0);
        scores[uid] = prev;
      }
      const pl = list.map(a => a.plaisir).filter(x => x != null);
      const plaisirAvg = pl.length ? Math.round(10 * pl.reduce((a, b) => a + b, 0) / pl.length) / 10 : null;
      let photo = w.photo || null;
      if (!photo && w.hasPhoto) photo = await S.be.getPhoto(code, i);
      await S.be.setReveal(code, i, { idx: i, wine: sol, photo, results, plaisirAvg });
      await S.be.updateGame(code, { phase: 'reveal', scores, revealed: { ...(g.revealed || {}), [i]: { ...sol, plaisirAvg } } });
      haptic(true);
    } catch (e) { console.error(e); toast('Erreur lors de la révélation : ' + e.message, 'err'); }
    busy = false;
  }
  async function finish() {
    busy = true;
    const idxs = Object.keys(g.revealed || {}).map(Number).sort((a, b) => a - b);
    const wines = idxs.map(i => g.revealed[i]);
    await S.be.updateGame(code, { phase: 'finished', finishedAt: Date.now(), playerUids: uniq([...Object.keys(g.scores || {}), ...players.map(p => p.id)]), summary: { wines, played: wines.length, idxs } });
    busy = false;
  }

  function render() {
    if (!g) return;
    const ph = g.phase, i = g.current;
    if (ph === 'lobby') {
      view(`${topbar('Salon', { right: menu })}
        <section class="card code-card">
          <small>Code de la partie</small>
          <div class="big-code">${code.split('').map(c => `<span>${c}</span>`).join('')}</div>
          <img class="qr" alt="QR code" src="https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=0&color=241418&bgcolor=F4ECE6&data=${encodeURIComponent(joinUrl())}">
          <div class="row-btns center"><button class="btn ghost sm" data-share>Partager le lien</button></div>
        </section>
        <section class="card"><div class="q-head"><h3>Joueurs</h3><span class="count">${players.length}/${MAX_PLAYERS}</span></div>
          ${players.length ? `<div class="players">${players.map(p => `<button class="player" data-kick="${p.id}"><span class="av">${esc(p.avatar)}</span>${esc(p.name)}</button>`).join('')}</div><p class="muted small">Touchez un joueur pour le retirer.</p>` : `<p class="muted waiting-dots">En attente des joueurs</p>`}
        </section>
        <section class="card"><div class="q-head"><h3>${esc(g.name)}</h3><button class="btn ghost sm" data-edit>Modifier les vins</button></div>
          <p class="muted small">${s.wineCount} vin${s.wineCount > 1 ? 's' : ''} · ${PRESETS[s.difficulty]?.label || 'Personnalisé'} · ${activeCrits(s).map(k => CRITS[k].label).join(', ')}${s.timer ? ' · chrono ' + s.timer / 60 + ' min' : ''}</p>
          <p class="small">${d.wines.filter(w => !wineIssues(w, s).length).length}/${s.wineCount} vins prêts</p></section>
        <div class="sticky-foot"><button class="btn primary block lg" data-start="0">Servir le vin 1</button></div>`);
    } else if (ph === 'answering' || ph === 'closed') {
      const w = d.wines[i];
      const answered = new Set(answers.map(a => a.uid));
      const n = players.length, k = players.filter(p => answered.has(p.id)).length;
      const R = 52, C = 2 * Math.PI * R;
      view(`${topbar(`Vin ${i + 1} / ${s.wineCount}`, { right: menu })}
        <div class="wine-head"><span class="eyebrow">${ph === 'closed' ? 'Réponses closes' : 'Dégustation en cours'}</span>${g.deadline ? `<div class="timer"></div>` : ''}</div>
        <section class="card progress-card">
          <svg viewBox="0 0 120 120" class="ring"><circle cx="60" cy="60" r="${R}" class="ring-bg"/><circle cx="60" cy="60" r="${R}" class="ring-fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - (n ? k / n : 0))}"/></svg>
          <div class="ring-txt"><b>${k}<small>/${n}</small></b><span>ont répondu</span></div>
        </section>
        <section class="card"><div class="players">${players.map(p => `<span class="player ${answered.has(p.id) ? 'done' : ''}"><span class="av">${esc(p.avatar)}</span>${esc(p.name)}<i>${answered.has(p.id) ? '✓' : '…'}</i></span>`).join('')}</div></section>
        <section class="card sol ${showSol ? 'open' : ''}">
          <button class="sol-toggle" data-sol>${showSol ? 'Masquer la solution' : 'Afficher la solution (discrètement)'}</button>
          ${showSol ? `<div class="sol-body"><b>${esc(w.appellation)}</b> · ${esc(w.region)} · ${esc(showVal('millesime', w.millesime))}<br>${esc(w.cepages.join(', '))}${w.producteur ? '<br>' + esc(w.producteur) : ''}</div>` : ''}
        </section>
        <div class="sticky-foot two">${ph === 'answering' ? `<button class="btn ghost lg" data-close>Clore</button>` : ''}<button class="btn primary lg" data-reveal>Révéler${k < n && ph === 'answering' ? ` (${k}/${n})` : ''}</button></div>`);
    } else if (ph === 'reveal') {
      const last = i >= s.wineCount - 1;
      (rvCache?.idx === i ? Promise.resolve(rvCache) : S.be.getReveal(code, i)).then(rv => {
        if (!rv || g.phase !== 'reveal' || g.current !== i) return;
        rvCache = rv;
        const rows = Object.entries(rv.results || {}).sort((a, b) => b[1].pts - a[1].pts);
        view(`${topbar(`Vin ${i + 1} / ${s.wineCount}`, { right: menu })}
          <div class="reveal">${wineCard(rv.wine, rv.photo, { s })}
          <section class="card"><h3 class="h-sm">Résultats du vin</h3>
            <div class="host-res">${rows.map(([uid, r]) => `<details class="hr"><summary><span class="av">${esc(r.avatar)}</span><span class="hr-n">${esc(r.name)}</span><span class="hr-icons">${activeCrits(s).map(k2 => `<i class="${r.b?.[k2]?.st || 'none'}"></i>`).join('')}</span><b>${fmt(r.pts)}</b></summary>${resultRows(r.a ? r : null, s)}</details>`).join('') || '<p class="muted">Aucune réponse.</p>'}</div>
            ${rv.plaisirAvg != null ? `<p class="muted small">Plaisir moyen : <b>${fmt(rv.plaisirAvg)}/10</b></p>` : ''}
          </section>
          <section class="card"><h3 class="h-sm">Classement général</h3>${leaderboard(g.scores, { perWineIdx: i })}</section></div>
          <div class="sticky-foot"><button class="btn primary block lg" data-${last ? 'finish' : 'next'}>${last ? 'Terminer · voir le podium' : `Servir le vin ${i + 2}`}</button></div>`);
          bindZoom(root);
      });
    } else if (ph === 'finished') {
      const el = view(`${topbar('Fin de partie')}<div data-final></div>`);
      finalView($('[data-final]', el), { game: g, me: S.uid, actions: `<div class="stack mt"><button class="btn ghost block" data-go="gameDetail" data-params='${JSON.stringify({ code })}'>Détail vin par vin</button><button class="btn primary block" data-home>Retour à l’accueil</button></div>` });
    }
  }

  const handler = async e => {
    const t = e.target;
    if (t.closest('[data-share]')) {
      const url = joinUrl();
      if (navigator.share) navigator.share({ title: APP_NAME, text: `Rejoins la dégustation « ${g.name} » — code ${code}`, url }).catch(() => { });
      else { navigator.clipboard?.writeText(url); toast('Lien copié'); }
    }
    const kk = t.closest('[data-kick]');
    if (kk) { const p = players.find(x => x.id === kk.dataset.kick); if (p && await confirmBox(`Retirer ${p.name} de la partie ?`, { ok: 'Retirer', danger: true })) S.be.leave(code, p.id); }
    if (t.closest('[data-edit]')) go('wines', { mode: 'host', code });
    const st = t.closest('[data-start]'); if (st) startWine(+st.dataset.start);
    if (t.closest('[data-sol]')) { showSol = !showSol; render(); }
    if (t.closest('[data-close]')) setPhase('closed');
    if (t.closest('[data-reveal]')) {
      const n = players.length, k = new Set(answers.map(a => a.uid)).size;
      if (g.phase === 'answering' && k < n && !await confirmBox(`${n - k} joueur${n - k > 1 ? 's n’ont' : ' n’a'} pas encore répondu. Révéler quand même ?`, { ok: 'Révéler' })) return;
      reveal();
    }
    if (t.closest('[data-next]')) startWine(g.current + 1);
    if (t.closest('[data-finish]')) finish();
    if (t.closest('[data-home]')) { session.clear(); go('home'); }
    if (t.closest('[data-menu]')) {
      sheet('Partie ' + code, (b, close) => {
        b.innerHTML = `<div class="menu-list">
          <button data-m="wines">🍷 Modifier les vins à venir</button>
          <button data-m="share">🔗 Partager le code</button>
          ${g.phase !== 'lobby' && Object.keys(g.revealed || {}).length ? '<button data-m="finish">🏁 Terminer maintenant (podium)</button>' : ''}
          <button data-m="leave">🏠 Retour à l’accueil (la partie continue)</button>
          <button data-m="abort" class="danger">✕ Abandonner la partie</button></div>`;
        b.onclick = async ev => {
          const m = ev.target.closest('[data-m]')?.dataset.m; if (!m) return;
          close();
          if (m === 'wines') go('wines', { mode: 'host', code });
          if (m === 'share') root.querySelector('[data-share]') ? root.querySelector('[data-share]').click() : (navigator.share ? navigator.share({ url: joinUrl() }).catch(() => { }) : toast(code));
          if (m === 'finish' && await confirmBox('Terminer la partie maintenant ?', { ok: 'Terminer' })) finish();
          if (m === 'leave') go('home');
          if (m === 'abort' && await confirmBox('Abandonner définitivement cette partie ?', { ok: 'Abandonner', danger: true })) { await S.be.updateGame(code, { phase: 'finished', aborted: true, finishedAt: Date.now(), summary: { wines: [], played: 0 } }); session.clear(); go('home'); }
        };
      });
    }
  };
  root.addEventListener('click', handler); onCleanup(() => root.removeEventListener('click', handler));
};

// ---------------------------------------------------------------------
//  JOUEUR
// ---------------------------------------------------------------------
SCREENS.play = async ({ code }) => {
  view(`<div class="loading">${glassSVG('pour')}</div>`);
  let g = null, players = [], key = '', form = null, unRev = null, wasIn = false, leaving = false;
  keepAwake(true);
  const vis = () => document.visibilityState === 'visible' && keepAwake(true);
  document.addEventListener('visibilitychange', vis);
  onCleanup(() => keepAwake(false), () => document.removeEventListener('visibilitychange', vis), () => form && form.destroy(), () => unRev && unRev());
  const menu = `<button class="icon-btn" data-menu aria-label="Menu">⋯</button>`;
  const ansKey = i => `vn_ans_${code}_${i}`, subKey = i => `vn_sub_${code}_${i}`;

  onCleanup(S.be.watchGame(code, x => {
    if (!x) { session.clear(); toast('Partie introuvable', 'err'); return go('home'); }
    g = x;
    const k = g.phase + ':' + g.current;
    if (k !== key) { key = k; renderPhase(); }
    else if (g.phase === 'lobby') renderLobbyPlayers();
  }));
  onCleanup(S.be.watchPlayers(code, x => {
    players = x.sort((a, b) => a.joinedAt - b.joinedAt);
    const isIn = players.some(p => p.id === S.uid);
    if (isIn) wasIn = true;
    if (wasIn && !isIn && !leaving && g?.phase !== 'finished') { session.clear(); toast('Vous avez été retiré de la partie', 'err'); return go('home'); }
    if (g?.phase === 'lobby') renderLobbyPlayers();
  }));

  const renderLobbyPlayers = () => { const el = $('[data-plist]'); if (el) el.innerHTML = players.map(p => `<span class="player ${p.id === S.uid ? 'me' : ''}"><span class="av">${esc(p.avatar)}</span>${esc(p.name)}</span>`).join(''); };

  function renderPhase() {
    scrollTo(0, 0);
    form && form.destroy(); form = null; unRev && unRev(); unRev = null;
    const ph = g.phase, i = g.current, s = g.settings;
    if (ph === 'lobby') {
      view(`${topbar(g.name, { right: menu })}
        <div class="lobby">${glassSVG('pour slow')}
          <h2 class="title center">Bienvenue ${esc(S.profile.name)}</h2>
          <p class="muted center">${esc(g.hostName || 'Le maître du jeu')} prépare les verres.<br>La partie va bientôt commencer.</p>
          <section class="card"><div class="q-head"><h3>À table</h3><span class="count">code ${esc(code)}</span></div><div class="players" data-plist></div></section>
          <p class="muted small center">${s.wineCount} vin${s.wineCount > 1 ? 's' : ''} · ${PRESETS[s.difficulty]?.label || 'Personnalisé'} · ${activeCrits(s).map(k => CRITS[k].label).join(', ')}</p>
        </div>`);
      renderLobbyPlayers();
    } else if (ph === 'answering') {
      if (store.get(subKey(i))) return submittedView();
      showForm();
    } else if (ph === 'closed') {
      const sub = store.get(subKey(i));
      view(`${topbar(`Vin ${i + 1} / ${s.wineCount}`, { right: menu })}<div class="waiting">${glassSVG('pour slow')}<h2 class="title center">${sub ? 'Réponses closes' : 'Temps écoulé'}</h2><p class="muted center">Révélation imminente…</p></div>`);
    } else if (ph === 'reveal') {
      view(`${topbar(`Vin ${i + 1} / ${s.wineCount}`, { right: menu })}<div class="waiting">${glassSVG('pour')}<p class="muted center">Révélation…</p></div>`);
      unRev = S.be.watchReveal(code, i, rv => {
        if (!rv) return;
        const el = view(`${topbar(`Vin ${i + 1} / ${s.wineCount}`, { right: menu })}<div data-r></div>`);
        playerReveal($('[data-r]', el), { wine: rv.wine, photo: rv.photo, res: rv.results?.[S.uid], s, idx: i, total: s.wineCount, scores: g.scores, me: S.uid,
          footer: `<p class="muted center waiting-dots">${i >= s.wineCount - 1 ? 'Le podium arrive' : 'Prochain vin dans un instant'}</p>` });
      });
    } else if (ph === 'finished') {
      session.clear();
      if (g.aborted) { toast('La partie a été annulée'); return go('home'); }
      const el = view(`${topbar('Fin de partie')}<div data-final></div>`);
      finalView($('[data-final]', el), { game: g, me: S.uid, actions: `<div class="stack mt"><button class="btn ghost block" data-go="gameDetail" data-params='${JSON.stringify({ code })}'>Détail vin par vin</button><button class="btn primary block" data-go="home">Retour à l’accueil</button></div>` });
    }
  }

  function showForm() {
    const i = g.current, s = g.settings;
    const el = view(`${topbar(g.name, { right: menu })}<div data-form></div>`);
    form = answerForm($('[data-form]', el), {
      s, opts: g.options || {}, idx: i, total: s.wineCount, deadline: g.deadline, ans: store.get(ansKey(i)),
      onChange: a => store.set(ansKey(i), a),
      onSubmit: async (a, auto) => {
        try {
          await S.be.submitAnswer(code, i, S.uid, { ...a, name: S.profile.name, avatar: S.profile.avatar, at: Date.now() });
          store.set(subKey(i), 1);
          if (auto) toast('Temps écoulé : réponse envoyée');
          if (g.phase === 'answering' && g.current === i) submittedView();
        } catch (e) { toast(g.phase !== 'answering' ? 'Les réponses sont closes' : 'Envoi impossible, réessayez', 'err'); }
      },
    });
  }
  function submittedView() {
    form && form.destroy(); form = null;
    const i = g.current, s = g.settings, a = store.get(ansKey(i)) || {};
    view(`${topbar(`Vin ${i + 1} / ${s.wineCount}`, { right: menu })}
      <div class="submitted"><div class="check-anim">✓</div><h2 class="title center">Réponse envoyée</h2>
      <p class="muted center">En attente de la révélation par le maître du jeu.</p>
      <section class="card"><div class="res-rows">${activeCrits(s).map(k => `<div class="res-row"><div class="rr-t"><small>${CRITS[k].label}</small><span>${esc(showVal(k, a[k]))}</span></div></div>`).join('')}
        ${a.plaisir != null ? `<div class="res-row"><div class="rr-t"><small>Plaisir</small><span>${a.plaisir}/10</span></div></div>` : ''}</div></section>
      <button class="btn ghost block" data-edit-ans>Modifier ma réponse</button></div>`);
    $('[data-edit-ans]').onclick = () => { if (g.phase !== 'answering') return toast('Les réponses sont closes', 'err'); store.del(subKey(i)); showForm(); };
  }

  const handler = async e => {
    if (!e.target.closest('[data-menu]')) return;
    sheet('Partie ' + code, (b, close) => {
      b.innerHTML = `<div class="menu-list"><button data-m="home">🏠 Accueil (je reviens)</button><button data-m="quit" class="danger">✕ Quitter la partie</button></div>`;
      b.onclick = async ev => {
        const m = ev.target.closest('[data-m]')?.dataset.m; if (!m) return; close();
        if (m === 'home') go('home');
        if (m === 'quit' && await confirmBox('Quitter définitivement la partie ?', { ok: 'Quitter', danger: true })) { leaving = true; await S.be.leave(code, S.uid).catch(() => { }); session.clear(); go('home'); }
      };
    });
  };
  root.addEventListener('click', handler); onCleanup(() => root.removeEventListener('click', handler));
};

// ---------------------------------------------------------------------
//  SOLO
// ---------------------------------------------------------------------
SCREENS.solo = () => {
  const best = store.get('vn_quiz_best', null);
  view(`${topbar('Entraînement solo')}
    <div class="stack">
      <button class="card mode-card" data-go="setup" data-params='{"mode":"solo"}'><span class="mc-ico">🍷</span><div><b>Dégustation solo</b><p>Un proche saisit les vins (et leurres) à l’abri de vos regards, vous dégustez, l’app révèle et note.</p></div><i>›</i></button>
      <button class="card mode-card" data-go="quiz"><span class="mc-ico">🎓</span><div><b>Quiz des appellations</b><p>10 questions sur les régions, appellations et cépages français.${best != null ? ` Record : ${best}/10.` : ''}</p></div><i>›</i></button>
    </div>`);
};

SCREENS.soloPlay = () => {
  const d = getDraft({ mode: 'solo' });
  const run = store.get('vn_solo_run');
  if (!d || !run) return go('solo');
  const s = d.settings, i = run.i, w = d.wines[i];
  const sol = publicWine(w);
  const scores = () => ({ [S.uid]: { name: S.profile.name || 'Moi', avatar: S.profile.avatar, total: Object.values(run.results).reduce((t, r) => t + r.pts, 0), perWine: run.results } });
  if (run.results[i]) return showReveal();
  run.opts ||= {};
  if (!run.opts[i]) run.opts[i] = buildOptions(w, s);
  if (s.timer && !run.deadline) run.deadline = Date.now() + s.timer * 1000;
  store.set('vn_solo_run', run);
  const el = view(`${topbar(s.name || 'Dégustation solo', { back: 'solo' })}<div data-form></div>`);
  const f = answerForm($('[data-form]', el), {
    s, opts: run.opts[i], idx: i, total: s.wineCount, deadline: run.deadline, ans: run.ans,
    onChange: a => { run.ans = a; store.set('vn_solo_run', run); },
    onSubmit: a => {
      const r = scoreWine(sol, a, s);
      run.results[i] = { pts: r.pts, max: r.max, b: r.b, a: { cepages: a.cepages, region: a.region, appellation: a.appellation, millesime: a.millesime, prix: a.prix, alcool: a.alcool, plaisir: a.plaisir } };
      run.ans = null; run.deadline = null;
      store.set('vn_solo_run', run);
      showReveal();
    },
  });
  onCleanup(() => f.destroy());
  function showReveal() {
    const last = i >= s.wineCount - 1;
    const el2 = view(`${topbar(s.name || 'Dégustation solo', { back: 'solo' })}<div data-r></div>`);
    playerReveal($('[data-r]', el2), { wine: sol, photo: w.photo, res: run.results[i], s, idx: i, total: s.wineCount, scores: scores(), me: S.uid,
      footer: `<div class="sticky-foot"><button class="btn primary block lg" data-nextw>${last ? 'Voir le bilan' : `Vin suivant (${i + 2}/${s.wineCount})`}</button></div>` });
    $('[data-nextw]').onclick = () => {
      if (!last) { run.i++; store.set('vn_solo_run', run); return go('soloPlay'); }
      const wines = d.wines.map((x, j) => ({ ...publicWine(x), plaisirAvg: run.results[j]?.a?.plaisir ?? null }));
      const game = { id: 'S' + Date.now(), code: 'SOLO', solo: true, name: s.name || 'Dégustation solo', settings: s, phase: 'finished', createdAt: run.startedAt, finishedAt: Date.now(), hostUid: S.uid, scores: scores(), summary: { wines, played: wines.length } };
      const hist = store.get('vn_solo_history', []); hist.unshift(game); store.set('vn_solo_history', hist.slice(0, 60));
      store.del('vn_solo_run');
      go('gameFinal', { id: game.id });
    };
  }
};

SCREENS.gameFinal = ({ id }) => {
  const g = store.get('vn_solo_history', []).find(x => x.id === id);
  if (!g) return go('home');
  const el = view(`${topbar('Bilan', { back: 'solo' })}<div data-final></div>`);
  finalView($('[data-final]', el), { game: g, me: S.uid, actions: `<div class="stack mt"><button class="btn ghost block" data-go="gameDetail" data-params='${JSON.stringify({ id })}'>Détail vin par vin</button><button class="btn primary block" data-go="home">Accueil</button></div>` });
};

// ---- Quiz des appellations
SCREENS.quiz = () => {
  const pool = APPELLATIONS.filter(a => REGIONS_FR.includes(a.r) && a.r !== 'Vin de France' && !/^IGP|Grand Cru |Villages [A-Z]|\(/.test(a.n));
  const regions = REGIONS_FR.filter(r => r !== 'Vin de France');
  const grapesFr = uniq(pool.flatMap(a => a.g));
  const colorOf = n => GRAPES.find(g => g.n === n)?.c;
  const make = () => {
    const a = sample(pool, 1)[0], t = Math.random();
    if (t < .4) return { q: `Dans quelle région se trouve l’appellation <b>${esc(a.n)}</b> ?`, ok: a.r, opts: shuffle([a.r, ...sample(regions.filter(r => r !== a.r), 3)]), a };
    if (t < .75) { const g0 = a.g[0]; return { q: `Quel est le cépage principal de <b>${esc(a.n)}</b> ?`, ok: g0, opts: shuffle([g0, ...sample(grapesFr.filter(x => !a.g.includes(x) && colorOf(x) === colorOf(g0)), 3)]), a }; }
    const others = sample(pool.filter(x => x.r !== a.r), 3).map(x => x.n);
    return { q: `Quelle appellation se trouve en <b>${esc(a.r)}</b> ?`, ok: a.n, opts: shuffle([a.n, ...others]), a };
  };
  const qs = Array.from({ length: 10 }, make);
  let n = 0, score = 0;
  const render = () => {
    if (n >= 10) {
      const best = Math.max(score, store.get('vn_quiz_best', 0)); store.set('vn_quiz_best', best);
      view(`${topbar('Quiz', { back: 'solo' })}<div class="final"><h1 class="title center">${score}/10</h1><p class="muted center">${score >= 9 ? 'Sommelier confirmé !' : score >= 7 ? 'Très beau palais' : score >= 5 ? 'Bonne base, on continue' : 'Les vignobles n’attendent que vous'}</p><p class="center small">Record : ${best}/10</p>
        <div class="stack mt"><button class="btn primary block" data-go="quiz">Rejouer</button><button class="btn ghost block" data-go="solo">Retour</button></div></div>`);
      if (score >= 8) import('./ui.js').then(m => m.confetti());
      return;
    }
    const q = qs[n];
    view(`${topbar(`Question ${n + 1}/10`, { back: 'solo' })}
      <div class="quiz"><div class="quiz-bar"><span style="width:${n * 10}%"></span></div>
      <h2 class="quiz-q">${q.q}</h2>
      <div class="opts">${q.opts.map(o => `<button class="opt" data-o="${esc(o)}"><span>${esc(o)}</span></button>`).join('')}</div>
      <div class="quiz-exp" hidden></div></div>`);
    $('.opts').onclick = e => {
      const b = e.target.closest('[data-o]'); if (!b || $('.opts').classList.contains('done')) return;
      $('.opts').classList.add('done');
      const good = b.dataset.o === q.ok; if (good) score++;
      haptic(good);
      $$('.opt').forEach(x => { if (x.dataset.o === q.ok) x.classList.add('good'); else if (x === b) x.classList.add('bad'); });
      const ex = $('.quiz-exp'); ex.hidden = false;
      ex.innerHTML = `<p><b>${esc(q.a.n)}</b> · ${esc(q.a.r)}<br><small>${esc(q.a.g.join(', '))}</small></p><button class="btn primary block" data-nq>${n < 9 ? 'Question suivante' : 'Résultat'}</button>`;
      $('[data-nq]').onclick = () => { n++; render(); };
    };
  };
  render();
};

// ---------------------------------------------------------------------
//  HISTORIQUE, DÉTAIL, STATISTIQUES
// ---------------------------------------------------------------------
async function loadAllGames() {
  let online = [];
  try { online = await S.be.listMyGames(S.uid); } catch (e) { console.warn(e); }
  online = online.filter(g => g.phase === 'finished' && !g.aborted);
  const solo = store.get('vn_solo_history', []);
  return [...online, ...solo].sort((a, b) => (b.finishedAt || b.createdAt) - (a.finishedAt || a.createdAt));
}

SCREENS.history = async () => {
  view(`${topbar('Historique')}<div class="loading small">${glassSVG('pour')}</div>`);
  const games = await loadAllGames();
  if (S.screen !== 'history') return;
  view(`${topbar('Historique')}
    ${games.length ? `<div class="hist">${games.map(g => {
      const rk = rankOf(g.scores, S.uid), me = g.scores?.[S.uid];
      const max = wineMax(g.settings) * (g.summary?.played || 0);
      const host = g.hostUid === S.uid && !g.solo;
      const winner = Object.values(g.scores || {}).sort((a, b) => b.total - a.total)[0];
      return `<button class="card hist-item" data-go="gameDetail" data-params='${JSON.stringify(g.solo ? { id: g.id } : { code: g.code })}'>
        <span class="hi-ico">${g.solo ? '🎯' : host ? '🎩' : '🍷'}</span>
        <div><b>${esc(g.name)}</b><small>${dateFr(g.finishedAt || g.createdAt)} · ${g.summary?.played || 0} vin${(g.summary?.played || 0) > 1 ? 's' : ''} · ${g.solo ? 'Solo' : host ? 'Maître du jeu' : 'Joueur'}</small></div>
        <span class="hi-score">${me ? `${rk && rk.of > 1 ? `<b>${rk.rank}<sup>${rk.rank === 1 ? 'er' : 'e'}</sup></b>` : ''}<small>${pct(me.total, max)} %</small>` : winner ? `<small>🏆 ${esc(winner.name)}</small>` : ''}</span></button>`;
    }).join('')}</div>` : `<div class="empty">${glassSVG()}<p class="muted center">Aucune partie terminée pour l’instant.</p></div>`}`);
};

SCREENS.gameDetail = async ({ code, id }) => {
  view(`${topbar('Détail', { back: 'history' })}<div class="loading small">${glassSVG('pour')}</div>`);
  const g = id ? store.get('vn_solo_history', []).find(x => x.id === id) : await S.be.getGame(code);
  if (!g) return go('history');
  const s = g.settings, wines = g.summary?.wines || [], idxs = g.summary?.idxs || wines.map((_, i) => i);
  const players = Object.entries(g.scores || {}).sort((a, b) => b[1].total - a[1].total);
  const me = g.scores?.[S.uid];
  view(`${topbar(g.name, { back: 'history' })}
    <p class="muted center small">${dateFr(g.finishedAt || g.createdAt)} · ${PRESETS[s.difficulty]?.label || 'Personnalisé'} · ${players.length} joueur${players.length > 1 ? 's' : ''}</p>
    ${players.length > 1 ? `<section class="card"><h3 class="h-sm">Classement</h3>${leaderboard(g.scores, { me: S.uid })}</section>` : ''}
    ${wines.map((w, j) => {
      const i = idxs[j];
      const mine = me?.perWine?.[i];
      return `<details class="card wd" ${j === 0 ? 'open' : ''}><summary><span class="wi-n c-${w.couleur}">${i + 1}</span><span class="wi-t"><b>${esc(w.appellation)} ${esc(w.millesime && w.millesime !== 'NM' ? w.millesime : '')}</b><small>${esc([w.producteur, w.cuvee].filter(Boolean).join(' — ') || w.region)}</small></span>${mine ? `<b class="wd-pts">${fmt(mine.pts)}</b>` : ''}</summary>
        ${wineCard(w, null, { s })}
        ${mine ? `<h4 class="h-xs">Mes réponses</h4>${resultRows(mine, s)}` : ''}
        ${players.length > 1 ? `<h4 class="h-xs">Tous les joueurs</h4><ol class="lb">${players.map(([uid, p]) => ({ uid, p, r: p.perWine?.[i] })).sort((a, b) => (b.r?.pts || 0) - (a.r?.pts || 0)).map(x => `<li class="${x.uid === S.uid ? 'me' : ''}"><span class="lb-av">${esc(x.p.avatar)}</span><span class="lb-name">${esc(x.p.name)}<small>${esc(x.r?.a ? [x.r.a.appellation, showVal('millesime', x.r.a.millesime)].filter(v => v && v !== '—').join(' · ') : 'pas de réponse')}</small></span><b class="lb-pts">${fmt(x.r?.pts || 0)}</b></li>`).join('')}</ol>` : ''}
      </details>`;
    }).join('')}`);
};

SCREENS.stats = async () => {
  view(`${topbar('Statistiques')}<div class="loading small">${glassSVG('pour')}</div>`);
  const games = (await loadAllGames()).filter(g => g.scores?.[S.uid]).reverse();
  if (S.screen !== 'stats') return;
  if (!games.length) return view(`${topbar('Statistiques')}<div class="empty">${glassSVG()}<p class="muted center">Jouez une première partie pour voir vos statistiques.</p></div>`);
  let pts = 0, max = 0, nWines = 0, wins = 0;
  const crit = {}, grapes = {}, regions = {}, prog = [];
  for (const g of games) {
    const me = g.scores[S.uid], idxs = g.summary?.idxs || (g.summary?.wines || []).map((_, i) => i);
    let gp = 0, gm = 0;
    Object.entries(me.perWine || {}).forEach(([i, r]) => {
      nWines++; gp += r.pts; gm += r.max;
      Object.entries(r.b || {}).forEach(([k, b]) => { (crit[k] ||= { p: 0, m: 0 }); crit[k].p += b.pts; crit[k].m += b.max; });
      const w = g.summary?.wines?.[idxs.indexOf(+i)];
      if (w && r.a) {
        (w.cepages || []).forEach(c => { (grapes[c] ||= { seen: 0, ok: 0 }); grapes[c].seen++; if ((r.a.cepages || []).map(norm).includes(norm(c))) grapes[c].ok++; });
        if (w.region) { (regions[w.region] ||= { seen: 0, ok: 0 }); regions[w.region].seen++; if (r.b?.region?.st === 'ok' || r.b?.appellation?.st === 'ok') regions[w.region].ok++; }
      }
    });
    pts += gp; max += gm; prog.push(pct(gp, gm));
    const rk = rankOf(g.scores, S.uid); if (rk && rk.of > 1 && rk.rank === 1) wins++;
  }
  const bars = Object.keys(CRITS).filter(k => crit[k]?.m).map(k => `<div class="bar"><span>${CRITS[k].label}</span><div><i style="width:${pct(crit[k].p, crit[k].m)}%"></i></div><b>${pct(crit[k].p, crit[k].m)} %</b></div>`).join('');
  const gl = Object.entries(grapes).map(([n, v]) => ({ n, ...v, r: v.ok / v.seen }));
  const top = gl.filter(x => x.ok).sort((a, b) => b.r - a.r || b.seen - a.seen).slice(0, 6);
  const work = gl.filter(x => x.r < .5).sort((a, b) => b.seen - a.seen).slice(0, 6);
  const W = 300, H = 80, n = prog.length;
  const line = n > 1 ? prog.map((v, i) => `${(i / (n - 1) * W).toFixed(1)},${(H - v / 100 * H).toFixed(1)}`).join(' ') : '';
  view(`${topbar('Statistiques')}
    <div class="kpis"><div><b>${games.length}</b><small>parties</small></div><div><b>${nWines}</b><small>vins</small></div><div><b>${pct(pts, max)}%</b><small>réussite</small></div><div><b>${wins}</b><small>victoires</small></div></div>
    ${n > 1 ? `<section class="card"><h3 class="h-sm">Progression</h3><svg class="spark" viewBox="-4 -4 ${W + 8} ${H + 8}"><polyline points="${line}"/>${prog.map((v, i) => `<circle cx="${(i / (n - 1) * W).toFixed(1)}" cy="${(H - v / 100 * H).toFixed(1)}" r="3.5"/>`).join('')}</svg><p class="muted small">Score en % par partie, de la plus ancienne à la plus récente.</p></section>` : ''}
    <section class="card"><h3 class="h-sm">Réussite par critère</h3><div class="bars">${bars}</div></section>
    ${top.length ? `<section class="card"><h3 class="h-sm">Cépages les mieux reconnus</h3><div class="glist">${top.map(x => `<div><span>${esc(x.n)}</span><b>${x.ok}/${x.seen}</b></div>`).join('')}</div></section>` : ''}
    ${work.length ? `<section class="card"><h3 class="h-sm">Cépages à travailler</h3><div class="glist">${work.map(x => `<div><span>${esc(x.n)}</span><b>${x.ok}/${x.seen}</b></div>`).join('')}</div></section>` : ''}
    ${Object.keys(regions).length ? `<section class="card"><h3 class="h-sm">Régions</h3><div class="glist">${Object.entries(regions).sort((a, b) => b[1].seen - a[1].seen).map(([r, v]) => `<div><span>${esc(r)}</span><b>${v.ok}/${v.seen}</b></div>`).join('')}</div></section>` : ''}`);
};

// ---------------------------------------------------------------------
//  DÉMARRAGE
// ---------------------------------------------------------------------
(async function boot() {
  document.title = APP_NAME;
  root.innerHTML = `<div class="loading">${glassSVG('pour')}</div>`;
  try { S.be = await createBackend(); S.uid = S.be.uid; }
  catch (e) {
    root.innerHTML = `<main class="screen center-screen"><div class="empty">${glassSVG()}<h2 class="title center">Connexion impossible</h2><p class="muted center">Vérifiez votre connexion internet et la configuration Firebase.</p><button class="btn primary" onclick="location.reload()">Réessayer</button></div></main>`;
    return;
  }
  const code = new URLSearchParams(location.search).get('code');
  if (code) { history.replaceState(null, '', location.pathname); return go('join', { code: code.toUpperCase().slice(0, 4) }); }
  go('home');
})();
