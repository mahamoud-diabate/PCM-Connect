import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, LIBELLES, formaterDate, pluriel, useMeta } from '../api.js';
import MapView, { Legende } from '../components/MapView.jsx';
import Icone from '../components/Icone.jsx';
import { Etapes, StatutProjet, TypePartenaire, Alerte, Chargement } from '../components/Ui.jsx';

const AVANCEMENT = [
  { cle: 'idee', label: 'Idée' },
  { cle: 'recherche', label: 'Équipe' },
  { cle: 'en_cours', label: 'En action' },
  { cle: 'realise', label: 'Réalisé' }
];

/** Coups de main : ce qu'il reste à faire, qui l'apporte, et où en est le projet. */
function CoupsDeMain({ projet, onMaj, onErreur }) {
  const { meta } = useMeta();
  const libelleBesoin = (cle) => meta?.besoins?.find((b) => b.cle === cle)?.label;
  const [choisies, setChoisies] = useState(new Set());
  const [nom, setNom] = useState('');
  const [type, setType] = useState('citoyen');
  const [envoi, setEnvoi] = useState(false);
  const [confirme, setConfirme] = useState('');

  const taches = projet.taches || [];
  const prog = projet.progression || { total: 0, pourvues: 0, faites: 0, pourcentage: 0 };

  const basculer = (id) => {
    const s = new Set(choisies);
    s.has(id) ? s.delete(id) : s.add(id);
    setChoisies(s);
  };

  const contribuer = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !choisies.size) return;
    setEnvoi(true);
    try {
      onMaj(await api.contribuer(projet.id, { nom: nom.trim(), type, taches: [...choisies] }));
      setConfirme(`Merci ${nom.trim()} : ${pluriel(choisies.size, 'coup de main enregistré', 'coups de main enregistrés')}.`);
      setChoisies(new Set());
      setNom('');
    } catch (err) { onErreur(err.message); } finally { setEnvoi(false); }
  };

  const marquer = async (t) => {
    try { onMaj(await api.marquerTache(projet.id, t.id, !t.fait)); } catch (err) { onErreur(err.message); }
  };

  return (
    <section className="coups">
      <div className="coups-tete">
        <h2>Coups de main</h2>
        <span className="discret petit">Cochez ce que vous pouvez apporter, laissez votre nom : l'équipe voit où elle en est.</span>
      </div>

      <div className="progression-taches" role="group" aria-label="Avancement des coups de main">
        <div className="piste" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={prog.pourcentage} aria-label="Tâches pourvues">
          <span style={{ width: `${prog.pourcentage}%` }} />
        </div>
        <div className="detail">
          <span><strong>{prog.pourvues} / {prog.total}</strong> tâche{prog.total > 1 ? 's' : ''} pourvue{prog.pourvues > 1 ? 's' : ''}</span>
          <span>{prog.faites} terminée{prog.faites > 1 ? 's' : ''} · {prog.pourcentage} %</span>
        </div>
      </div>

      {confirme && <p className="bandeau-info" role="status"><Icone nom="check" taille={18} /> {confirme}</p>}

      <ul className="taches">
        {taches.map((t) => (
          <li key={t.id} className={`tache${t.pourvue ? ' tache-pourvue' : ''}${t.fait ? ' tache-faite' : ''}`}>
            <label className="tache-ligne">
              <input type="checkbox" checked={choisies.has(t.id)} onChange={() => basculer(t.id)} />
              <span className="tache-corps">
                <span className="tache-titre">
                  <strong>{t.libelle}</strong>
                  {t.besoin && libelleBesoin(t.besoin) && <span className="badge badge-neutre">{libelleBesoin(t.besoin)}</span>}
                  {t.fait && <span className="badge badge-realise"><Icone nom="check" taille={13} />Terminée</span>}
                  {!t.fait && t.pourvue && <span className="badge badge-accent">Assez de monde</span>}
                </span>
                <span className="tache-inscrits">
                  {t.inscrits.length}/{t.places} personne{t.places > 1 ? 's' : ''}
                  {t.inscrits.length ? ` · ${t.inscrits.map((i) => i.nom).join(', ')}` : " · personne pour l'instant"}
                </span>
              </span>
            </label>
            <button className="lien" onClick={() => marquer(t)}>
              <Icone nom={t.fait ? 'retour' : 'check'} taille={15} />
              {t.fait ? 'Remettre à faire' : 'Marquer terminée'}
            </button>
          </li>
        ))}
        {!taches.length && <li className="carte discret">Aucune tâche publiée pour l'instant : le porteur peut en ajouter.</li>}
      </ul>

      {taches.length > 0 && (
        <form className="form-contribution" onSubmit={contribuer}>
          <span className="champ-titre"><Icone nom="equipe" taille={16} /> Je donne un coup de main</span>
          <div className="ligne">
            <label className="champ" style={{ marginBottom: 0 }}>
              <span className="petit discret">Votre nom, ou celui de votre commerce ou organisme</span>
              <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={40} placeholder="Ex. : Marie, Boulangerie du coin" />
            </label>
            <label className="champ" style={{ marginBottom: 0 }}>
              <span className="petit discret">Vous êtes</span>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="citoyen">Citoyen·ne</option>
                <option value="commercant">Commerçant·e</option>
                <option value="organisme">Organisme</option>
                <option value="entreprise">Entreprise</option>
              </select>
            </label>
          </div>
          <button className="bouton bouton-principal" type="submit" disabled={!nom.trim() || !choisies.size || envoi}>
            <Icone nom="check" taille={17} />
            {envoi ? 'Enregistrement…' : choisies.size ? `J'apporte ${pluriel(choisies.size, 'coup de main', 'coups de main')}` : "Cochez d'abord vos tâches"}
          </button>
          <span className="discret petit">Démonstration : rien ne part sur Internet, l'inscription reste sur cet ordinateur.</span>
        </form>
      )}
    </section>
  );
}

export default function Projet() {
  const { id } = useParams();
  const { state } = useLocation();
  const [p, setP] = useState(null);
  const [erreur, setErreur] = useState('');
  const [ouvert, setOuvert] = useState(null);
  const [copie, setCopie] = useState('');

  useEffect(() => { api.projet(id).then(setP).catch((e) => setErreur(e.message)); }, [id]);

  const agir = (promesse) => promesse.then(setP).catch((e) => setErreur(e.message));
  const repondre = (partnerId, statut) => agir(api.repondre(id, partnerId, statut));
  const terminer = () => agir(api.majProjet(id, { statut: 'realise' }));
  const copier = async (texte, cle) => {
    try { await navigator.clipboard.writeText(texte); setCopie(cle); setTimeout(() => setCopie(''), 1500); } catch { /* presse-papiers indisponible */ }
  };

  const indexEtape = useMemo(() => (p ? AVANCEMENT.findIndex((e) => e.cle === p.statut) : 0), [p]);

  if (erreur && !p) return <Alerte>{erreur} <Link to="/">Retour à l'accueil</Link></Alerte>;
  if (!p) return <Chargement />;

  const engages = p.equipe.filter((m) => m.statut === 'accepte');
  const points = [
    { id: p.id, lat: p.lat, lng: p.lng, genre: 'moi', titre: p.titre, actif: true },
    ...(p.lieu ? [{ id: p.lieu.id, lat: p.lieu.lat, lng: p.lieu.lng, genre: 'lieu', titre: p.lieu.nom }] : []),
    ...p.equipe.map((m) => ({ id: m.partnerId, lat: m.lat, lng: m.lng, genre: m.type, titre: m.nom, sousTitre: LIBELLES.statutMembre[m.statut], actif: m.statut === 'accepte' }))
  ];

  return (
    <div className="page-projet">
      {state?.nouveau ? <Etapes actuelle={3} /> : null}
      {state?.nouveau && (
        <p className="bandeau-info" role="status">
          <Icone nom="check" taille={18} /> Votre projet est en ligne. {pluriel(p.equipe.length, 'invitation prête', 'invitations prêtes')} à envoyer.
        </p>
      )}
      {p.demo && (
        <p className="bandeau-demo"><Icone nom="info" taille={16} /> Projet fictif de démonstration : les réponses des partenaires et les inscrits sont simulés.</p>
      )}
      {erreur && <Alerte>{erreur}</Alerte>}

      <div className="deux-volets">
        <section className="volet-liste">
          <div className="ligne-haut">
            <StatutProjet statut={p.statut} />
            <span>{p.themes.map((t) => <span key={t.cle} className="chip chip-petit">{t.label}</span>)}</span>
          </div>
          <h1>{p.titre}</h1>
          <p className="lead">{p.description}</p>
          <p className="discret petit">Porté par {p.porteur.nom} ({LIBELLES.porteur[p.porteur.type] || p.porteur.type}) · créé le {formaterDate(p.creeLe)}</p>

          <ol className="avancement" aria-label="Avancement du projet">
            {AVANCEMENT.map((e, i) => (
              <li key={e.cle} className={i <= Math.max(indexEtape, 0) ? 'fait' : ''} aria-current={i === indexEtape ? 'step' : undefined}>
                <span>{i < indexEtape || p.statut === 'realise' ? <Icone nom="check" taille={14} /> : i + 1}</span>{e.label}
              </li>
            ))}
          </ol>

          {engages.length > 0 && (
            <div className="badge-carte">
              <span className="badge-icone"><Icone nom="badge" taille={26} /></span>
              <div>
                <strong>Badge «&nbsp;Bâtisseur de quartier&nbsp;»</strong>
                <p className="discret petit">{pluriel(engages.length, 'partenaire engagé', 'partenaires engagés')} à vos côtés.</p>
              </div>
            </div>
          )}

          <CoupsDeMain projet={p} onMaj={setP} onErreur={setErreur} />

          <h2>Mon équipe</h2>
          <ul className="liste">
            {p.equipe.map((m) => (
              <li key={m.partnerId} className="carte">
                <div className="ligne-haut">
                  <TypePartenaire type={m.type} />
                  <span className={`badge badge-membre-${m.statut}`}>
                    {m.statut === 'accepte' && <Icone nom="check" taille={13} />}
                    {m.statut === 'decline' && <Icone nom="x" taille={13} />}
                    {LIBELLES.statutMembre[m.statut]}
                  </span>
                </div>
                <h3>{m.nom}</h3>
                {m.statut === 'invite' && (
                  <div className="actions">
                    <span className="discret petit">Simuler sa réponse&nbsp;:</span>
                    <button className="bouton bouton-petit bouton-secondaire" onClick={() => repondre(m.partnerId, 'accepte')}><Icone nom="check" taille={15} />Accepte</button>
                    <button className="bouton bouton-petit bouton-fantome" onClick={() => repondre(m.partnerId, 'decline')}><Icone nom="x" taille={15} />Décline</button>
                  </div>
                )}
                <button className="lien" aria-expanded={ouvert === m.partnerId} onClick={() => setOuvert(ouvert === m.partnerId ? null : m.partnerId)}>
                  <Icone nom="message" taille={16} /> {ouvert === m.partnerId ? 'Masquer le message' : "Voir le message d'invitation"}
                </button>
                {ouvert === m.partnerId && (
                  <div className="message">
                    <pre>{m.message}</pre>
                    <button className="bouton bouton-petit bouton-secondaire" onClick={() => copier(m.message, m.partnerId)}>
                      <Icone nom={copie === m.partnerId ? 'check' : 'copie'} taille={15} />{copie === m.partnerId ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                )}
              </li>
            ))}
            {!p.equipe.length && <li className="carte discret">Aucun partenaire invité.</li>}
          </ul>
        </section>

        <aside className="volet-carte">
          {(p.lieu || p.evenement) && (
            <div className="carte resume">
              {p.lieu && <p><Icone nom="lieu" taille={16} /> <span><strong>Où&nbsp;:</strong> {p.lieu.nom}</span></p>}
              {p.evenement && <p><Icone nom="date" taille={16} /> <span><strong>Lancement&nbsp;:</strong> {p.evenement.titre}, {formaterDate(p.evenement.date)}</span></p>}
            </div>
          )}
          <MapView points={points} hauteur={300} label="Carte du projet" />
          <Legende genres={['moi', 'lieu', ...new Set(p.equipe.map((m) => m.type))]} />
        </aside>
      </div>

      {p.statut === 'en_cours' && (
        <div className="barre-action">
          <button className="bouton bouton-principal bouton-large" onClick={terminer}><Icone nom="check" taille={18} />Marquer le projet comme réalisé</button>
        </div>
      )}
      <p><Link to="/" className="lien"><Icone nom="retour" taille={16} /> Tous les projets</Link></p>
    </div>
  );
}
