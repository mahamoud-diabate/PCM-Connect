import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useMeta, LIBELLES, oublierMeta } from '../api.js';
import Icone from '../components/Icone.jsx';
import { MarqueDemo, Alerte } from '../components/Ui.jsx';

const VIDE = { partnerId: '', type: 'local', titre: '', details: '' };

/** Recherche d'une organisation par son nom (l'annuaire complet n'est jamais chargé dans la page) */
function ChoixPartenaire({ valeur, onChoix }) {
  const [q, setQ] = useState('');
  const [resultats, setResultats] = useState([]);
  useEffect(() => {
    if (valeur || q.trim().length < 2) { setResultats([]); return; }
    const t = setTimeout(() => api.chercherPartenaires(q.trim()).then(setResultats).catch(() => setResultats([])), 200);
    return () => clearTimeout(t);
  }, [q, valeur]);

  if (valeur) {
    return (
      <div className="choisi">
        <span><Icone nom={valeur.type} taille={16} /> {valeur.nom}</span>
        <button type="button" className="lien" onClick={() => { onChoix(null); setQ(''); }}>Changer</button>
      </div>
    );
  }
  return (
    <div className="recherche-partenaire">
      <div className="champ-icone">
        <Icone nom="recherche" taille={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tapez au moins 2 lettres du nom" aria-label="Chercher votre organisation" />
      </div>
      {resultats.length > 0 && (
        <ul className="suggestions" role="listbox">
          {resultats.map((p) => (
            <li key={p.id}>
              <button type="button" role="option" aria-selected="false" onClick={() => onChoix(p)}>
                <Icone nom={p.type} taille={16} /> <span>{p.nom}</span> <small className="discret">{LIBELLES.type[p.type]}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && !resultats.length && <p className="discret petit">Aucune organisation trouvée.</p>}
    </div>
  );
}

export default function Offres() {
  const { meta } = useMeta();
  const [offres, setOffres] = useState([]);
  const [formOuvert, setFormOuvert] = useState(false);
  const [f, setF] = useState(VIDE);
  const [partenaire, setPartenaire] = useState(null);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  const besoins = meta?.besoins || [];
  const charger = () => api.offres().then(setOffres).catch((e) => setErreur(e.message));
  useEffect(() => { charger(); }, []);

  const libelle = (cle) => besoins.find((b) => b.cle === cle)?.label || cle;

  const publier = async (e) => {
    e.preventDefault();
    setErreur('');
    try {
      await api.creerOffre({ ...f, partnerId: partenaire?.id });
      setF(VIDE);
      setPartenaire(null);
      setFormOuvert(false);
      setMessage('Offre publiée. Les projets qui en ont besoin la verront dans leur constellation.');
      oublierMeta();
      charger();
    } catch (err) { setErreur(err.message); }
  };

  return (
    <div className="page-offres">
      <div className="titre-section">
        <div>
          <h1>Offres du quartier</h1>
          <p className="discret">Commerces, entreprises et organismes publient ce qu'ils peuvent donner. PCM les relie aux projets qui en ont besoin.</p>
        </div>
        {!formOuvert && <button className="bouton bouton-principal" onClick={() => { setFormOuvert(true); setMessage(''); }}><Icone nom="plus" taille={18} />Publier une offre</button>}
      </div>

      {message && <p className="bandeau-info" role="status"><Icone nom="check" taille={18} /> {message}</p>}
      {erreur && <Alerte>{erreur}</Alerte>}

      {formOuvert && (
        <form onSubmit={publier} className="carte formulaire formulaire-offre">
          <h2>Nouvelle offre</h2>
          <div className="champ">
            <span>Votre organisation</span>
            <ChoixPartenaire valeur={partenaire} onChoix={setPartenaire} />
          </div>
          <div className="deux-colonnes">
            <label className="champ">
              <span>Vous offrez</span>
              <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                {besoins.map((b) => <option key={b.cle} value={b.cle}>{b.label}</option>)}
              </select>
            </label>
            <label className="champ">
              <span>Titre de l'offre</span>
              <input value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} required minLength={3} maxLength={80} placeholder="Ex. : Salle libre le dimanche" />
            </label>
          </div>
          <label className="champ">
            <span>Détails</span>
            <input value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} maxLength={200} placeholder="Capacité, disponibilités…" />
          </label>
          <div className="actions">
            <button className="bouton bouton-principal" type="submit" disabled={!partenaire || f.titre.trim().length < 3}>Publier</button>
            <button className="bouton bouton-fantome" type="button" onClick={() => setFormOuvert(false)}>Annuler</button>
          </div>
        </form>
      )}

      <ul className="grille-cartes">
        {offres.map((o) => (
          <li key={o.id} className="carte">
            <div className="ligne-haut">
              <span className="badge badge-neutre"><Icone nom="offres" taille={13} />{libelle(o.type)}</span>
              {o.demo && <MarqueDemo />}
            </div>
            <h3>{o.titre}</h3>
            <p className="discret petit">par {o.partenaire?.nom || 'organisation retirée'}{o.details ? ` · ${o.details}` : ''}</p>
            {o.projetsCorrespondants.length > 0 ? (
              <div className="correspond">
                <span className="badge badge-accent">{o.projetsCorrespondants.length} projet{o.projetsCorrespondants.length > 1 ? 's en ont' : ' en a'} besoin</span>
                <ul>
                  {o.projetsCorrespondants.map((p) => <li key={p.id}><Link to={`/projet/${p.id}`}>{p.titre}</Link></li>)}
                </ul>
              </div>
            ) : (
              <p className="discret petit">Aucun projet en cours n'a encore ce besoin.</p>
            )}
          </li>
        ))}
        {!offres.length && <li className="carte discret">Aucune offre publiée pour l'instant.</li>}
      </ul>
    </div>
  );
}
