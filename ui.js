// =====================================================================
//  Outils d'interface : rendu, toasts, feuilles, haptique, confettis…
// =====================================================================
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = n => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
export const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
export const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sample = (a, n) => shuffle(a).slice(0, n);
export const uniq = a => [...new Set(a)];
export const dateFr = ts => ts ? new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Mémoire du téléphone pleine (photos trop lourdes ?)', 'err'); return false; } },
  del(k) { localStorage.removeItem(k); },
};

// ---- Haptique : vibrate (Android) / astuce du switch (iOS 18+)
let hapticLabel;
export function haptic(strong) {
  try {
    if (navigator.vibrate) { navigator.vibrate(strong ? [12, 40, 18] : 8); return; }
    if (!hapticLabel) {
      hapticLabel = document.createElement('label');
      hapticLabel.ariaHidden = 'true';
      hapticLabel.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;overflow:hidden';
      const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', '');
      hapticLabel.appendChild(i); document.body.appendChild(hapticLabel);
    }
    hapticLabel.click();
  } catch { }
}

// ---- Toast
export function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
}

// ---- Feuille du bas (bottom sheet)
export function sheet(title, build, { onClose, full } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg"></div><div class="sheet ${full ? 'full' : ''}">
      <div class="sheet-grab"></div>
      <div class="sheet-head"><h3>${esc(title)}</h3><button class="icon-btn" data-x aria-label="Fermer">✕</button></div>
      <div class="sheet-body"></div></div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('noscroll');
  const close = () => {
    wrap.classList.remove('open');
    document.body.classList.remove('noscroll');
    setTimeout(() => wrap.remove(), 300);
    onClose && onClose();
  };
  wrap.querySelector('.sheet-bg').onclick = close;
  wrap.querySelector('[data-x]').onclick = close;
  build(wrap.querySelector('.sheet-body'), close);
  requestAnimationFrame(() => wrap.classList.add('open'));
  return close;
}

export function confirmBox(msg, { ok = 'Confirmer', cancel = 'Annuler', danger } = {}) {
  return new Promise(res => {
    const w = document.createElement('div');
    w.className = 'modal-wrap';
    w.innerHTML = `<div class="modal"><p>${esc(msg)}</p><div class="modal-actions">
      <button class="btn ghost" data-r="0">${esc(cancel)}</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" data-r="1">${esc(ok)}</button></div></div>`;
    document.body.appendChild(w);
    requestAnimationFrame(() => w.classList.add('open'));
    w.onclick = e => {
      const b = e.target.closest('[data-r]');
      if (!b && e.target !== w) return;
      w.classList.remove('open'); setTimeout(() => w.remove(), 250);
      res(b ? b.dataset.r === '1' : false);
    };
  });
}

// ---- Verrouillage de l'écran allumé pendant la partie
let wakeLock = null;
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.onrelease = () => { wakeLock = null; }; }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { }
}

// ---- Confettis dorés
export function confetti(duration = 2800) {
  const c = document.createElement('canvas');
  c.className = 'confetti';
  document.body.appendChild(c);
  const ctx = c.getContext('2d'), dpr = devicePixelRatio || 1;
  const W = c.width = innerWidth * dpr, H = c.height = innerHeight * dpr;
  const colors = ['#E9C987', '#C39A52', '#F4ECE6', '#A3244A', '#7B1E3A'];
  const P = Array.from({ length: 140 }, () => ({
    x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 14 * dpr, vy: (-Math.random() * 16 - 6) * dpr,
    s: (4 + Math.random() * 6) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: colors[Math.random() * colors.length | 0],
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, W, H);
    const k = (t - t0) / duration;
    P.forEach(p => {
      p.vy += .45 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    });
    if (k < 1) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

// ---- Compteur animé
export function countUp(el, to, ms = 900) {
  const t0 = performance.now();
  const step = t => {
    const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(to * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---- Compression photo (étiquette) -> dataURL JPEG ~100 Ko
export function compressImage(file, max = 900, q = .72) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

// ---- Visuel : verre de vin animé
export const glassSVG = (cls = '') => `
<svg class="glass ${cls}" viewBox="0 0 120 200" aria-hidden="true">
  <defs>
    <linearGradient id="wineG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B8294F"/><stop offset="1" stop-color="#4A0B1E"/></linearGradient>
    <linearGradient id="goldG" gradientUnits="userSpaceOnUse" x1="20" y1="10" x2="100" y2="180"><stop offset="0" stop-color="#F1D9A4"/><stop offset="1" stop-color="#B8904A"/></linearGradient>
    <clipPath id="bowl"><path d="M22 18 H98 C100 70 88 104 60 108 C32 104 20 70 22 18 Z"/></clipPath>
  </defs>
  <g clip-path="url(#bowl)">
    <g class="wine-level"><rect x="0" y="64" width="120" height="60" fill="url(#wineG)"/>
    <path class="wine-wave" d="M0 64 Q15 59 30 64 T60 64 T90 64 T120 64 T150 64 T180 64 V72 H0 Z" fill="#B8294F"/></g>
  </g>
  <path d="M22 18 H98 C100 70 88 104 60 108 C32 104 20 70 22 18 Z" fill="none" stroke="url(#goldG)" stroke-width="2.4"/>
  <path d="M60 108 V172" stroke="url(#goldG)" stroke-width="2.4"/>
  <path d="M34 176 Q60 168 86 176" fill="none" stroke="url(#goldG)" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M32 30 C31 52 35 72 44 86" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="3" stroke-linecap="round"/>
</svg>`;

export const AVATARS = ['🍷', '🍇', '🥂', '🍾', '🧀', '🥖', '🦊', '🐻', '🦉', '🐝', '🌿', '🔥', '🎩', '👑', '🌙', '⭐', '🐗', '🦆'];
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
