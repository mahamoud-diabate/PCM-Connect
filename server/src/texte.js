// Similarité de texte LOCALE (TF-IDF), sans modèle ni service externe.
// Complète le lexique de thèmes : une idée qui n'emploie aucun mot-clé du lexique
// peut quand même rejoindre un partenaire dont la description partage des mots rares.
import { normaliser } from './themes.js';

const MOTS_VIDES = new Set(`a au aux avec ce ces dans de des du elle en et eux il ils je la le les leur leurs lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c d j l m n s t y ete etre avoir fait faire plus tres tout tous toute toutes cette cet sans sous entre chez comme aussi bien peu afin dont lors alors etc inc ltee enr cie quebec ville quartier saint roch projet projets`.split(/\s+/));

/** Découpe un texte en racines simples (pluriels et quelques suffixes retirés). */
export function racines(texte = '') {
  return normaliser(texte)
    .split(/[\s-]+/)
    .filter((m) => m.length > 2 && !MOTS_VIDES.has(m) && !/^\d+$/.test(m))
    .map((m) => m.replace(/(ements|ement|ations|ation|euses|euse|eurs|eur|ives|ive|ites|ite)$/, '').replace(/[sx]$/, ''))
    .filter((m) => m.length > 2);
}

/** Construit un index TF-IDF sur un corpus de documents { id, texte }. */
export function construireIndex(documents) {
  const df = new Map();
  const toks = documents.map((d) => {
    const t = racines(d.texte);
    for (const m of new Set(t)) df.set(m, (df.get(m) || 0) + 1);
    return t;
  });
  const N = Math.max(1, documents.length);
  const idf = (m) => Math.log(1 + N / (1 + (df.get(m) || 0)));
  const vecteur = (tokens) => {
    const tf = new Map();
    for (const m of tokens) tf.set(m, (tf.get(m) || 0) + 1);
    const v = new Map();
    let norme = 0;
    for (const [m, n] of tf) {
      const w = (1 + Math.log(n)) * idf(m);
      v.set(m, w);
      norme += w * w;
    }
    return { v, norme: Math.sqrt(norme) || 1 };
  };
  const vecteurs = new Map(documents.map((d, i) => [d.id, vecteur(toks[i])]));
  return {
    requete: (texte) => vecteur(racines(texte)),
    similarite(requete, id) {
      const doc = vecteurs.get(id);
      if (!doc || !requete.v.size) return 0;
      let dot = 0;
      for (const [m, w] of requete.v) if (doc.v.has(m)) dot += w * doc.v.get(m);
      return dot / (requete.norme * doc.norme);
    }
  };
}
