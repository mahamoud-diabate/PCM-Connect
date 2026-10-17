// Données en mémoire.
//  - data/local/       données RÉELLES importées des fichiers de la Ville (jamais versionnées, voir .gitignore)
//  - data/demo/        jeu de démonstration 100 % fictif (versionné)
//  - data/places.json  lieux d'exemple, communs aux deux modes
//  - data/runtime.json projets et offres créés pendant l'utilisation (jamais versionné)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPACITES_PAR_TYPE, detecterThemes } from './themes.js';
import { vecteur } from './embeddings.js';
import { construireIndex } from './texte.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA = path.join(__dirname, '..', 'data');
export const LOCAL = path.join(DATA, 'local');
export const DEMO = path.join(DATA, 'demo');
const RUNTIME = process.env.PCM_RUNTIME || path.join(DATA, 'runtime.json');

const lireJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

/** « demo » si forcé (--demo ou PCM_DONNEES=demo) ou si aucune donnée locale ; sinon « ville ». */
function choisirSource() {
  const force = process.argv.includes('--demo') || process.env.PCM_DONNEES === 'demo';
  return !force && fs.existsSync(path.join(LOCAL, 'partners.json')) ? 'ville' : 'demo';
}

function lireJeu(nom) {
  const local = path.join(LOCAL, nom);
  if (db.source === 'ville' && fs.existsSync(local)) return lireJson(local);
  const demo = path.join(DEMO, nom);
  return fs.existsSync(demo) ? lireJson(demo) : [];
}

export const db = { source: 'demo', partenaires: [], lieux: [], evenements: [], offres: [], projets: [], index: null };

export function textePartenaire(p) {
  return [p.nom, p.categorie, p.domaine, p.discipline, p.typeSoutien, p.description].filter(Boolean).join(' · ');
}

export async function chargerDonnees() {
  db.source = choisirSource();
  db.partenaires = lireJeu('partners.json').map((p) => ({
    ...p,
    capacites: p.capacites?.length ? p.capacites : CAPACITES_PAR_TYPE[p.type] || [],
    themes: detecterThemes(textePartenaire(p))
  }));
  db.index = construireIndex(db.partenaires.map((p) => ({ id: p.id, texte: textePartenaire(p) })));
  db.lieux = lireJson(path.join(DATA, 'places.json'));
  db.evenements = lireJeu('events.json').map((e) => ({ ...e, themes: detecterThemes(`${e.titre} ${e.description}`) }));

  // L'état sauvegardé n'est repris que s'il a été créé avec la même source de données
  const etat = fs.existsSync(RUNTIME) ? lireJson(RUNTIME) : null;
  const memeSource = etat && (etat.source || 'ville') === db.source;
  db.offres = memeSource ? etat.offres || [] : [];
  db.projets = (memeSource ? etat.projets || [] : []).map((p) => ({
    ...p,
    besoins: p.besoins || [],
    equipe: p.equipe || [],
    themes: p.themes || detecterThemes(`${p.titre} ${p.description}`)
  }));

  // Vecteurs sémantiques (si l'IA locale est activée)
  for (const p of db.partenaires) p.vec = await vecteur(textePartenaire(p));
  for (const e of db.evenements) e.vec = await vecteur(`${e.titre}. ${e.description}`);
  return { etatRepris: !!memeSource };
}

export function sauvegarder() {
  fs.writeFileSync(RUNTIME, JSON.stringify({ source: db.source, offres: db.offres, projets: db.projets }, null, 2));
}

export function viderEtat() {
  db.offres = [];
  db.projets = [];
  if (fs.existsSync(RUNTIME)) fs.unlinkSync(RUNTIME);
}

export const partenaireParId = (id) => db.partenaires.find((p) => p.id === id);

export function nouvelId(prefixe) {
  return `${prefixe}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}
