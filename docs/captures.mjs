// Parcours de démonstration piloté dans Chrome sans interface (CDP), avec captures d'écran.
// Usage : node captures.mjs <url_base> <dossier_sortie> [largeur] [hauteur] [prefixe]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const [, , BASE = 'http://localhost:3011', SORTIE = './captures', L = '1440', H = '900', PREFIXE = 'bureau'] = process.argv;
const LARGEUR = +L, HAUTEUR = +H, MOBILE = LARGEUR < 600;
fs.mkdirSync(SORTIE, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.CDP_PORT || (MOBILE ? 9333 : 9334));
const profil = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'pcm-chrome-'));
let chrome = null;
async function chromeDejaLa() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); return r.ok; } catch { return false; }
}
if (!(await chromeDejaLa())) {
  chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`, '--no-first-run', '--hide-scrollbars', `--window-size=${LARGEUR},${HAUTEUR}`, 'about:blank'], { stdio: 'ignore' });
  chrome.on('error', (e) => console.error('lancement Chrome:', e.message));
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0;
const attente = new Map();
const erreurs = [];
async function connecter() {
  for (let i = 0; i < 50; i++) {
    try {
      const cibles = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = cibles.find((c) => c.type === 'page');
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((r) => ws.addEventListener('open', r));
        ws.addEventListener('message', (m) => {
          const d = JSON.parse(m.data);
          if (d.id && attente.has(d.id)) { attente.get(d.id)(d); attente.delete(d.id); }
          if (d.method === 'Runtime.exceptionThrown') erreurs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
          if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') erreurs.push(d.params.args.map((a) => a.value || a.description).join(' '));
        });
        return;
      }
    } catch { /* Chrome démarre */ }
    await pause(200);
  }
  throw new Error('Chrome injoignable');
}
const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; attente.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluer = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
async function aller(url) { await cdp('Page.navigate', { url: BASE + url }); await pause(1800); }
async function capturer(nom, pleinePage = true) {
  await pause(900);
  let params = { format: 'png' };
  if (pleinePage) {
    const h = await evaluer('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)');
    await cdp('Emulation.setDeviceMetricsOverride', { width: LARGEUR, height: Math.min(h, 4000), deviceScaleFactor: 1, mobile: MOBILE });
    await pause(700);
  }
  const r = await cdp('Page.captureScreenshot', params);
  fs.writeFileSync(path.join(SORTIE, `${PREFIXE}-${nom}.png`), Buffer.from(r.result.data, 'base64'));
  await cdp('Emulation.setDeviceMetricsOverride', { width: LARGEUR, height: HAUTEUR, deviceScaleFactor: 1, mobile: MOBILE });
  const debord = await evaluer('document.documentElement.scrollWidth > window.innerWidth + 1');
  console.log(`${PREFIXE}-${nom}.png${debord ? '  [DÉBORDEMENT HORIZONTAL]' : ''}`);
}
const cliquerTexte = (selecteur, texte) => evaluer(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selecteur)})].find((e) => e.textContent.includes(${JSON.stringify(texte)})); if (el) { el.click(); return true; } return false; })()`);

try {
  await connecter();
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: LARGEUR, height: HAUTEUR, deviceScaleFactor: 1, mobile: MOBILE });
  await aller('/');
  await capturer('1-accueil');
  await aller('/idee');
  console.log('exemple:', await cliquerTexte('button.chip', 'Verdir notre ruelle'));
  await evaluer(`(() => { const i = [...document.querySelectorAll('input')].find((x) => x.placeholder.includes('Marie')); const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(i, 'Marie'); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await capturer('2-idee');
  console.log('soumettre:', await cliquerTexte('button[type=submit]', 'Trouver mes partenaires'));
  await pause(1500);
  await capturer('3-constellation-qui');
  await cliquerTexte('.onglets button', 'Où');
  await capturer('4-constellation-ou', false);
  await cliquerTexte('.onglets button', 'Qui');
  console.log('inviter:', await cliquerTexte('.barre-action button', 'Inviter'));
  await pause(1800);
  await capturer('5-projet');
  console.log('accepte:', await cliquerTexte('button', 'Accepte'));
  await pause(800);
  await cliquerTexte('button.lien', "Voir le message");
  await capturer('6-projet-accepte');
  await aller('/offres');
  await capturer('7-offres');
  await aller('/pouls');
  await capturer('8-pouls');
  console.log('textes clés:', JSON.stringify(await evaluer(`[...document.querySelectorAll('.kpis div')].map((d) => d.innerText.replace(/\\n/g, ' '))`)));
  console.log('erreurs JS:', erreurs.length ? erreurs : 'aucune');
} finally {
  ws?.close();
  chrome?.kill();
  await pause(500);
  try { fs.rmSync(profil, { recursive: true, force: true }); } catch { /* verrou Chrome */ }
}
