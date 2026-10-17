import { NavLink, Route, Routes, Link } from 'react-router-dom';
import Accueil from './pages/Accueil.jsx';
import Idee from './pages/Idee.jsx';
import Constellation from './pages/Constellation.jsx';
import Projet from './pages/Projet.jsx';
import Offres from './pages/Offres.jsx';
import Pouls from './pages/Pouls.jsx';
import Icone from './components/Icone.jsx';
import { useMeta } from './api.js';

const NAV = [
  { to: '/', label: 'Accueil', icone: 'accueil', end: true },
  { to: '/idee', label: 'Mon idée', icone: 'idee' },
  { to: '/offres', label: 'Offres', icone: 'offres' },
  { to: '/pouls', label: 'Pouls', icone: 'pouls' }
];

function Liens({ className }) {
  return (
    <nav className={className} aria-label="Navigation principale">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'actif' : '')}>
          <Icone nom={n.icone} taille={20} />
          <span>{n.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function SourceDonnees() {
  const { meta } = useMeta();
  if (!meta) return null;
  const ville = meta.source === 'ville';
  return (
    <span className={`source ${ville ? 'source-ville' : ''}`} title={ville ? 'Fichiers de la Ville, traités sur cet ordinateur' : 'Jeu de démonstration inventé'}>
      <Icone nom="donnees" taille={14} />
      {ville ? 'Données de la Ville · locales' : 'Données fictives'}
    </span>
  );
}

export default function App() {
  return (
    <div className="app">
      <a href="#contenu" className="sauter">Aller au contenu</a>
      <header className="entete">
        <div className="entete-int">
          <Link to="/" className="logo" aria-label="PCM, accueil">
            <img src="/icon.svg" alt="" width="30" height="30" />
            <span>
              <strong>PCM</strong>
              <small>Saint-Roch</small>
            </span>
          </Link>
          <Liens className="nav-haut" />
          <SourceDonnees />
        </div>
      </header>

      <main id="contenu" className="contenu">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/idee" element={<Idee />} />
          <Route path="/constellation" element={<Constellation />} />
          <Route path="/projet/:id" element={<Projet />} />
          <Route path="/offres" element={<Offres />} />
          <Route path="/pouls" element={<Pouls />} />
          <Route path="*" element={<p className="carte">Page introuvable. <Link to="/">Retour à l'accueil</Link></p>} />
        </Routes>
      </main>

      <Liens className="nav-bas" />
    </div>
  );
}
