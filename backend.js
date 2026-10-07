// =====================================================================
//  Couche de données : Firebase (en ligne) ou mode démo local (onglets)
// =====================================================================
import { FIREBASE_CONFIG } from './config.js';

const configured = FIREBASE_CONFIG?.apiKey && !/^VOTRE|^YOUR|^xxx/i.test(FIREBASE_CONFIG.apiKey);

export async function createBackend() {
  if (configured) {
    try { const b = await firebaseBackend(); await b.init(); return b; }
    catch (e) { console.error('Firebase indisponible', e); throw e; }
  }
  const b = localBackend(); await b.init(); return b;
}

// ---------------------------------------------------------------------
async function firebaseBackend() {
  const V = '10.12.2', base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  const fapp = initializeApp(FIREBASE_CONFIG);
  const auth = A.getAuth(fapp);
  const db = F.getFirestore(fapp);
  const { setDoc: _s0, updateDoc: _u0 } = F;
  const { doc, getDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } = F;
  const gRef = c => doc(db, 'games', c);
  const clean = x => JSON.parse(JSON.stringify(x)); // Firestore refuse les valeurs undefined
  const _set = _s0, _upd = _u0;
  const setDoc = (r, d) => _set(r, clean(d)), updateDoc = (r, d) => _upd(r, clean(d));
  const list = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return {
    mode: 'firebase', uid: null,
    async init() {
      const u = await new Promise(res => { const un = A.onAuthStateChanged(auth, u => { un(); res(u); }); });
      if (!u) await A.signInAnonymously(auth);
      this.uid = auth.currentUser.uid;
    },
    async getGame(c) { const s = await getDoc(gRef(c)); return s.exists() ? s.data() : null; },
    createGame: (c, d) => setDoc(gRef(c), d),
    updateGame: (c, p) => updateDoc(gRef(c), p),
    watchGame: (c, cb) => onSnapshot(gRef(c), s => cb(s.exists() ? s.data() : null), e => console.warn(e)),
    setSecret: (c, d) => setDoc(doc(db, 'secrets', c), d),
    async getSecret(c) { try { const s = await getDoc(doc(db, 'secrets', c)); return s.exists() ? s.data() : null; } catch { return null; } },
    setPhoto: (c, i, data, hostUid) => setDoc(doc(db, 'secrets', `${c}_p${i}`), { hostUid, data }),
    async getPhoto(c, i) { try { const s = await getDoc(doc(db, 'secrets', `${c}_p${i}`)); return s.exists() ? s.data().data : null; } catch { return null; } },
    join: (c, uid, p) => setDoc(doc(db, 'games', c, 'players', uid), p),
    leave: (c, uid) => deleteDoc(doc(db, 'games', c, 'players', uid)),
    async getPlayers(c) { return list(await getDocs(collection(db, 'games', c, 'players'))); },
    watchPlayers: (c, cb) => onSnapshot(collection(db, 'games', c, 'players'), s => cb(list(s)), e => console.warn(e)),
    submitAnswer: (c, idx, uid, d) => setDoc(doc(db, 'games', c, 'answers', `${idx}_${uid}`), { ...d, idx, uid }),
    async getAnswers(c, idx) { return list(await getDocs(query(collection(db, 'games', c, 'answers'), where('idx', '==', idx)))); },
    watchAnswers: (c, idx, cb) => onSnapshot(query(collection(db, 'games', c, 'answers'), where('idx', '==', idx)), s => cb(list(s)), e => console.warn(e)),
    setReveal: (c, idx, d) => setDoc(doc(db, 'games', c, 'reveals', String(idx)), d),
    async getReveal(c, idx) { const s = await getDoc(doc(db, 'games', c, 'reveals', String(idx))); return s.exists() ? s.data() : null; },
    watchReveal: (c, idx, cb) => onSnapshot(doc(db, 'games', c, 'reveals', String(idx)), s => cb(s.exists() ? s.data() : null), e => console.warn(e)),
    async listMyGames(uid) {
      const col = collection(db, 'games');
      const [a, b] = await Promise.all([
        getDocs(query(col, where('hostUid', '==', uid))),
        getDocs(query(col, where('playerUids', 'array-contains', uid)))]);
      const m = new Map(); [...list(a), ...list(b)].forEach(g => m.set(g.id, g));
      return [...m.values()];
    },
  };
}

// ---------------------------------------------------------------------
//  Mode démo : tout est stocké dans le navigateur, synchronisé entre onglets
// ---------------------------------------------------------------------
function localBackend() {
  const KEY = 'vn_localdb';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  let db = load();
  const T = n => (db[n] ||= {});
  const listeners = new Set();
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('Stockage plein', e); }
    queueMicrotask(emit);
  };
  const emit = () => listeners.forEach(l => { const v = JSON.stringify(l.get() ?? null); if (v !== l.last) { l.last = v; l.cb(JSON.parse(v)); } });
  window.addEventListener('storage', e => { if (e.key === KEY) { db = load(); emit(); } });
  const watch = (get, cb) => { const l = { get, cb, last: undefined }; listeners.add(l); setTimeout(() => { if (listeners.has(l)) { l.last = JSON.stringify(get() ?? null); cb(JSON.parse(l.last)); } }); return () => listeners.delete(l); };
  const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));
  const vals = o => Object.entries(o || {}).map(([id, v]) => ({ id, ...v }));
  return {
    mode: 'local', uid: null,
    async init() {
      let id = sessionStorage.getItem('vn_local_uid');
      if (!id) { id = 'u' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('vn_local_uid', id); }
      this.uid = id;
    },
    async getGame(c) { db = load(); return clone(T('games')[c]) || null; },
    async createGame(c, d) { db = load(); T('games')[c] = clone(d); save(); },
    async updateGame(c, p) { db = load(); Object.assign(T('games')[c], clone(p)); save(); },
    watchGame: (c, cb) => watch(() => T('games')[c], cb),
    async setSecret(c, d) { db = load(); T('secrets')[c] = clone(d); save(); },
    async getSecret(c) { db = load(); return clone(T('secrets')[c]) || null; },
    async setPhoto(c, i, data) { db = load(); T('photos')[c + '_' + i] = data; save(); },
    async getPhoto(c, i) { db = load(); return T('photos')[c + '_' + i] || null; },
    async join(c, uid, p) { db = load(); (T('players')[c] ||= {})[uid] = clone(p); save(); },
    async leave(c, uid) { db = load(); delete (T('players')[c] || {})[uid]; save(); },
    async getPlayers(c) { db = load(); return vals(T('players')[c]); },
    watchPlayers: (c, cb) => watch(() => vals(T('players')[c]), cb),
    async submitAnswer(c, idx, uid, d) {
      db = load(); const g = T('games')[c];
      if (!g || g.phase !== 'answering' || g.current !== idx) throw new Error('closed');
      (T('answers')[c] ||= {})[idx + '_' + uid] = { ...clone(d), idx, uid }; save();
    },
    async getAnswers(c, idx) { db = load(); return vals(T('answers')[c]).filter(a => a.idx === idx); },
    watchAnswers: (c, idx, cb) => watch(() => vals(T('answers')[c]).filter(a => a.idx === idx), cb),
    async setReveal(c, idx, d) { db = load(); (T('reveals')[c] ||= {})[idx] = clone(d); save(); },
    async getReveal(c, idx) { db = load(); return clone((T('reveals')[c] || {})[idx]) || null; },
    watchReveal: (c, idx, cb) => watch(() => (T('reveals')[c] || {})[idx], cb),
    async listMyGames(uid) { db = load(); return vals(T('games')).filter(g => g.hostUid === uid || (g.playerUids || []).includes(uid)); },
  };
}
