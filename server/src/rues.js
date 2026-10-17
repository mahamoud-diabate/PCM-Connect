// Coordonnées APPROXIMATIVES des rues et lieux de Saint-Roch.
// Les fichiers de la Ville n'ont pas de numéro civique : on place chaque partenaire
// au centre approximatif de sa rue (avec un léger décalage pour éviter les superpositions).
// 100 % local : aucun service de géocodage externe.
import { normaliser } from './themes.js';

const RUES = {
  'saint-joseph': [46.8124, -71.2250],
  'charest': [46.8113, -71.2240],
  'couronne': [46.8135, -71.2262],
  'pont': [46.8135, -71.2215],
  'dorchester': [46.8137, -71.2290],
  'saint-vallier': [46.8102, -71.2245],
  'roi': [46.8118, -71.2255],
  'chapelle': [46.8130, -71.2200],
  'saint-francois': [46.8132, -71.2245],
  'caron': [46.8126, -71.2232],
  'notre-dame-des-anges': [46.8150, -71.2225],
  'prince-edouard': [46.8150, -71.2240],
  'langelier': [46.8125, -71.2330],
  'abraham': [46.8098, -71.2215],
  'eglise': [46.8125, -71.2240],
  'saint-anselme': [46.8128, -71.2285],
  'christophe-colomb': [46.8160, -71.2215],
  'jean-lesage': [46.8165, -71.2180],
  'croix-rouge': [46.8130, -71.2300],
  'monseigneur-gauvreau': [46.8160, -71.2250],
  'saint-roch': [46.8130, -71.2235],
  'du parvis': [46.8127, -71.2240],
  'sainte-helene': [46.8140, -71.2275],
  'saint-paul': [46.8150, -71.2160],
  'saint-andre': [46.8160, -71.2170],
  'de la salle': [46.8162, -71.2270],
  'arago': [46.8100, -71.2285],
  'grant': [46.8120, -71.2305],
  'du marche-finlay': [46.8150, -71.2150]
};

const LIEUX = {
  'jardin jean-paul-l allier': [46.8133, -71.2207],
  'jardin de saint-roch': [46.8133, -71.2207],
  'parvis': [46.8127, -71.2240],
  'eglise saint-roch': [46.8127, -71.2240],
  'gabrielle-roy': [46.8121, -71.2233],
  'pekans': [46.8139, -71.2236],
  'universite-du-quebec': [46.8140, -71.2200],
  'imperial': [46.8120, -71.2230],
  'parc victoria': [46.8178, -71.2318],
  'saint-roch': [46.8128, -71.2240]
};

function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

function decaler([lat, lng], cle) {
  const h = hash(cle);
  return { lat: lat + ((h % 9) - 4) * 0.00008, lng: lng + (((h >> 4) % 9) - 4) * 0.00012 };
}

/** Coordonnées approximatives d'une rue (ou null si inconnue) */
export function coordRue(nomRue, cleUnique = '') {
  const n = normaliser(nomRue).replace(/\s+/g, '-');
  const n2 = normaliser(nomRue);
  for (const [cle, pos] of Object.entries(RUES)) {
    const c = normaliser(cle);
    if (n.includes(c.replace(/\s+/g, '-')) || n2.includes(c)) return decaler(pos, cleUnique || nomRue);
  }
  return null;
}

/** Coordonnées approximatives d'un lieu nommé (site d'un événement) */
export function coordLieu(texte = '') {
  const n = normaliser(texte).replace(/'/g, ' ');
  for (const [cle, pos] of Object.entries(LIEUX)) if (n.includes(normaliser(cle))) return { lat: pos[0], lng: pos[1] };
  return coordRue(texte);
}
