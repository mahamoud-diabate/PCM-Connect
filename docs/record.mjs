// Enregistre une démonstration vidéo d'une minute de l'application, via le screencast CDP.
// Usage : node record-demo.mjs <url_base> <dossier_frames>
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.CDP_PORT || 9444);
const BASE = process.argv[2] || 'http://localhost:3011';
const DOSSIER = process.argv[3] || './demo-frames';
const LARGEUR = 1600, HAUTEUR = 900;

fs.rmSync(DOSSIER, { recursive: true, force: true });
fs.mkdirSync(DOSSIER, { recursive: true });

const cibles = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const page = cibles.find((c) => c.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));

let id = 0;
const attente = new Map();
const erreurs = [];
const frames = [];
let numero = 0;

ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.id && attente.has(d.id)) { attente.get(d.id)(d); attente.delete(d.id); }
  if (d.method === 'Page.screencastFrame') {
    const f = path.join(DOSSIER, `f${String(numero++).padStart(5, '0')}.jpg`);
    fs.writeFileSync(f, Buffer.from(d.params.data, 'base64'));
    frames.push({ fichier: path.basename(f), t: Date.now() });
    cdp('Page.screencastFrameAck', { sessionId: d.params.sessionId });
  }
  if (d.method === 'Runtime.exceptionThrown') erreurs.push(d.params.exceptionDetails.exception?.description?.split('\n')[0] || d.params.exceptionDetails.text);
});

function cdp(method, params = {}) {
  return new Promise((r) => { const n = ++id; attente.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
}
const ev = async (e) => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: LARGEUR, height: HAUTEUR, deviceScaleFactor: 1, mobile: false });

// Curseur factice : un navigateur sans interface ne dessine pas le pointeur.
const CURSEUR = `(() => {
  if (document.getElementById('__curseur')) return;
  const c = document.createElement('div');
  c.id = '__curseur';
  c.style.cssText = 'position:fixed;z-index:99999;width:22px;height:22px;margin:-11px 0 0 -11px;pointer-events:none;transition:left .25s ease, top .25s ease;left:50%;top:50%';
  c.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 2 L6 20 L10.5 15.5 L13.5 21.5 L16 20.2 L13 14.4 L19 14 Z" fill="#16181d" stroke="#fff" stroke-width="1.4"/></svg>';
  document.body.appendChild(c);
})()`;

const bouger = (x, y) => ev(`(() => { const c = document.getElementById('__curseur'); c.style.left='${x}px'; c.style.top='${y}px'; return [c.style.left, c.style.top]; })()`);
async function cliquer(cible, texte, marge = 0) {
  const boite = await ev(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(cible)})].find((e) => e.textContent.includes(${JSON.stringify(texte)}));
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  })()`);
  if (!boite) { console.log('  cible introuvable :', cible, texte); return false; }
  await bouger(boite.x, boite.y);
  await pause(320);
  await ev(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(cible)})].find((e) => e.textContent.includes(${JSON.stringify(texte)}));
    if (el) el.click();
  })()`);
  return true;
}
async function saisir(selecteur, texte) {
  const boite = await ev(`(() => { const el = document.querySelector(${JSON.stringify(selecteur)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + 40), y: Math.round(r.top + r.height / 2) }; })()`);
  if (boite) await bouger(boite.x, boite.y);
  await ev(`(() => {
    const el = document.querySelector(${JSON.stringify(selecteur)});
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(el, ${JSON.stringify(texte)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await pause(300);
}
const defiler = async (y, ms = 900) => { await ev(`window.scrollTo({ top: ${y}, behavior: 'smooth' })`); await pause(ms); };

// ---------- Le parcours, minuté sur ~60 secondes ----------
await cdp('Page.startScreencast', { format: 'jpeg', quality: 82, maxWidth: LARGEUR, maxHeight: HAUTEUR, everyNthFrame: 1 });
await pause(400);
console.log('1. accueil');
await cdp('Page.navigate', { url: BASE + '/' });
await pause(2600);
await ev(CURSEUR);
await pause(1200);

console.log('2. mon idée');
await cliquer('a.bouton', "Lancer mon idée");
await pause(1800);
await ev(CURSEUR);
await cliquer('button.chip', 'Verdir notre ruelle');
await pause(1200);
await saisir('input[placeholder="Ex. : Marie"]', 'Marie');
await pause(700);
await cliquer('button.bouton-principal', 'Trouver mes partenaires');
await pause(2600);

console.log('3. constellation');
await ev(CURSEUR);
await bouger(420, 300);
await pause(1400);
await defiler(520);
await pause(1600);
await cliquer('button[role="tab"]', 'Où');
await pause(2200);
await cliquer('button[role="tab"]', 'Quand');
await pause(2200);
await cliquer('button[role="tab"]', 'Qui');
await pause(900);
await cliquer('button.bouton-principal', 'Inviter');
await pause(2800);

console.log('4. page du projet');
await ev(CURSEUR);
await cliquer('button.bouton-petit', 'Accepte');
await pause(2000);
await cliquer('button.lien', "Voir le message d'invitation");
await pause(2400);
await cliquer('button.lien', 'Masquer le message');
await pause(600);

console.log('5. coups de main');
await cdp('Page.navigate', { url: BASE + '/' });
await pause(2200);
await ev(CURSEUR);
await ev(`(() => { const a = [...document.querySelectorAll('a.carte-lien')].find((x) => x.textContent.includes('ruelle de la Couronne')); if (a) a.click(); })()`);
await pause(2600);
await ev(CURSEUR);
await ev(`document.querySelector('.coups')?.scrollIntoView({ block: 'start' })`);
await pause(1600);
const libres = await ev(`(() => {
  const t = [...document.querySelectorAll('.tache:not(.tache-pourvue)')];
  t.slice(0, 2).forEach((x, i) => setTimeout(() => { const c = x.querySelector('input'); if (c && !c.checked) c.click(); }, i * 600));
  return t.length;
})()`);
await pause(2200);
console.log('   tâches libres :', libres);
await saisir('.form-contribution input', 'Famille du 3e rang');
await pause(800);
console.log('   bouton :', await ev(`document.querySelector('.form-contribution button')?.textContent || '(absent)'`));
await cliquer('.form-contribution button', "J'apporte");
await pause(2600);
console.log('   barre :', await ev(`document.querySelector('.progression-taches')?.textContent?.slice(0, 80) || '(absente)'`));

console.log('6. offres');
await cdp('Page.navigate', { url: BASE + '/offres' });
await pause(2600);
await ev(CURSEUR);
await defiler(360);
await pause(2000);

console.log('7. pouls');
await cdp('Page.navigate', { url: BASE + '/pouls' });
await pause(2800);
await ev(CURSEUR);
await defiler(300);
await pause(2000);
await defiler(0);
await pause(1200);

console.log('8. retour à l’accueil');
await cdp('Page.navigate', { url: BASE + '/' });
await pause(2600);

const fin = Date.now();
const debut = frames.length ? frames[0].t : fin;

// ---------- Montage : frames + durée de chacune (le screencast n'est pas à cadence fixe) ----------
const lignes = [];
let total = 0;
for (let i = 0; i < frames.length; i++) {
  const suivant = i + 1 < frames.length ? frames[i + 1].t : fin;
  const duree = Math.max(0.02, (suivant - frames[i].t) / 1000);
  total += duree;
  lignes.push(`file '${frames[i].fichier}'`);
  lignes.push(`duration ${duree.toFixed(3)}`);
}
if (frames.length) lignes.push(`file '${frames[frames.length - 1].fichier}'`);
fs.writeFileSync(path.join(DOSSIER, 'list.txt'), lignes.join('\n'), 'utf8');
console.log(`frames : ${frames.length} | duree enregistrée : ${total.toFixed(1)} s | erreurs JS : ${erreurs.length ? erreurs.join(' | ') : 'aucune'}`);
ws.close();
