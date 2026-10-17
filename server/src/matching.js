// Moteur de suggestion PCM : QUI (partenaires) · OÙ (lieux) · QUAND (événements) · OFFRES
import { db } from './store.js';
import { THEMES, BESOINS, detecterThemes, cosinus, themesPrincipaux, normaliser } from './themes.js';
import { distanceM, scoreProximite, formaterDistance, CENTRE_SAINT_ROCH } from './geo.js';
import { vecteur, similarite, embeddingsActifs } from './embeddings.js';

export const POIDS = { semantique: 0.55, besoins: 0.25, proximite: 0.2 };

const LIBELLE_SOURCE = {
  organismes_reconnus: 'Organisme reconnu par la Ville',
  organismes_culture: 'Organisme culturel partenaire de la Ville',
  entreprises: 'Entreprise de Saint-Roch',
  sdc: 'Membre de la SDC Centre-Ville'
};

// Affinité entre un thème de projet et un type de lieu
const AFFINITE_LIEU = {
  verdissement: { ilot_chaleur: 1, parc: 0.8 },
  culture: { vitrine_vide: 0.9, place: 0.8, installation: 0.7, parc: 0.5 },
  commerce: { vitrine_vide: 1, place: 0.5 },
  evenement: { place: 1, parc: 0.8 },
  sport: { parc: 1, place: 0.6 },
  jeunesse: { parc: 0.8, installation: 0.8 },
  alimentation: { vitrine_vide: 0.7, installation: 0.6 },
  entraide: { installation: 0.9, vitrine_vide: 0.5 },
  proprete: { parc: 0.8, place: 0.8, ilot_chaleur: 0.5 },
  numerique: { installation: 1, vitrine_vide: 0.6 }
};

const r2 = (x) => Math.round(x * 100) / 100;

// Similarité TF-IDF ramenée sur 0-1 (une valeur de 0,35 est déjà une forte ressemblance pour des textes courts)
const echelleTexte = (s) => Math.min(1, s / 0.35);

/**
 * Proximité d'un partenaire sans coordonnées : on se rabat sur son arrondissement.
 * Saint-Roch fait partie de l'arrondissement La Cité-Limoilou.
 */
function proximiteParDefaut(p) {
  const a = normaliser(p.arrondissement || '');
  if (!a) return 0.3;
  if (a.includes('roch') || a.includes('cite-limoilou') || a.includes('cite limoilou') || a.includes('toute la ville') || a.includes('ensemble')) return 0.5;
  return 0.15;
}

/** Pertinence thématique d'un partenaire pour un texte (0-1), lexique + TF-IDF + IA locale optionnelle. */
export function pertinence(p, { themesProjet, requete, vecProjet }) {
  const semLex = cosinus(themesProjet, p.themes);
  const semTexte = requete ? echelleTexte(db.index.similarite(requete, p.id)) : 0;
  const semIA = embeddingsActifs() ? similarite(vecProjet, p.vec) : 0;
  return { sem: Math.max(semLex, 0.85 * semTexte, semIA), semLex, semTexte, semIA };
}

export async function suggerer({ titre = '', description = '', besoins = [], lat, lng }) {
  const texte = `${titre}. ${description}`;
  const themesProjet = detecterThemes(texte);
  const vecProjet = await vecteur(texte);
  const requete = db.index.requete(texte);
  const point = lat != null && lng != null ? { lat, lng } : CENTRE_SAINT_ROCH;
  const principaux = themesPrincipaux(themesProjet);

  // ---------- QUI : partenaires ----------
  const offresParPartenaire = new Map();
  for (const o of db.offres) {
    if (!offresParPartenaire.has(o.partnerId)) offresParPartenaire.set(o.partnerId, []);
    offresParPartenaire.get(o.partnerId).push(o);
  }

  const partenaires = db.partenaires.map((p) => {
    const { sem, semTexte, semIA } = pertinence(p, { themesProjet, requete, vecProjet });

    const offres = offresParPartenaire.get(p.id) || [];
    const capacites = new Set([...p.capacites, ...offres.map((o) => o.type)]);
    const besoinsCouverts = besoins.filter((b) => capacites.has(b));
    const scoreBesoins = besoins.length ? besoinsCouverts.length / besoins.length : 0;

    const d = distanceM(point, p);
    const prox = scoreProximite(d) ?? proximiteParDefaut(p);
    const score = POIDS.semantique * sem + POIDS.besoins * scoreBesoins + POIDS.proximite * prox;

    const raisons = [];
    const communs = Object.keys(p.themes).filter((t) => themesProjet[t]);
    if (communs.length) raisons.push(`Domaine : ${communs.map((t) => THEMES[t].label).join(', ')}`);
    else if (semIA > 0.4) raisons.push('Mission proche de votre idée (IA locale)');
    else if (semTexte > 0.12) raisons.push('Description proche de votre idée');
    if (besoinsCouverts.length) raisons.push(`Peut offrir : ${besoinsCouverts.map((b) => BESOINS[b].toLowerCase()).join(', ')}`);
    if (d != null && p.coordApprox) raisons.push(`${p.adresse} (${formaterDistance(d).replace('à ', '≈ ')})`);
    else if (d != null) raisons.push(formaterDistance(d));
    else if (p.adresse) raisons.push(p.adresse);
    else if (p.arrondissement) raisons.push(`Actif dans ${p.arrondissement}`);
    raisons.push(LIBELLE_SOURCE[p.source] || p.source);
    for (const o of offres.filter((o) => besoins.includes(o.type))) raisons.push(`Offre publiée : « ${o.titre} »`);

    return {
      id: p.id, nom: p.nom, type: p.type, source: p.source, categorie: p.categorie, domaine: p.domaine,
      adresse: p.adresse, lat: p.lat, lng: p.lng, distance: d,
      score: r2(score), pertinence: r2(sem), besoinsCouverts, raisons
    };
  })
    // Seuls les partenaires réellement liés à l'idée ; si rien n'est compris, ceux qui couvrent au moins un besoin
    .filter((p) => (principaux.length || requete.v.size ? p.pertinence > 0.2 : p.besoinsCouverts.length >= 1))
    .sort((a, b) => b.score - a.score);

  // Un bon mélange : organismes + commerces/entreprises
  const organismes = partenaires.filter((p) => p.type === 'organisme').slice(0, 5);
  const affaires = partenaires.filter((p) => p.type !== 'organisme').slice(0, 5);
  const qui = [...organismes, ...affaires].sort((a, b) => b.score - a.score);

  // ---------- OÙ : lieux ----------
  const ou = db.lieux.map((l) => {
    let aff = 0;
    for (const [t, w] of Object.entries(themesProjet)) aff = Math.max(aff, w * (AFFINITE_LIEU[t]?.[l.type] || 0));
    if (besoins.includes('local') && ['installation', 'vitrine_vide'].includes(l.type)) aff = Math.max(aff, 0.7);
    const d = distanceM(point, l);
    const bonusChaleur = l.type === 'ilot_chaleur' && themesProjet.verdissement ? (l.intensite || 3) / 25 : 0;
    const score = 0.65 * aff + 0.35 * (scoreProximite(d, 1200) ?? 0) + bonusChaleur;
    const raisons = [];
    if (l.type === 'ilot_chaleur') raisons.push(`Îlot de chaleur (intensité ${l.intensite}/5) : verdir ici rafraîchit le quartier`);
    if (l.type === 'vitrine_vide') raisons.push('Local vacant : redonner vie à la rue Saint-Joseph');
    if (l.type === 'parc') raisons.push('Lieu de rassemblement public');
    if (l.type === 'place') raisons.push('Espace public central');
    if (l.type === 'installation') raisons.push('Équipement municipal avec salles');
    raisons.push(formaterDistance(d));
    return { ...l, distance: d, score: r2(Math.min(1, score)), raisons: raisons.filter(Boolean), _tri: score };
  })
    .filter((l) => l._tri > 0.3)
    .sort((a, b) => b._tri - a._tri)
    .slice(0, 4)
    .map(({ _tri, ...l }) => l);

  // ---------- QUAND : événements ----------
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const quand = db.evenements
    .filter((e) => e.date >= aujourdHui)
    .map((e) => {
      const sem = Math.max(cosinus(themesProjet, e.themes), embeddingsActifs() ? similarite(vecProjet, e.vec) : 0);
      const d = distanceM(point, e);
      const score = 0.7 * sem + 0.3 * (scoreProximite(d, 1200) ?? 0);
      const communs = Object.keys(e.themes).filter((t) => themesProjet[t]);
      const raisons = [
        communs.length ? `Même thème : ${communs.map((t) => THEMES[t].label).join(', ')}` : 'Événement rassembleur du quartier',
        'Profitez de la foule pour lancer ou faire connaître votre projet',
        formaterDistance(d)
      ].filter(Boolean);
      return { ...e, vec: undefined, themes: undefined, distance: d, score: r2(score), raisons };
    })
    .filter((e) => e.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // ---------- OFFRES correspondant aux besoins ----------
  const offres = db.offres
    .filter((o) => besoins.includes(o.type))
    .map((o) => {
      const p = db.partenaires.find((x) => x.id === o.partnerId);
      return { ...o, partenaire: p ? { id: p.id, nom: p.nom, type: p.type } : null, distance: distanceM(point, p) };
    });

  return {
    themes: principaux.map((t) => ({ cle: t, label: THEMES[t].label })),
    iaLocale: embeddingsActifs(),
    qui, ou, quand, offres
  };
}

export function messageInvitation(projet, partenaire, raisons = []) {
  const besoins = (projet.besoins || []).map((b) => BESOINS[b]?.toLowerCase()).filter(Boolean).join(', ');
  return `Bonjour ${partenaire.nom},

Je m'appelle ${projet.porteur?.nom || 'un citoyen de Saint-Roch'} et je lance le projet « ${projet.titre} » dans Saint-Roch.

${projet.description}

PCM m'a suggéré votre organisation${raisons.length ? ` (${raisons.slice(0, 2).join(' · ').toLowerCase()})` : ''}. Nous cherchons : ${besoins || 'des partenaires'}.

Accepteriez-vous d'en discuter 15 minutes cette semaine ?

Merci et au plaisir de bâtir Saint-Roch ensemble !
— Envoyé via PCM, Plateforme citoyenne de mobilisation`;
}
