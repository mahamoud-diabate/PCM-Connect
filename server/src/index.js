import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, chargerDonnees, sauvegarder, viderEtat, partenaireParId, nouvelId } from './store.js';
import { suggerer, messageInvitation } from './matching.js';
import { genererGraines } from './graines.js';
import { THEMES, BESOINS, detecterThemes, themesPrincipaux } from './themes.js';
import { CENTRE_SAINT_ROCH } from './geo.js';
import { initEmbeddings, embeddingsActifs } from './embeddings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const SANS_GRAINES = process.env.PCM_SANS_GRAINES === '1';
const app = express();

// En développement, Vite relaie /api (même origine). CORS seulement si une origine est déclarée.
if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN.split(',') }));
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'same-origin');
  next();
});
app.use(express.json({ limit: '50kb' }));

// ---------- Validation ----------
const STATUTS_PROJET = ['recherche', 'en_cours', 'realise'];
const STATUTS_MEMBRE = ['invite', 'accepte', 'decline'];
const TYPES_PORTEUR = ['citoyen', 'commercant', 'organisme', 'entreprise'];

const texte = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const nombre = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const besoinsValides = (b) => (Array.isArray(b) ? [...new Set(b.filter((x) => BESOINS[x]))] : []);
const coord = (lat, lng) => {
  const a = nombre(lat), b = nombre(lng);
  return a != null && b != null && Math.abs(a) <= 90 && Math.abs(b) <= 180 ? { lat: a, lng: b } : { lat: null, lng: null };
};

// ---------- Helpers ----------
function progressionTaches(p) {
  const taches = p.taches || [];
  const pourvues = taches.filter((t) => (t.inscrits?.length || 0) >= t.places).length;
  const faites = taches.filter((t) => t.fait).length;
  return {
    total: taches.length,
    pourvues,
    faites,
    pourcentage: taches.length ? Math.round((pourvues / taches.length) * 100) : 0
  };
}

function enrichirProjet(p) {
  const themes = themesPrincipaux(p.themes || {}).map((t) => ({ cle: t, label: THEMES[t].label }));
  const equipe = (p.equipe || []).filter((m) => partenaireParId(m.partnerId)).map((m) => {
    const part = partenaireParId(m.partnerId);
    return {
      ...m,
      nom: part.nom,
      type: part.type,
      categorie: part.categorie,
      lat: part.lat, lng: part.lng,
      message: messageInvitation(p, part, m.raisons)
    };
  });
  const evt = db.evenements.find((e) => e.id === p.evenementId);
  return {
    ...p,
    themes,
    equipe,
    taches: (p.taches || []).map((t) => ({ ...t, pourvue: (t.inscrits?.length || 0) >= t.places })),
    progression: progressionTaches(p),
    lieu: db.lieux.find((l) => l.id === p.lieuId) || null,
    evenement: evt ? { ...evt, vec: undefined, themes: undefined } : null
  };
}

function majStatutAuto(p) {
  if (p.statut === 'realise') return;
  p.statut = p.equipe.some((m) => m.statut === 'accepte') ? 'en_cours' : 'recherche';
}

const trouverProjet = (req, res) => {
  const p = db.projets.find((x) => x.id === req.params.id);
  if (!p) res.status(404).json({ erreur: 'Projet introuvable' });
  return p;
};

// ---------- Routes ----------
app.get('/api/meta', (_req, res) => {
  res.json({
    centre: CENTRE_SAINT_ROCH,
    source: db.source,
    themes: Object.entries(THEMES).map(([cle, t]) => ({ cle, label: t.label })),
    besoins: Object.entries(BESOINS).map(([cle, label]) => ({ cle, label })),
    iaLocale: embeddingsActifs(),
    stats: {
      partenaires: db.partenaires.length,
      organismes: db.partenaires.filter((p) => p.type === 'organisme').length,
      commerces: db.partenaires.filter((p) => p.type !== 'organisme').length,
      localises: db.partenaires.filter((p) => p.lat != null).length,
      evenements: db.evenements.length,
      projets: db.projets.length,
      offres: db.offres.length
    }
  });
});

// Recherche de partenaires (formulaire « Publier une offre ») : jamais la liste complète
app.get('/api/partners', (req, res) => {
  const q = texte(req.query.q, 60).toLowerCase();
  const liste = db.partenaires
    .filter((p) => !q || p.nom.toLowerCase().includes(q))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    .slice(0, 30)
    .map(({ id, nom, type, categorie }) => ({ id, nom, type, categorie }));
  res.json(liste);
});

app.get('/api/places', (_req, res) => res.json(db.lieux));
app.get('/api/events', (_req, res) => res.json(db.evenements.map(({ vec, themes, ...e }) => e)));

app.post('/api/match', async (req, res, next) => {
  try {
    const b = req.body || {};
    const titre = texte(b.titre, 80), description = texte(b.description, 500);
    if (!titre && !description) return res.status(400).json({ erreur: 'Décrivez votre idée.' });
    res.json(await suggerer({ titre, description, besoins: besoinsValides(b.besoins), ...coord(b.lat, b.lng) }));
  } catch (e) { next(e); }
});

app.get('/api/projects', (_req, res) => {
  res.json([...db.projets].sort((a, b) => (b.creeLe || '').localeCompare(a.creeLe || '')).map(enrichirProjet));
});

app.get('/api/projects/:id', (req, res) => {
  const p = trouverProjet(req, res);
  if (p) res.json(enrichirProjet(p));
});

app.post('/api/projects', (req, res) => {
  const b = req.body || {};
  const titre = texte(b.titre, 80);
  if (titre.length < 3) return res.status(400).json({ erreur: 'Le titre est obligatoire (3 caractères minimum).' });
  const description = texte(b.description, 500);
  const porteur = b.porteur || {};
  const invites = Array.isArray(b.invites) ? b.invites.slice(0, 10) : [];
  const projet = {
    id: nouvelId('pr'),
    titre,
    description,
    besoins: besoinsValides(b.besoins),
    ...coord(b.lat, b.lng),
    lieuId: db.lieux.some((l) => l.id === b.lieuId) ? b.lieuId : null,
    evenementId: db.evenements.some((e) => e.id === b.evenementId) ? b.evenementId : null,
    porteur: {
      nom: texte(porteur.nom, 60) || 'Citoyen·ne de Saint-Roch',
      type: TYPES_PORTEUR.includes(porteur.type) ? porteur.type : 'citoyen'
    },
    themes: detecterThemes(`${titre} ${description}`),
    statut: 'recherche',
    creeLe: new Date().toISOString().slice(0, 10),
    equipe: invites
      .filter((i) => partenaireParId(i?.partnerId))
      .map((i) => ({
        partnerId: i.partnerId,
        statut: 'invite',
        raisons: Array.isArray(i.raisons) ? i.raisons.filter((r) => typeof r === 'string').slice(0, 6).map((r) => r.slice(0, 160)) : []
      }))
  };
  db.projets.push(projet);
  sauvegarder();
  res.status(201).json(enrichirProjet(projet));
});

// Réponse d'un partenaire à une invitation (simulée pendant la démo)
app.patch('/api/projects/:id/equipe/:partnerId', (req, res) => {
  const p = trouverProjet(req, res);
  if (!p) return;
  const m = p.equipe.find((x) => x.partnerId === req.params.partnerId);
  if (!m) return res.status(404).json({ erreur: 'Invitation introuvable' });
  if (!STATUTS_MEMBRE.includes(req.body?.statut)) return res.status(400).json({ erreur: 'Statut invalide' });
  m.statut = req.body.statut;
  majStatutAuto(p);
  sauvegarder();
  res.json(enrichirProjet(p));
});

app.patch('/api/projects/:id', (req, res) => {
  const p = trouverProjet(req, res);
  if (!p) return;
  const statut = req.body?.statut;
  if (!STATUTS_PROJET.includes(statut)) return res.status(400).json({ erreur: 'Statut invalide' });
  if (statut === 'realise' && !p.equipe.some((m) => m.statut === 'accepte')) {
    return res.status(400).json({ erreur: 'Un projet ne peut être réalisé sans au moins un partenaire engagé.' });
  }
  p.statut = statut;
  sauvegarder();
  res.json(enrichirProjet(p));
});

// ---------- Coups de main : les taches d'un projet ----------
// Le porteur liste ce qu'il faut faire ; n'importe qui coche ce qu'il peut apporter et laisse son nom.
app.post('/api/projects/:id/taches', (req, res) => {
  const p = trouverProjet(req, res);
  if (!p) return;
  const b = req.body || {};
  const libelle = texte(b.libelle, 80);
  const places = Math.min(Math.max(Number(b.places) || 1, 1), 50);
  if (libelle.length < 3) return res.status(400).json({ erreur: 'Décrivez la tâche (3 caractères minimum).' });
  if (b.besoin && !BESOINS[b.besoin]) return res.status(400).json({ erreur: 'Type de besoin inconnu.' });
  p.taches = p.taches || [];
  if (p.taches.length >= 20) return res.status(400).json({ erreur: '20 tâches au maximum par projet.' });
  p.taches.push({ id: nouvelId('ta'), libelle, besoin: b.besoin || null, places, inscrits: [], fait: false });
  sauvegarder();
  res.status(201).json(enrichirProjet(p));
});

// Un habitant, un commerce ou un organisme coche ce qu'il apporte
app.post('/api/projects/:id/contribuer', (req, res) => {
  const p = trouverProjet(req, res);
  if (!p) return;
  const b = req.body || {};
  const nom = texte(b.nom, 40);
  const ids = Array.isArray(b.taches) ? [...new Set(b.taches)].slice(0, 20) : [];
  if (nom.length < 2) return res.status(400).json({ erreur: 'Votre nom est requis (2 caractères minimum).' });
  if (!ids.length) return res.status(400).json({ erreur: 'Cochez au moins une tâche.' });
  const type = TYPES_PORTEUR.includes(b.type) ? b.type : 'citoyen';
  const trouvees = (p.taches || []).filter((t) => ids.includes(t.id));
  if (!trouvees.length) return res.status(404).json({ erreur: 'Tâche introuvable' });
  for (const t of trouvees) {
    t.inscrits = t.inscrits || [];
    if (!t.inscrits.some((i) => i.nom === nom)) t.inscrits.push({ nom, type, le: new Date().toISOString().slice(0, 10) });
  }
  sauvegarder();
  res.json(enrichirProjet(p));
});

app.patch('/api/projects/:id/taches/:tacheId', (req, res) => {
  const p = trouverProjet(req, res);
  if (!p) return;
  const t = (p.taches || []).find((x) => x.id === req.params.tacheId);
  if (!t) return res.status(404).json({ erreur: 'Tâche introuvable' });
  if (typeof req.body?.fait !== 'boolean') return res.status(400).json({ erreur: 'Champ « fait » attendu (vrai ou faux).' });
  t.fait = req.body.fait;
  sauvegarder();
  res.json(enrichirProjet(p));
});

// Offres : les partenaires publient ce qu'ils peuvent donner
app.get('/api/offers', (_req, res) => {
  res.json([...db.offres].sort((a, b) => (b.creeLe || '').localeCompare(a.creeLe || '')).map((o) => {
    const part = partenaireParId(o.partnerId);
    const projets = db.projets
      .filter((p) => p.statut !== 'realise' && p.besoins.includes(o.type))
      .map((p) => ({ id: p.id, titre: p.titre }));
    return { ...o, partenaire: part ? { id: part.id, nom: part.nom, type: part.type } : null, projetsCorrespondants: projets };
  }));
});

app.post('/api/offers', (req, res) => {
  const b = req.body || {};
  const titre = texte(b.titre, 80);
  if (!partenaireParId(b.partnerId) || !BESOINS[b.type] || titre.length < 3) {
    return res.status(400).json({ erreur: 'Partenaire, type et titre requis.' });
  }
  const offre = { id: nouvelId('of'), partnerId: b.partnerId, type: b.type, titre, details: texte(b.details, 200), creeLe: new Date().toISOString().slice(0, 10) };
  db.offres.push(offre);
  sauvegarder();
  res.status(201).json(offre);
});

// Tableau de bord Ville / SDC
app.get('/api/dashboard', (_req, res) => {
  const projets = db.projets;
  const membres = projets.flatMap((p) => p.equipe).filter((m) => partenaireParId(m.partnerId));
  const acceptes = membres.filter((m) => m.statut === 'accepte');
  const repondu = membres.filter((m) => m.statut !== 'invite');

  const parTheme = {};
  for (const p of projets) for (const t of themesPrincipaux(p.themes || {}, 1)) parTheme[t] = (parTheme[t] || 0) + 1;

  // Un besoin est comblé quand un partenaire ENGAGÉ dans le projet sait l'offrir
  const nonCombles = {};
  for (const p of projets.filter((p) => p.statut !== 'realise')) {
    const capa = new Set(p.equipe.filter((m) => m.statut === 'accepte').flatMap((m) => partenaireParId(m.partnerId)?.capacites || []));
    for (const b of p.besoins) if (!capa.has(b)) nonCombles[b] = (nonCombles[b] || 0) + 1;
  }

  const parStatut = { recherche: 0, en_cours: 0, realise: 0 };
  for (const p of projets) parStatut[p.statut] = (parStatut[p.statut] || 0) + 1;

  res.json({
    source: db.source,
    kpi: {
      projets: projets.length,
      tachesPourvues: projets.reduce((n, p) => n + progressionTaches(p).pourvues, 0),
      tachesTotal: projets.reduce((n, p) => n + progressionTaches(p).total, 0),
      partenariats: acceptes.length,
      partenairesMobilises: new Set(acceptes.map((m) => m.partnerId)).size,
      tauxReponse: membres.length ? Math.round((repondu.length / membres.length) * 100) : 0,
      realises: parStatut.realise,
      offres: db.offres.length
    },
    parStatut,
    parTheme: Object.entries(parTheme).map(([cle, n]) => ({ cle, label: THEMES[cle].label, n })).sort((a, b) => b.n - a.n),
    besoinsNonCombles: Object.entries(nonCombles).map(([cle, n]) => ({ cle, label: BESOINS[cle], n })).sort((a, b) => b.n - a.n),
    carte: projets.filter((p) => p.lat != null).map((p) => ({ id: p.id, titre: p.titre, lat: p.lat, lng: p.lng, statut: p.statut }))
  });
});

// Remise à zéro : on régénère le jeu de démonstration (ou un état vide avec PCM_SANS_GRAINES=1)
app.post('/api/reset', async (_req, res, next) => {
  try {
    viderEtat();
    if (!SANS_GRAINES) await genererGraines();
    res.json({ ok: true, projets: db.projets.length, offres: db.offres.length });
  } catch (e) { next(e); }
});

app.use('/api', (_req, res) => res.status(404).json({ erreur: 'Route inconnue' }));

// En production : sert le frontend compilé
const DIST = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.type === 'entity.too.large' ? 413 : err.status || 500).json({ erreur: err.status === 400 ? 'Requête invalide' : 'Erreur serveur' });
});

await initEmbeddings();
const { etatRepris } = await chargerDonnees();
if (!etatRepris && !SANS_GRAINES) await genererGraines();

app.listen(PORT, () => {
  const source = db.source === 'ville' ? 'données de la Ville (locales)' : 'données FICTIVES de démonstration';
  console.log(`API PCM sur http://localhost:${PORT}`);
  console.log(`  ${source} : ${db.partenaires.length} partenaires, ${db.evenements.length} événements, ${db.projets.length} projets, ${db.offres.length} offres`);
});
