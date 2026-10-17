// Enregistreur CDP sans dépendance pour PCM (Plateforme citoyenne de mobilisation)
// Usage :
//   node docs/record.mjs screens http://localhost:3001 docs/captures
//   node docs/record.mjs video   http://localhost:3001 docs
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
].find((p) => existsSync(p));

if (!CHROME) throw new Error('Google Chrome introuvable');

const mode = process.argv[2] || 'screens';
const baseUrl = (process.argv[3] || 'http://localhost:3001').replace(/\/$/, '');
const outDir = process.argv[4] || 'docs/captures';
const port = 9345 + Math.floor(Math.random() * 200);
const profile = mkdtempSync(join(tmpdir(), 'pcm-cdp-'));

mkdirSync(outDir, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1440,900',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWs() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('Impossible de joindre Chrome CDP');
}

const ws = new WebSocket(await getWs());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let seq = 0;
const pending = new Map();
const listeners = new Map();

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method && listeners.has(msg.method)) {
    for (const fn of listeners.get(msg.method)) fn(msg.params);
  }
};

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

const on = (event, fn) => {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(fn);
};

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return r.result?.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

// Curseur visuel pour la vidéo
const injectCursor = async () => {
  await evaluate(`(() => {
    if (document.getElementById('pcm-demo-cursor')) return;
    const c = document.createElement('div');
    c.id = 'pcm-demo-cursor';
    Object.assign(c.style, {
      position: 'fixed', left: '720px', top: '450px', width: '22px', height: '22px',
      borderRadius: '50%', background: 'rgba(13, 106, 94, 0.35)',
      border: '2.5px solid #0d6a5e', boxShadow: '0 2px 10px rgba(0,0,0,0.28)',
      pointerEvents: 'none', zIndex: '999999', transform: 'translate(-50%, -50%)',
      transition: 'left 0.38s cubic-bezier(0.22,1,0.36,1), top 0.38s cubic-bezier(0.22,1,0.36,1), transform 0.15s ease'
    });
    document.body.appendChild(c);
  })()`);
};

const moveCursorAndClick = async (selectorOrText, byText = false) => {
  const rect = await evaluate(`(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    let el = null;
    if (${JSON.stringify(byText)}) {
      const target = norm(${JSON.stringify(selectorOrText)});
      const all = Array.from(document.querySelectorAll('button, a, label, [role=button], .card, h3, h4'));
      el = all.find((e) => norm(e.innerText).includes(target));
    } else {
      el = document.querySelector(${JSON.stringify(selectorOrText)});
    }
    if (!el) return null;
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
    const r = el.getBoundingClientRect();
    const c = document.getElementById('pcm-demo-cursor');
    const x = Math.round(r.left + Math.min(r.width / 2, 120));
    const y = Math.round(r.top + r.height / 2);
    if (c) { c.style.left = x + 'px'; c.style.top = y + 'px'; }
    return { x, y };
  })()`);
  await sleep(420);
  if (rect) {
    await evaluate(`(() => {
      const c = document.getElementById('pcm-demo-cursor');
      if (c) c.style.transform = 'translate(-50%, -50%) scale(0.72)';
      setTimeout(() => { if (c) c.style.transform = 'translate(-50%, -50%) scale(1)'; }, 160);
    })()`);
  }
  await evaluate(`(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    let el = null;
    if (${JSON.stringify(byText)}) {
      const target = norm(${JSON.stringify(selectorOrText)});
      const all = Array.from(document.querySelectorAll('button, a, label, [role=button]'));
      el = all.find((e) => norm(e.innerText).includes(target));
    } else {
      el = document.querySelector(${JSON.stringify(selectorOrText)});
    }
    if (el) el.click();
  })()`);
  await sleep(550);
};

const snap = async (filename) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const full = join(outDir, filename);
  writeFileSync(full, Buffer.from(data, 'base64'));
  console.log('Capture :', full);
};

if (mode === 'screens') {
  // 1. Accueil
  await send('Page.navigate', { url: `${baseUrl}/` });
  await sleep(2200);
  await snap('01-accueil.png');

  // 2. Déposer une idée (préremplie avec l'exemple Frigo-partage)
  await send('Page.navigate', { url: `${baseUrl}/idee` });
  await sleep(1600);
  await moveCursorAndClick('Frigo-partage', true);
  await sleep(800);
  await snap('02-deposer-une-idee.png');

  // 3. Constellation d'alliés (génération depuis l'idée)
  await moveCursorAndClick('Trouver mes alliés', true);
  await sleep(2200);
  await snap('03-constellation-allies.png');

  // 4. Espace projet collaboratif (premier projet existant)
  await send('Page.navigate', { url: `${baseUrl}/projets/proj-demo-1` });
  await sleep(2200);
  await snap('04-espace-projet.png');

  // 5. Place des offres citoyennes et matérielles
  await send('Page.navigate', { url: `${baseUrl}/offres` });
  await sleep(1800);
  await snap('05-offres-entraide.png');

  // 6. Pouls du quartier (tableau de bord)
  await send('Page.navigate', { url: `${baseUrl}/pouls` });
  await sleep(2000);
  await snap('06-pouls-du-quartier.png');
} else if (mode === 'video') {
  const framesDir = join(outDir, 'frames');
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  let frameCount = 0;
  let recording = true;

  const captureLoop = (async () => {
    while (recording) {
      try {
        const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
        const idx = String(++frameCount).padStart(4, '0');
        writeFileSync(join(framesDir, `frame-${idx}.jpg`), Buffer.from(data, 'base64'));
      } catch {}
      await sleep(95);
    }
  })();

  await send('Page.navigate', { url: `${baseUrl}/` });
  await sleep(1600);
  await injectCursor();
  await sleep(900);

  // Aller sur Déposer une idée
  await moveCursorAndClick('a[href="/idee"] enacted, a[href="/idee"]', false);
  await send('Page.navigate', { url: `${baseUrl}/idee` });
  await sleep(1100);
  await injectCursor();

  // Charger l'exemple Frigo-partage
  await moveCursorAndClick('Frigo-partage', true);
  await sleep(900);

  // Lancer l'appariement
  await moveCursorAndClick('Trouver mes alliés', true);
  await sleep(1800);
  await injectCursor();

  // Parcourir la constellation et l'explication des scores
  await evaluate('window.scrollTo({ top: 360, behavior: "smooth" })');
  await sleep(1400);
  await evaluate('window.scrollTo({ top: 0, behavior: "smooth" })');
  await sleep(900);

  // Ouvrir un espace projet actif avec partenaires, tâches et feuille de route
  await send('Page.navigate', { url: `${baseUrl}/projets/proj-demo-1` });
  await sleep(1600);
  await injectCursor();
  await evaluate('window.scrollTo({ top: 380, behavior: "smooth" })');
  await sleep(1400);

  if (process.env.PCM_STOP !== 'short') {
    await send('Page.navigate', { url: `${baseUrl}/offres` });
    await sleep(1400);
    await send('Page.navigate', { url: `${baseUrl}/pouls` });
    await sleep(1800);
  }

  recording = false;
  await captureLoop;
  console.log('Frames capturées :', frameCount);
}

ws.close();
chrome.kill();
