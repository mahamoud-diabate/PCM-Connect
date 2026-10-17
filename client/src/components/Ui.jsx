import Icone from './Icone.jsx';
import { LIBELLES } from '../api.js';

/** Parcours en trois étapes : Idée → Constellation → Projet */
export function Etapes({ actuelle }) {
  const etapes = ['Votre idée', 'Vos partenaires', 'Votre projet'];
  return (
    <ol className="etapes" aria-label="Progression">
      {etapes.map((e, i) => (
        <li key={e} className={i + 1 < actuelle ? 'faite' : i + 1 === actuelle ? 'en-cours' : ''} aria-current={i + 1 === actuelle ? 'step' : undefined}>
          <span className="etapes-num">{i + 1 < actuelle ? <Icone nom="check" taille={14} /> : i + 1}</span>
          <span className="etapes-label">{e}</span>
        </li>
      ))}
    </ol>
  );
}

export function StatutProjet({ statut }) {
  return (
    <span className={`badge badge-${statut}`}>
      {statut === 'realise' && <Icone nom="check" taille={13} />}
      {LIBELLES.statutProjet[statut]}
    </span>
  );
}

export function TypePartenaire({ type }) {
  return (
    <span className="badge badge-neutre">
      <Icone nom={type} taille={13} />
      {LIBELLES.type[type] || type}
    </span>
  );
}

export function MarqueDemo({ texte = 'Exemple fictif' }) {
  return <span className="marque-demo" title="Donnée inventée pour la démonstration">{texte}</span>;
}

export function Alerte({ children }) {
  return (
    <p className="alerte" role="alert">
      <Icone nom="info" taille={18} />
      <span>{children}</span>
    </p>
  );
}

export function Chargement({ texte = 'Chargement…' }) {
  return <p className="chargement" role="status">{texte}</p>;
}
