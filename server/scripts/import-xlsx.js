// Importe les fichiers Excel de la Ville dans data/local/partners.json et data/local/events.json
// Le dossier data/local/ est exclu de Git (.gitignore) : les données de la Ville ne quittent pas la machine.
// Usage (dans /server) :  npm run import
// Tout se fait EN LOCAL : aucune donnée n'est envoyée ailleurs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import { coordRue, coordLieu } from '../src/rues.js';
import { normaliser } from '../src/themes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data', 'local');
fs.mkdirSync(DATA, { recursive: true });
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'import-config.json'), 'utf8'));

function lireFichier(relatif) {
  const fichier = path.resolve(__dirname, relatif);
  if (!fs.existsSync(fichier)) {
    console.warn(`Fichier introuvable, ignoré : ${fichier}`);
    return null;
  }
  const wb = XLSX.readFile(fichier, { cellDates: true });
  const lignes = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
  console.log(`${path.basename(fichier)} : ${lignes.length} lignes`);
  return lignes;
}

const lecteur = (ligne, colonnes) => (champ) => {
  const col = colonnes[champ];
  if (!col) return null;
  const v = ligne[col];
  if (v == null) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  return s === '' ? null : s;
};

function sauvegarder(nom, donnees) {
  fs.writeFileSync(path.join(DATA, nom), JSON.stringify(donnees, null, 2));
}

// ---------- PARTENAIRES ----------
const prefixe = { organismes_reconnus: 'o', organismes_culture: 'c', entreprises: 'e', sdc: 's' };
const partenaires = [];
const dejaVus = new Set();

for (const src of config.partenaires) {
  const lignes = lireFichier(src.fichier);
  if (!lignes) continue;
  let n = 0;
  lignes.forEach((ligne, i) => {
    const val = lecteur(ligne, src.colonnes);
    const nom = val('nom');
    if (!nom) return;
    const cle = `${src.source}|${normaliser(nom)}`;
    if (dejaVus.has(cle)) return; // doublons
    dejaVus.add(cle);

    const typeRue = val('typeRue');
    const nomRue = val('nomRue');
    const adresse = [typeRue, nomRue].filter(Boolean).join(' ') || null;
    const pos = nomRue ? coordRue(nomRue, nom) : null;
    const obnl = val('obnl');
    const estObnl = obnl && /^(oui|o|yes|y|1|x|vrai|true)$/i.test(obnl);

    partenaires.push({
      id: `${prefixe[src.source] || 'x'}${i + 1}`,
      nom,
      source: src.source,
      type: estObnl ? 'organisme' : src.type,
      categorie: val('categorie') || (src.type === 'entreprise' ? 'Entreprise' : null),
      domaine: val('domaine'),
      typeSoutien: val('typeSoutien'),
      statut: val('statut'),
      arrondissement: val('arrondissement'),
      adresse,
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
      coordApprox: !!pos
    });
    n++;
  });
  console.log(`   → ${n} partenaires retenus`);
}

if (partenaires.length) {
  sauvegarder('partners.json', partenaires);
  const places = partenaires.filter((p) => p.lat != null).length;
  console.log(`${partenaires.length} partenaires écrits (${places} placés approximativement sur leur rue)`);
} else {
  console.error('Aucun partenaire importé : vérifiez les chemins dans import-config.json');
}

// ---------- ÉVÉNEMENTS ----------
function versISO(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) {
    const p = (x) => String(x).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  const s = String(v);
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; // jj/mm/aaaa
  if (/^\d+(\.\d+)?$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(Number(s));
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  return null;
}

const ev = config.evenements;
if (ev) {
  const lignes = lireFichier(ev.fichier);
  if (lignes) {
    let tous = lignes.map((ligne, i) => {
      const val = lecteur(ligne, ev.colonnes);
      const lieu = val('lieu');
      const pos = lieu ? coordLieu(lieu) : null;
      const description = [val('description'), val('categorie'), val('typeActivite'), val('descriptionLongue')]
        .filter(Boolean).join(' · ').slice(0, 600);
      return {
        id: `ev${i + 1}`,
        titre: val('titre'),
        date: versISO(val('date')),
        lieu: lieu || val('quartier') || '',
        quartier: val('quartier'),
        promoteur: val('promoteur'),
        categorie: val('categorie'),
        description,
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null
      };
    }).filter((e) => e.titre && e.date);

    if (ev.garderSeulementQuartier) {
      const cible = normaliser(ev.garderSeulementQuartier);
      const filtres = tous.filter((e) => normaliser(`${e.quartier || ''} ${e.lieu}`).includes(cible));
      if (filtres.length) tous = filtres;
      else console.warn(`Aucun événement avec « ${ev.garderSeulementQuartier} » dans le quartier/lieu : tous les événements sont gardés.`);
    }
    if (tous.length) {
      sauvegarder('events.json', tous);
      const aVenir = tous.filter((e) => e.date >= new Date().toISOString().slice(0, 10)).length;
      console.log(`${tous.length} événements écrits (${aVenir} à venir, ${tous.filter((e) => e.lat != null).length} localisés)`);
    }
  }
}

// ---------- Remise à zéro de l'état ----------
// Les projets et offres de démonstration sont régénérés au prochain démarrage, sur les nouvelles données.
if (partenaires.length) {
  const runtime = path.join(DATA, '..', 'runtime.json');
  if (fs.existsSync(runtime)) fs.unlinkSync(runtime);
  console.log('État réinitialisé : les projets et offres de démonstration seront régénérés au démarrage.');
  console.log("Relancez l'application (Ctrl+C puis npm run dev à la racine de pcm).");
  console.log('Pour présenter avec les données fictives : npm run dev:demo');
}
