import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, LIBELLES, formaterDate, oublierMeta } from '../api.js';
import MapView, { Legende } from '../components/MapView.jsx';
import Icone from '../components/Icone.jsx';
import { Etapes, TypePartenaire, MarqueDemo, Alerte } from '../components/Ui.jsx';

const ONGLETS = [
  { cle: 'qui', label: 'Qui' },
  { cle: 'ou', label: 'Où' },
  { cle: 'quand', label: 'Quand' },
  { cle: 'offres', label: 'Offres' }
];

function Pertinence({ valeur }) {
  const pct = Math.round(valeur * 100);
  return (
    <span className="pertinence" title="Score de pertinence">
      <span className="pertinence-piste" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
      {pct}&nbsp;%
    </span>
  );
}

export default function Constellation() {
  const { state } = useLocation();
  const nav = useNavigate();
  const idee = useMemo(() => {
    if (state?.idee) return state.idee;
    try { return JSON.parse(sessionStorage.getItem('pcm-brouillon')); } catch { return null; }
  }, [state]);

  const [res, setRes] = useState(null);
  const [erreur, setErreur] = useState('');
  const [onglet, setOnglet] = useState('qui');
  const [choisis, setChoisis] = useState(new Set());
  const [lieuId, setLieuId] = useState(null);
  const [evenementId, setEvenementId] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!idee?.titre) { nav('/idee', { replace: true }); return; }
    api.suggerer(idee)
      .then((r) => {
        setRes(r);
        setChoisis(new Set(r.qui.slice(0, 3).map((p) => p.id))); // présélection des 3 meilleurs
        setLieuId(r.ou[0]?.id || null);
        setEvenementId(r.quand[0]?.id || null);
      })
      .catch((e) => setErreur(e.message));
  }, [idee, nav]);

  const basculer = (id) => {
    const s = new Set(choisis);
    s.has(id) ? s.delete(id) : s.add(id);
    setChoisis(s);
  };

  const creer = async () => {
    setEnvoi(true);
    try {
      const invites = res.qui.filter((p) => choisis.has(p.id)).map((p) => ({ partnerId: p.id, raisons: p.raisons }));
      const projet = await api.creerProjet({
        titre: idee.titre, description: idee.description, besoins: idee.besoins,
        porteur: { nom: idee.porteurNom, type: idee.porteurType },
        lat: idee.lat, lng: idee.lng, lieuId, evenementId, invites
      });
      sessionStorage.removeItem('pcm-brouillon');
      oublierMeta();
      nav(`/projet/${projet.id}`, { state: { nouveau: true } });
    } catch (e) {
      setErreur(e.message);
      setEnvoi(false);
    }
  };

  if (erreur) return <Alerte>{erreur} <Link to="/idee">Revenir à mon idée</Link></Alerte>;
  if (!res) return (
    <div className="chargement" role="status">
      <div className="constellation-anim" aria-hidden="true"><span /><span /><span /></div>
      <p>PCM cherche vos partenaires dans Saint-Roch…</p>
    </div>
  );

  const points = [
    { id: 'moi', lat: idee.lat, lng: idee.lng, genre: 'moi', titre: idee.titre, sousTitre: 'Votre projet', actif: true },
    ...res.qui.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, genre: p.type, titre: p.nom, sousTitre: p.raisons[0], actif: choisis.has(p.id) })),
    ...res.ou.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, genre: 'lieu', titre: l.nom, sousTitre: l.raisons[0], actif: l.id === lieuId })),
    ...res.quand.map((e) => ({ id: e.id, lat: e.lat, lng: e.lng, genre: 'evenement', titre: e.titre, sousTitre: formaterDate(e.date), actif: e.id === evenementId }))
  ];
  const sansAdresse = res.qui.filter((p) => p.lat == null).length;
  const lieu = res.ou.find((l) => l.id === lieuId);
  const evt = res.quand.find((e) => e.id === evenementId);

  return (
    <div className="page-constellation">
      <Etapes actuelle={2} />
      <div className="titre-section">
        <h1>Votre constellation</h1>
        <Link to="/idee" className="lien"><Icone nom="retour" taille={16} /> Modifier l'idée</Link>
      </div>
      <p className="discret">
        Pour «&nbsp;{idee.titre}&nbsp;» · thèmes détectés&nbsp;:{' '}
        {res.themes.length ? res.themes.map((t) => <span key={t.cle} className="chip chip-petit">{t.label}</span>) : 'aucun, précisez votre description'}
        {res.iaLocale && <span className="chip chip-petit">IA locale</span>}
      </p>

      <div className="deux-volets">
        <aside className="volet-carte">
          <MapView points={points} hauteur={360} label="Carte des suggestions" />
          <Legende genres={['moi', 'organisme', 'commerce', 'entreprise', 'lieu', 'evenement']} />
          {sansAdresse > 0 && <p className="discret petit">{sansAdresse} partenaire{sansAdresse > 1 ? 's' : ''} sans adresse précise : suggéré{sansAdresse > 1 ? 's' : ''} selon leur domaine et leur arrondissement.</p>}
          <div className="carte resume">
            <p><Icone nom="equipe" taille={16} /> <strong>{choisis.size}</strong> partenaire{choisis.size > 1 ? 's' : ''} choisi{choisis.size > 1 ? 's' : ''}</p>
            <p><Icone nom="lieu" taille={16} /> {lieu ? lieu.nom : <span className="discret">Aucun lieu</span>}</p>
            <p><Icone nom="date" taille={16} /> {evt ? `${evt.titre}, ${formaterDate(evt.date)}` : <span className="discret">Aucun événement</span>}</p>
          </div>
        </aside>

        <section className="volet-liste">
          <div className="onglets" role="tablist" aria-label="Suggestions">
            {ONGLETS.map((o) => (
              <button key={o.cle} role="tab" id={`onglet-${o.cle}`} aria-controls="panneau" aria-selected={onglet === o.cle}
                className={onglet === o.cle ? 'actif' : ''} onClick={() => setOnglet(o.cle)}>
                {o.label} <span className="compte">{res[o.cle].length}</span>
              </button>
            ))}
          </div>

          <div id="panneau" role="tabpanel" aria-labelledby={`onglet-${onglet}`}>
            {onglet === 'qui' && (
              <ul className="liste" aria-label="Partenaires suggérés">
                {res.qui.map((p) => (
                  <li key={p.id}>
                    <label className={`carte carte-choix ${choisis.has(p.id) ? 'carte-choisie' : ''}`}>
                      <input type="checkbox" checked={choisis.has(p.id)} onChange={() => basculer(p.id)} />
                      <div>
                        <div className="ligne-haut">
                          <TypePartenaire type={p.type} />
                          <Pertinence valeur={p.score} />
                        </div>
                        <h3>{p.nom}</h3>
                        <ul className="raisons">{p.raisons.map((r) => <li key={r}>{r}</li>)}</ul>
                      </div>
                    </label>
                  </li>
                ))}
                {!res.qui.length && <li className="carte discret">Aucun partenaire trouvé. Ajoutez des détails à votre description.</li>}
              </ul>
            )}

            {onglet === 'ou' && (
              <ul className="liste" aria-label="Lieux suggérés">
                {res.ou.map((l) => (
                  <li key={l.id}>
                    <label className={`carte carte-choix ${lieuId === l.id ? 'carte-choisie' : ''}`}>
                      <input type="radio" name="lieu" checked={lieuId === l.id} onChange={() => setLieuId(l.id)} />
                      <div>
                        <span className="badge badge-neutre"><Icone nom="lieu" taille={13} />{LIBELLES.lieu[l.type]}</span>
                        <h3>{l.nom}</h3>
                        <ul className="raisons">{l.raisons.map((r) => <li key={r}>{r}</li>)}</ul>
                      </div>
                    </label>
                  </li>
                ))}
                {!res.ou.length && <li className="carte discret">Aucun lieu ne correspond encore à cette idée.</li>}
              </ul>
            )}

            {onglet === 'quand' && (
              <ul className="liste" aria-label="Événements suggérés">
                {res.quand.map((e) => (
                  <li key={e.id}>
                    <label className={`carte carte-choix ${evenementId === e.id ? 'carte-choisie' : ''}`}>
                      <input type="radio" name="evenement" checked={evenementId === e.id} onChange={() => setEvenementId(e.id)} />
                      <div>
                        <span className="badge badge-neutre"><Icone nom="date" taille={13} />{formaterDate(e.date)}</span>
                        <h3>{e.titre}</h3>
                        {e.lieu && <p className="discret petit">{e.lieu}</p>}
                        <ul className="raisons">{e.raisons.map((r) => <li key={r}>{r}</li>)}</ul>
                      </div>
                    </label>
                  </li>
                ))}
                {!res.quand.length && <li className="carte discret">Aucun événement à venir lié à votre projet.</li>}
              </ul>
            )}

            {onglet === 'offres' && (
              <ul className="liste" aria-label="Offres disponibles">
                {res.offres.map((o) => (
                  <li key={o.id} className="carte">
                    <div className="ligne-haut">
                      <span className="badge badge-accent"><Icone nom="offres" taille={13} />Offre disponible</span>
                      {o.demo && <MarqueDemo />}
                    </div>
                    <h3>{o.titre}</h3>
                    <p className="discret petit">par {o.partenaire?.nom}{o.details ? ` · ${o.details}` : ''}</p>
                  </li>
                ))}
                {!res.offres.length && <li className="carte discret">Aucune offre publiée ne correspond encore à vos besoins.</li>}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="barre-action">
        <span className="discret petit">Les partenaires choisis recevront un message d'invitation prêt à envoyer.</span>
        <button className="bouton bouton-principal bouton-large" disabled={!choisis.size || envoi} onClick={creer}>
          {envoi ? 'Création…' : `Inviter ${choisis.size} partenaire${choisis.size > 1 ? 's' : ''}`} <Icone nom="fleche" taille={18} />
        </button>
      </div>
    </div>
  );
}
