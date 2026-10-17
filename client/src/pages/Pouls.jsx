import { useEffect, useState } from 'react';
import { api, LIBELLES, oublierMeta } from '../api.js';
import MapView, { Legende } from '../components/MapView.jsx';
import Icone from '../components/Icone.jsx';
import { Alerte, Chargement } from '../components/Ui.jsx';

function Barres({ donnees, variante }) {
  const max = Math.max(1, ...donnees.map((d) => d.n));
  return (
    <ul className={`barres barres-${variante}`}>
      {donnees.map((d) => (
        <li key={d.cle}>
          <span className="barre-label">{d.label}</span>
          <span className="barre-piste" aria-hidden="true"><span className="barre" style={{ width: `${(d.n / max) * 100}%` }} /></span>
          <span className="barre-valeur">{d.n}</span>
        </li>
      ))}
    </ul>
  );
}

const PLAN = [
  ['Axe 1 – action 12', 'Soutien aux initiatives de verdissement'],
  ['Axe 1 – action 15', "Occasions de rencontre dans l'espace public"],
  ['Axe 2 – action 7', 'Partenariats entre secteurs économique et culturel'],
  ['Axe 3 – actions 5 et 10', 'Locaux vacants et boutique éphémère']
];

export default function Pouls() {
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const charger = () => api.pouls().then(setD).catch((e) => setErreur(e.message));
  useEffect(() => { charger(); }, []);

  const reinitialiser = async () => {
    if (!confirm('Remettre les projets et les offres de démonstration à zéro ?')) return;
    setEnCours(true);
    try { await api.reset(); oublierMeta(); await charger(); } catch (e) { setErreur(e.message); }
    setEnCours(false);
  };

  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!d) return <Chargement />;

  const k = d.kpi;
  const kpis = [
    [k.projets, 'projets citoyens'],
    [k.partenariats, 'partenariats créés'],
    [k.partenairesMobilises, 'acteurs mobilisés'],
    [`${k.tauxReponse} %`, 'taux de réponse'],
    [k.realises, 'projets réalisés'],
    [k.offres, 'offres publiées']
  ];

  return (
    <div className="page-pouls">
      <p className="surtitre">Tableau de bord · Ville de Québec et SDC</p>
      <h1>Le pouls de Saint-Roch</h1>
      {d.source === 'demo' && <p className="bandeau-demo"><Icone nom="info" taille={16} /> Indicateurs calculés sur des projets fictifs de démonstration.</p>}

      <section className="kpis" aria-label="Indicateurs clés">
        {kpis.map(([v, l]) => <div key={l}><strong>{v}</strong><span>{l}</span></div>)}
      </section>

      <div className="grille-pouls">
        <section className="carte">
          <h2>Besoins sans réponse</h2>
          <p className="discret petit">Ce que les projets en cours n'ont pas encore trouvé chez leurs partenaires engagés : un signal pour orienter les programmes.</p>
          {d.besoinsNonCombles.length ? <Barres donnees={d.besoinsNonCombles} variante="manque" /> : <p className="discret">Tous les besoins sont couverts.</p>}
        </section>

        <section className="carte">
          <h2>Projets par thème</h2>
          {d.parTheme.length ? <Barres donnees={d.parTheme} variante="accent" /> : <p className="discret">Aucun projet pour l'instant.</p>}
          <h2>Projets par statut</h2>
          <Barres variante="neutre" donnees={Object.entries(d.parStatut).map(([cle, n]) => ({ cle, label: LIBELLES.statutProjet[cle], n }))} />
        </section>

        <section className="carte">
          <h2>Où ça bouge</h2>
          <MapView hauteur={280} label="Carte des projets"
            points={d.carte.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, genre: p.statut, titre: p.titre, sousTitre: LIBELLES.statutProjet[p.statut] }))} />
          <Legende genres={['recherche', 'en_cours', 'realise']} />
        </section>

        <section className="carte">
          <h2>Lien avec le Plan d'action 2026-2029</h2>
          <ul className="plan">
            {PLAN.map(([axe, texte]) => <li key={axe}><strong>{axe}</strong><span>{texte}</span></li>)}
          </ul>
        </section>
      </div>

      <button className="bouton bouton-fantome bouton-petit" onClick={reinitialiser} disabled={enCours}>
        <Icone nom="reset" taille={15} />{enCours ? 'Réinitialisation…' : 'Réinitialiser la démo'}
      </button>
    </div>
  );
}
