// Lexique thématique : permet de comprendre une idée écrite en langage courant
// et de la relier aux domaines d'intervention / catégories des partenaires.

export const THEMES = {
  verdissement: {
    label: 'Verdissement & environnement',
    mots: ['arbre', 'arbres', 'planter', 'plantation', 'plantes', 'plante', 'vert', 'verte', 'verts', 'vertes', 'verdir', 'verdissement',
      'jardin', 'jardins', 'potager', 'fleur', 'fleurs', 'vegetal', 'vegetaliser', 'canopee', 'ilot de chaleur', 'ilots de chaleur',
      'fraicheur', 'environnement', 'ecologie', 'ecologique', 'biodiversite', 'compost', 'pollinisateur', 'horticulture',
      'paysager', 'paysagiste', 'fleuriste', 'pepiniere', 'jardinerie', 'agriculture urbaine', 'bacs', 'ruelle verte', 'ruelles vertes']
  },
  culture: {
    label: 'Culture & arts',
    mots: ['art', 'arts', 'artiste', 'artistes', 'culture', 'culturel', 'culturelle', 'musique', 'concert', 'spectacle', 'theatre',
      'danse', 'galerie', 'exposition', 'murale', 'cinema', 'patrimoine', 'patrimonial', 'histoire', 'creation', 'photo',
      'litterature', 'lecture', 'livres', 'librairie', 'musee', 'salle de spectacle', 'disquaire', 'artisanat', 'design', 'mode', 'arts visuels', 'art public']
  },
  alimentation: {
    label: 'Alimentation',
    mots: ['alimentation', 'alimentaire', 'nourriture', 'repas', 'cuisine', 'epicerie', 'frigo', 'fruits', 'legumes',
      'depannage', 'restaurant', 'restauration', 'cafe', 'bistro', 'boulangerie', 'patisserie', 'boucherie', 'fromagerie', 'traiteur', 'alimentaire', 'dejeuner', 'gaspillage', 'surplus', 'securite alimentaire']
  },
  entraide: {
    label: 'Entraide & inclusion',
    mots: ['itinerance', 'itinerant', 'entraide', 'solidarite', 'vulnerable', 'inclusion', 'immigration', 'immigrant',
      'immigrants', 'accueil', 'refugie', 'pauvrete', 'insertion', 'sante mentale', 'aines', 'aine', 'isolement',
      'integration', 'partage', 'partager', 'organisme communautaire', 'sante', 'services sociaux']
  },
  jeunesse: {
    label: 'Jeunesse & famille',
    mots: ['jeune', 'jeunes', 'jeunesse', 'enfant', 'enfants', 'famille', 'familles', 'familial', 'familiale', 'ecole',
      'etudiant', 'etudiants', 'ado', 'ados', 'adolescent', 'parents']
  },
  sport: {
    label: 'Sport & loisirs',
    mots: ['sport', 'sports', 'sportif', 'course', 'courir', 'velo', 'yoga', 'plein air', 'soccer', 'basket', 'activite physique',
      'petanque', 'echecs', 'jeu', 'jeux', 'loisir', 'loisirs', 'tournoi', 'gym', 'gymnase', 'entrainement', 'centre sportif', 'escalade', 'plein-air']
  },
  proprete: {
    label: 'Propreté & cadre de vie',
    mots: ['proprete', 'nettoyage', 'nettoyer', 'dechets', 'corvee', 'graffiti', 'embellissement', 'embellir', 'mobilier',
      'eclairage', 'securite', 'cohabitation', 'securitaire']
  },
  commerce: {
    label: 'Commerce local',
    mots: ['commerce', 'commerces', 'commercant', 'commercants', 'boutique', 'vitrine', 'vitrines', 'local vacant', 'achat local',
      'vente', 'marche', 'rabais', 'entrepreneur', 'entrepreneurs', 'ephemere', 'pop-up', 'popup', 'economie', 'artisans']
  },
  evenement: {
    label: 'Fête & animation',
    mots: ['fete', 'festival', 'evenement', 'evenements', 'animation', 'bar', 'microbrasserie', 'brasserie', 'spectacle', 'rassemblement', 'celebration', 'pique-nique', 'voisins', 'soiree',
      'rencontre', 'rencontres', 'party']
  },
  numerique: {
    label: 'Numérique & innovation',
    mots: ['numerique', 'techno', 'technologie', 'technologies', 'innovation', 'code', 'informatique', 'application',
      'jeu video', 'jeux video', 'donnees', 'intelligence artificielle', 'logiciel', 'logiciels', 'informatique', 'telecommunications', 'multimedia']
  }
};

export const BESOINS = {
  benevoles: 'Bénévoles',
  materiel: 'Matériel',
  local: 'Local / espace',
  financement: 'Financement / commandite',
  visibilite: 'Visibilité / promotion',
  expertise: 'Expertise / conseils'
};

// Ce que chaque type de partenaire peut habituellement apporter (si non précisé dans les données)
export const CAPACITES_PAR_TYPE = {
  organisme: ['benevoles', 'expertise', 'visibilite'],
  commerce: ['visibilite', 'materiel', 'financement'],
  entreprise: ['financement', 'expertise', 'benevoles']
};

export function normaliser(texte = '') {
  return String(texte)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const cacheRegex = new Map();
function regexMot(mot) {
  if (!cacheRegex.has(mot)) {
    const m = normaliser(mot).replace(/[-]/g, '[- ]?');
    cacheRegex.set(mot, new RegExp(`(^|\\s)${m}(s|x)?(?=\\s|$)`));
  }
  return cacheRegex.get(mot);
}

/** Retourne un vecteur { theme: poids } (poids entre 0 et 1) */
export function detecterThemes(texte) {
  const t = normaliser(texte);
  const vecteur = {};
  for (const [cle, { mots }] of Object.entries(THEMES)) {
    let n = 0;
    for (const mot of new Set(mots)) if (regexMot(mot).test(t)) n++;
    if (n > 0) vecteur[cle] = Math.min(1, 0.5 + n * 0.25);
  }
  return vecteur;
}

export function cosinus(a, b) {
  const cles = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, na = 0, nb = 0;
  for (const k of cles) {
    const x = a[k] || 0, y = b[k] || 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function themesPrincipaux(vecteur, n = 3) {
  return Object.entries(vecteur)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([cle]) => cle);
}
