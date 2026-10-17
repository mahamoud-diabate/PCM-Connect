import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useMeta, pluriel } from '../api.js';
import Icone from '../components/Icone.jsx';
import { StatutProjet, MarqueDemo, Alerte } from '../components/Ui.jsx';

const ETAPES = [
  { icone: 'idee', titre: 'Décrivez votre idée', texte: 'En une ou deux phrases, avec ce dont vous avez besoin.' },
  { icone: 'equipe', titre: 'PCM propose qui, où, quand', texte: 'Des partenaires, des lieux et des événements, chacun avec sa raison.' },
  { icone: 'message', titre: 'Invitez vos partenaires', texte: 'Le message est rédigé pour vous. Le projet obtient sa page.' }
];

export default function Accueil() {
  const { meta, erreur: erreurMeta } = useMeta();
  const [projets, setProjets] = useState([]);
  const [erreur, setErreur] = useState('');

  useEffect(() => { api.projets().then(setProjets).catch((e) => setErreur(e.message)); }, []);

  return (
    <div className="page-accueil">
      <section className="hero">
        <div>
          <p className="surtitre">Saint-Roch, ensemble</p>
          <h1>Une idée pour le quartier&nbsp;? Trouvez votre équipe en trois minutes.</h1>
          <p className="hero-texte">Décrivez votre projet. PCM vous montre <strong>qui</strong> peut vous aider, <strong>où</strong> agir et <strong>quand</strong> vous lancer.</p>
          <div className="actions">
            <Link to="/idee" className="bouton bouton-principal">Lancer mon idée <Icone nom="fleche" taille={18} /></Link>
            <Link to="/pouls" className="bouton bouton-secondaire">Voir le pouls du quartier</Link>
          </div>
        </div>
        <ol className="comment">
          {ETAPES.map((e, i) => (
            <li key={e.titre}>
              <span className="comment-icone"><Icone nom={e.icone} taille={20} /></span>
              <div>
                <h3><span className="discret">{i + 1}.</span> {e.titre}</h3>
                <p className="discret petit">{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {(erreur || erreurMeta) && <Alerte>Impossible de joindre l'API ({erreur || erreurMeta}). Le serveur est-il lancé&nbsp;?</Alerte>}

      {meta && (
        <section className="stats" aria-label="Le quartier en chiffres">
          <div><strong>{meta.stats.organismes.toLocaleString('fr-CA')}</strong><span>organismes</span></div>
          <div><strong>{meta.stats.commerces.toLocaleString('fr-CA')}</strong><span>commerces et entreprises</span></div>
          <div><strong>{meta.stats.projets}</strong><span>projets lancés</span></div>
          <div><strong>{meta.stats.offres}</strong><span>offres publiées</span></div>
        </section>
      )}

      <section>
        <div className="titre-section">
          <h2>Projets du quartier</h2>
          <Link to="/pouls" className="lien">Tableau de bord <Icone nom="fleche" taille={16} /></Link>
        </div>
        <ul className="grille-cartes">
          {projets.map((p) => {
            const engages = p.equipe.filter((m) => m.statut === 'accepte').length;
            return (
              <li key={p.id}>
                <Link to={`/projet/${p.id}`} className="carte carte-lien">
                  <div className="ligne-haut">
                    <StatutProjet statut={p.statut} />
                    {p.demo && <MarqueDemo />}
                  </div>
                  <h3>{p.titre}</h3>
                  <p className="discret petit">{p.themes.map((t) => t.label).join(' · ') || 'Projet citoyen'}</p>
                  <p className="pied-carte petit">
                    <span>{p.porteur.nom}</span>
                    <span><Icone nom="equipe" taille={15} /> {pluriel(engages, 'partenaire engagé', 'partenaires engagés')}</span>
                  </p>
                </Link>
              </li>
            );
          })}
          {!projets.length && !erreur && <li className="carte discret">Aucun projet pour l'instant. Lancez le premier&nbsp;!</li>}
        </ul>
      </section>
    </div>
  );
}
