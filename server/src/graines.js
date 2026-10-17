// Jeu de démonstration : projets et offres FICTIFS, générés au démarrage et à chaque « Réinitialiser la démo ».
// Ils sont construits avec le moteur de suggestion, sur les données chargées (fictives ou réelles) :
// les partenaires invités existent donc toujours. Chaque élément porte `demo: true`
// et l'interface l'affiche comme exemple fictif (les réponses des partenaires sont simulées).
import { db, nouvelId, sauvegarder } from './store.js';
import { suggerer, pertinence } from './matching.js';
import { detecterThemes } from './themes.js';

const IDEES = [
  {
    titre: 'Verdir la ruelle de la Couronne',
    description: 'Planter des arbres, des fleurs et installer des bacs de plantation dans la ruelle pour rafraîchir le quartier.',
    besoins: ['benevoles', 'materiel', 'expertise'], lat: 46.8144, lng: -71.2252,
    porteur: { nom: 'Camille L. (fictive)', type: 'citoyen' }, il_y_a: 12, reponses: ['accepte', 'accepte', 'invite']
  },
  {
    titre: 'Frigo partagé anti-gaspillage',
    description: 'Installer un frigo communautaire où les commerces et les citoyens déposent leurs surplus alimentaires.',
    besoins: ['local', 'materiel'], lat: 46.8127, lng: -71.2243,
    porteur: { nom: 'Café de quartier (fictif)', type: 'commercant' }, il_y_a: 5, reponses: ['invite', 'invite', 'invite']
  },
  {
    titre: 'Galerie éphémère dans un local vacant',
    description: 'Exposer les artistes du quartier dans une vitrine vacante de la rue Saint-Joseph pendant le temps des fêtes.',
    besoins: ['local', 'visibilite', 'financement'], lat: 46.8124, lng: -71.2228,
    porteur: { nom: 'Collectif d\'artistes (fictif)', type: 'organisme' }, il_y_a: 40, reponses: ['accepte', 'accepte', 'accepte'], statut: 'realise'
  },
  {
    titre: 'Corvée de propreté au parc des Pékans',
    description: 'Une matinée de nettoyage et d\'embellissement du parc avec les voisins, suivie d\'un café.',
    besoins: ['benevoles', 'materiel', 'visibilite'], lat: 46.8139, lng: -71.2236,
    porteur: { nom: 'Julien P. (fictif)', type: 'citoyen' }, il_y_a: 8, reponses: ['accepte', 'decline', 'invite']
  },
  {
    titre: 'Atelier numérique pour les aînés',
    description: 'Aider les aînés du quartier à utiliser leur téléphone et les services en ligne, avec des jeunes bénévoles.',
    besoins: ['expertise', 'local'], lat: 46.8121, lng: -71.2233,
    porteur: { nom: 'Nadia B. (fictive)', type: 'citoyen' }, il_y_a: 3, reponses: ['invite', 'invite']
  }
];

const OFFRES = [
  { type: 'materiel', titre: 'Plants et terreau à prix coûtant', details: 'Pour les projets de verdissement de Saint-Roch', requete: 'fleuriste horticulture plantes jardin pepiniere', types: ['commerce', 'entreprise'], il_y_a: 15 },
  { type: 'local', titre: 'Salle communautaire libre le dimanche', details: '40 places, cuisine équipée', requete: 'entraide communautaire alimentation cuisine', types: ['organisme'], il_y_a: 13 },
  { type: 'benevoles', titre: 'Une équipe d\'employés pour une journée de bénévolat', details: 'Journée d\'engagement, printemps 2027', requete: 'construction amenagement paysager entreprise', types: ['entreprise'], il_y_a: 11 },
  { type: 'visibilite', titre: '200 affiches imprimées gratuitement', details: 'Pour un projet citoyen par mois', requete: 'imprimerie impression affichage graphisme publicite', types: ['entreprise', 'commerce'], il_y_a: 8 },
  { type: 'financement', titre: 'Commandite de 300 $ pour une fête de rue', details: 'Une fois par saison', requete: 'cafe bistro restaurant microbrasserie bar', types: ['commerce'], il_y_a: 6 }
];

// Tâches de démonstration : [libellé, besoin, places, personnes déjà inscrites, terminée]
const TACHES = [
  [["Apporter pelles, gants et brouettes", "materiel", 2, 2, false],
   ["Fournir le terreau et le compost", "materiel", 1, 1, true],
   ["Planter les douze arbres", "benevoles", 6, 3, false],
   ["Monter les bacs de plantation", "benevoles", 3, 2, false],
   ["Aider les familles le samedi matin", "benevoles", 4, 1, false],
   ["Prendre des photos et publier", "visibilite", 1, 0, false]],
  [["Prêter un frigo et le brancher", "materiel", 1, 0, false],
   ["Trouver le local et les horaires", "local", 2, 1, false],
   ["Recruter trois bénévoles pour le suivi", "benevoles", 3, 2, false]],
  [["Céder la vitrine pour deux semaines", "local", 1, 1, true],
   ["Accrocher les œuvres", "benevoles", 4, 4, true],
   ["Financer l'impression des affiches", "financement", 2, 1, false]],
  [["Apporter gants et sacs de collecte", "materiel", 2, 1, false],
   ["Nettoyer la zone de jeux", "benevoles", 5, 3, false],
   ["Offrir le café des bénévoles", "materiel", 1, 1, false]],
  [["Prêter un local avec accès Internet", "local", 1, 1, false],
   ["Animer l'atelier pendant deux heures", "expertise", 2, 0, false],
   ["Prêter quatre tablettes", "materiel", 1, 1, false]]
];

const BÉNÉVOLES_FICTIFS = ['Rose M. (fictive)', 'Karim B. (fictif)', 'Léa T. (fictive)', 'Samir H. (fictif)', 'Awa D. (fictive)', 'Théo R. (fictif)'];

const ilYa = (jours) => new Date(Date.now() - jours * 86400000).toISOString().slice(0, 10);

function choisirPartenaire(offre, dejaPris) {
  const requete = db.index.requete(offre.requete);
  const themesProjet = detecterThemes(offre.requete);
  let meilleur = null;
  for (const p of db.partenaires) {
    if (dejaPris.has(p.id) || !offre.types.includes(p.type)) continue;
    const { sem, semTexte } = pertinence(p, { themesProjet, requete, vecProjet: null });
    const s = sem + 0.5 * semTexte + (p.capacites.includes(offre.type) ? 0.2 : 0);
    if (!meilleur || s > meilleur.s) meilleur = { p, s };
  }
  return meilleur?.p || null;
}

export async function genererGraines() {
  db.offres = [];
  db.projets = [];
  if (!db.partenaires.length) return;

  const pris = new Set();
  for (const o of OFFRES) {
    const p = choisirPartenaire(o, pris);
    if (!p) continue;
    pris.add(p.id);
    db.offres.push({ id: nouvelId('of'), partnerId: p.id, type: o.type, titre: o.titre, details: o.details, creeLe: ilYa(o.il_y_a), demo: true });
  }

  for (const [index, idee] of IDEES.entries()) {
    const res = await suggerer(idee);
    const invites = res.qui.slice(0, idee.reponses.length);
    const equipe = invites.map((p, i) => ({ partnerId: p.id, statut: idee.reponses[i], raisons: p.raisons }));
    const accepte = equipe.some((m) => m.statut === 'accepte');
    db.projets.push({
      id: nouvelId('pr'),
      titre: idee.titre,
      description: idee.description,
      besoins: idee.besoins,
      lat: idee.lat,
      lng: idee.lng,
      lieuId: res.ou[0]?.id || null,
      evenementId: res.quand[0]?.id || null,
      porteur: idee.porteur,
      themes: detecterThemes(`${idee.titre} ${idee.description}`),
      statut: idee.statut || (accepte ? 'en_cours' : 'recherche'),
      creeLe: ilYa(idee.il_y_a),
      equipe,
      taches: (TACHES[index] || []).map(([libelle, besoin, places, inscrits, fait], i) => ({
        id: `ta${index}${i}`,
        libelle,
        besoin,
        places,
        fait,
        inscrits: BÉNÉVOLES_FICTIFS.slice(0, inscrits).map((nom) => ({ nom, type: 'citoyen', le: ilYa(idee.il_y_a - 1) }))
      })),
      demo: true
    });
  }
  sauvegarder();
}
