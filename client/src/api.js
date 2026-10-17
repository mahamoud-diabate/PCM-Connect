import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || '';

async function req(chemin, options = {}) {
  const r = await fetch(BASE + chemin, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erreur || `Erreur ${r.status}`);
  }
  return r.json();
}

export const api = {
  meta: () => req('/api/meta'),
  chercherPartenaires: (q) => req(`/api/partners?q=${encodeURIComponent(q)}`),
  suggerer: (idee) => req('/api/match', { method: 'POST', body: idee }),
  projets: () => req('/api/projects'),
  projet: (id) => req(`/api/projects/${id}`),
  creerProjet: (p) => req('/api/projects', { method: 'POST', body: p }),
  repondre: (id, partnerId, statut) => req(`/api/projects/${id}/equipe/${partnerId}`, { method: 'PATCH', body: { statut } }),
  majProjet: (id, champs) => req(`/api/projects/${id}`, { method: 'PATCH', body: champs }),
  ajouterTache: (id, t) => req(`/api/projects/${id}/taches`, { method: 'POST', body: t }),
  contribuer: (id, c) => req(`/api/projects/${id}/contribuer`, { method: 'POST', body: c }),
  marquerTache: (id, tacheId, fait) => req(`/api/projects/${id}/taches/${tacheId}`, { method: 'PATCH', body: { fait } }),
  offres: () => req('/api/offers'),
  creerOffre: (o) => req('/api/offers', { method: 'POST', body: o }),
  pouls: () => req('/api/dashboard'),
  reset: () => req('/api/reset', { method: 'POST' })
};

// Métadonnées partagées (thèmes, besoins, source des données), chargées une seule fois
let metaCache = null;
let metaPromesse = null;
export function useMeta() {
  const [meta, setMeta] = useState(metaCache);
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    if (metaCache) return;
    metaPromesse ||= api.meta().then((m) => (metaCache = m));
    metaPromesse.then(setMeta).catch((e) => { metaPromesse = null; setErreur(e.message); });
  }, []);
  return { meta, erreur };
}
export const oublierMeta = () => { metaCache = null; metaPromesse = null; };

export const LIBELLES = {
  type: { organisme: 'Organisme', commerce: 'Commerce', entreprise: 'Entreprise' },
  statutProjet: { recherche: 'Cherche son équipe', en_cours: 'En action', realise: 'Réalisé' },
  statutMembre: { invite: 'Invité', accepte: 'Partant', decline: 'Pas disponible' },
  porteur: { citoyen: 'Citoyen·ne', commercant: 'Commerçant·e', organisme: 'Organisme', entreprise: 'Entreprise' },
  lieu: { parc: 'Parc', place: 'Place publique', installation: 'Équipement municipal', ilot_chaleur: 'Îlot de chaleur', vitrine_vide: 'Local vacant' }
};

export const formaterDate = (iso) =>
  iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '';

export const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
