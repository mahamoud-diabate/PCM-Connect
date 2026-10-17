// IA sémantique LOCALE (optionnelle).
// Activez-la avec :  npm i @xenova/transformers   puis   USE_EMBEDDINGS=1 npm start
// Le modèle tourne sur votre machine : aucune donnée confidentielle n'est envoyée à un service externe.
// (Le modèle est téléchargé une seule fois depuis Hugging Face au premier lancement.)

let extracteur = null;
let actif = false;

export async function initEmbeddings() {
  if (process.env.USE_EMBEDDINGS !== '1') return false;
  try {
    const { pipeline } = await import('@xenova/transformers');
    extracteur = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
    actif = true;
    console.log('🧠 IA sémantique locale activée (paraphrase-multilingual-MiniLM-L12-v2)');
  } catch (e) {
    console.warn('⚠️  Embeddings non disponibles, utilisation du lexique thématique :', e.message);
  }
  return actif;
}

export const embeddingsActifs = () => actif;

export async function vecteur(texte) {
  if (!actif) return null;
  const sortie = await extracteur(texte, { pooling: 'mean', normalize: true });
  return Array.from(sortie.data);
}

export function similarite(a, b) {
  if (!a || !b) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  // On ramène le cosinus typique (0.2 – 0.8) sur 0 – 1
  return Math.max(0, Math.min(1, (s - 0.2) / 0.6));
}
