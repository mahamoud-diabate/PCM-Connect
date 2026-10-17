// Tests du moteur et de l'API, sur le jeu FICTIF (jamais sur les données de la Ville).
// Lancer : npm test (dans server/ ou à la racine)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME = path.join(os.tmpdir(), `pcm-test-${process.pid}.json`);
process.env.PCM_DONNEES = 'demo';
process.env.PCM_RUNTIME = RUNTIME;

const { db, chargerDonnees } = await import('../src/store.js');
const { suggerer } = await import('../src/matching.js');
const { genererGraines } = await import('../src/graines.js');
const { racines } = await import('../src/texte.js');

before(async () => { await chargerDonnees(); });
after(() => { if (fs.existsSync(RUNTIME)) fs.unlinkSync(RUNTIME); });

test('le mode démo charge uniquement le jeu fictif', () => {
  assert.equal(db.source, 'demo');
  assert.equal(db.partenaires.length, 27);
});

test('racines : pluriels et suffixes simples', () => {
  assert.deepEqual(racines('Les arbres plantés'), ['arbre', 'plante']);
});

test('« Verdir notre ruelle » trouve les acteurs du verdissement et un îlot de chaleur', async () => {
  const r = await suggerer({ titre: 'Verdir notre ruelle', description: 'Planter des arbres et des bacs de fleurs', besoins: ['benevoles', 'materiel'], lat: 46.8142, lng: -71.2255 });
  assert.ok(r.themes.some((t) => t.cle === 'verdissement'));
  const ids = r.qui.map((p) => p.id);
  assert.ok(ids.includes('o1'), 'Collectif Ruelles Vertes attendu');
  assert.ok(ids.includes('s1'), 'Pépinière attendue');
  assert.equal(r.ou[0].type, 'ilot_chaleur');
  for (const p of r.qui) assert.ok(p.raisons.length >= 2, 'chaque suggestion est expliquée');
});

test('une idée sans mot du lexique trouve quand même un partenaire (TF-IDF)', async () => {
  const r = await suggerer({ titre: 'Tournoi d\'échecs', description: 'Un tournoi d\'échecs pour briser l\'isolement des aînés', besoins: [] });
  assert.ok(r.qui.some((p) => p.id === 'o8'), 'Aînés en Action (jeux, échecs) attendu');
});

test('une idée vide de sens ne renvoie pas tout l\'annuaire', async () => {
  const r = await suggerer({ titre: 'zzz', description: 'qwerty asdf', besoins: [] });
  assert.equal(r.qui.length, 0);
});

test('le jeu de démonstration est complet et cohérent', async () => {
  await genererGraines();
  assert.equal(db.projets.length, 5);
  assert.equal(db.offres.length, 5);
  const verdir = db.projets.find((p) => p.titre.includes('ruelle'));
  assert.equal(verdir.taches.length, 6, 'six coups de main attendus sur le projet de verdissement');
  assert.ok(verdir.taches.some((t) => t.inscrits.length >= t.places), 'au moins une tâche déjà pourvue');
  assert.ok(verdir.taches.some((t) => t.fait), 'au moins une tâche déjà terminée');
  for (const p of db.projets) {
    assert.ok(p.demo);
    assert.ok(p.equipe.length >= 2);
    for (const m of p.equipe) assert.ok(db.partenaires.some((x) => x.id === m.partnerId));
  }
  assert.ok(db.projets.some((p) => p.statut === 'realise'));
  assert.ok(db.projets.some((p) => p.statut === 'en_cours'));
  assert.ok(db.projets.some((p) => p.statut === 'recherche'));
  assert.ok(fs.existsSync(RUNTIME));
});

// ---------- API ----------
const PORT = 3900 + (process.pid % 90);
const URL_API = `http://127.0.0.1:${PORT}/api`;
let serveur;

async function attendre() {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${URL_API}/meta`)).ok) return; } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Le serveur ne démarre pas');
}
const appel = (chemin, methode = 'GET', corps) =>
  fetch(URL_API + chemin, { method: methode, headers: { 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined });

test('API : validation et parcours complet', async (t) => {
  const rt = RUNTIME + '.api.json';
  serveur = spawn(process.execPath, [path.join(ICI, '..', 'src', 'index.js'), '--demo'], { env: { ...process.env, PORT: String(PORT), PCM_RUNTIME: rt }, stdio: 'ignore' });
  t.after(() => { serveur.kill(); if (fs.existsSync(rt)) fs.unlinkSync(rt); });
  await attendre();

  const meta = await (await appel('/meta')).json();
  assert.equal(meta.source, 'demo');
  assert.equal(meta.stats.projets, 5);

  assert.equal((await appel('/projects', 'POST', { titre: '' })).status, 400);
  assert.equal((await appel('/match', 'POST', {})).status, 400);
  assert.equal((await appel('/offers', 'POST', { partnerId: 'inconnu', type: 'local', titre: 'Salle' })).status, 400);

  const cree = await appel('/projects', 'POST', {
    titre: 'Fête de ruelle', description: 'Une fête de voisins', besoins: ['benevoles', 'pirate'], lat: 'x',
    porteur: { nom: 'Test', type: 'admin' }, invites: [{ partnerId: 'o1', raisons: ['Domaine'] }, { partnerId: 'inconnu' }]
  });
  assert.equal(cree.status, 201);
  const p = await cree.json();
  assert.deepEqual(p.besoins, ['benevoles'], 'besoin inconnu ignoré');
  assert.equal(p.lat, null, 'coordonnée invalide ignorée');
  assert.equal(p.porteur.type, 'citoyen', 'type de porteur inconnu ramené à citoyen');
  assert.equal(p.equipe.length, 1, 'partenaire inconnu ignoré');

  assert.equal((await appel(`/projects/${p.id}`, 'PATCH', { statut: 'pirate' })).status, 400);
  assert.equal((await appel(`/projects/${p.id}`, 'PATCH', { statut: 'realise' })).status, 400, 'pas de projet réalisé sans partenaire engagé');
  const rep = await (await appel(`/projects/${p.id}/equipe/o1`, 'PATCH', { statut: 'accepte' })).json();
  assert.equal(rep.statut, 'en_cours');
  assert.equal((await appel(`/projects/${p.id}`, 'PATCH', { statut: 'realise' })).status, 200);

  const recherche = await (await appel('/partners?q=caf')).json();
  assert.ok(recherche.length >= 1 && recherche.length <= 30);

  const reset = await (await appel('/reset', 'POST')).json();
  assert.equal(reset.projets, 5);
  assert.equal(reset.offres, 5);

  // ---------- Coups de main ----------
  const projet = (await (await appel('/projects')).json())[0];
  assert.ok(projet.progression.total > 0, 'le projet de démonstration porte des tâches');
  assert.equal(typeof projet.progression.pourcentage, 'number');

  const avant = projet.progression.pourvues;
  assert.equal((await appel(`/projects/${projet.id}/taches`, 'POST', { libelle: 'x' })).status, 400, 'libellé trop court refusé');
  assert.equal((await appel(`/projects/${projet.id}/contribuer`, 'POST', { nom: 'Test', taches: [] })).status, 400, 'aucune tâche cochée refusée');
  assert.equal((await appel(`/projects/${projet.id}/contribuer`, 'POST', { nom: '', taches: [projet.taches[0].id] })).status, 400, 'nom manquant refusé');

  const ajout = await appel(`/projects/${projet.id}/taches`, 'POST', { libelle: 'Nettoyer après la plantation', besoin: 'benevoles', places: 2 });
  assert.equal(ajout.status, 201);
  const apresAjout = await ajout.json();
  const nouvelle = apresAjout.taches.find((t) => t.libelle === 'Nettoyer après la plantation');
  assert.equal(apresAjout.progression.total, projet.progression.total + 1);
  assert.equal(apresAjout.progression.pourvues, avant, 'une tâche vide ne fait pas monter la progression');

  const inscrit = await (await appel(`/projects/${projet.id}/contribuer`, 'POST', { nom: 'Rosa (test)', type: 'commerce', taches: [nouvelle.id] })).json();
  const tacheApres = inscrit.taches.find((t) => t.id === nouvelle.id);
  assert.equal(tacheApres.inscrits.length, 1);
  assert.equal(tacheApres.pourvue, false, '1 personne pour 2 places : pas encore pourvue');

  const deuxieme = await (await appel(`/projects/${projet.id}/contribuer`, 'POST', { nom: 'Karim (test)', taches: [nouvelle.id] })).json();
  const pourvue = deuxieme.taches.find((t) => t.id === nouvelle.id);
  assert.equal(pourvue.pourvue, true, 'deux inscriptions pour deux places : pourvue');
  assert.equal(deuxieme.progression.pourvues, avant + 1, 'la progression monte');
  assert.equal(deuxieme.progression.pourcentage, Math.round(((avant + 1) / deuxieme.progression.total) * 100));

  const double = await (await appel(`/projects/${projet.id}/contribuer`, 'POST', { nom: 'Rosa (test)', taches: [nouvelle.id] })).json();
  assert.equal(double.taches.find((t) => t.id === nouvelle.id).inscrits.length, 2, 'même nom : pas de doublon');

  assert.equal((await appel(`/projects/${projet.id}/taches/${nouvelle.id}`, 'PATCH', { fait: 'oui' })).status, 400, 'fait doit être un booléen');
  const termine = await (await appel(`/projects/${projet.id}/taches/${nouvelle.id}`, 'PATCH', { fait: true })).json();
  assert.equal(termine.progression.faites, deuxieme.progression.faites + 1);
  assert.equal((await appel(`/projects/${projet.id}/taches/inconnue`, 'PATCH', { fait: true })).status, 404);
});
