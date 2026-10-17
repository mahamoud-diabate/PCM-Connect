import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeta } from '../api.js';
import MapView, { CENTRE } from '../components/MapView.jsx';
import Icone from '../components/Icone.jsx';
import { Etapes } from '../components/Ui.jsx';

const EXEMPLES = [
  { titre: 'Verdir notre ruelle', description: 'Planter des arbres, des fleurs et installer des bacs de plantation dans la ruelle derrière la rue Saint-Joseph pour rafraîchir le quartier.', besoins: ['benevoles', 'materiel', 'expertise'], lat: 46.8142, lng: -71.2255 },
  { titre: 'Frigo partagé anti-gaspillage', description: 'Installer un frigo communautaire où les commerces et les citoyens déposent leurs surplus alimentaires.', besoins: ['local', 'materiel'], lat: 46.8127, lng: -71.2243 },
  { titre: 'Galerie éphémère dans un local vide', description: 'Exposer les artistes du quartier dans une vitrine vacante de la rue Saint-Joseph pendant le temps des fêtes.', besoins: ['local', 'visibilite', 'financement'], lat: 46.8124, lng: -71.2228 }
];

const VIDE = { titre: '', description: '', besoins: [], porteurNom: '', porteurType: 'citoyen', lat: CENTRE[0], lng: CENTRE[1] };

export default function Idee() {
  const nav = useNavigate();
  const { meta } = useMeta();
  const [f, setF] = useState(() => {
    try { return { ...VIDE, ...JSON.parse(sessionStorage.getItem('pcm-brouillon')) }; } catch { return VIDE; }
  });

  useEffect(() => { try { sessionStorage.setItem('pcm-brouillon', JSON.stringify(f)); } catch { /* stockage indisponible */ } }, [f]);

  const maj = (champ) => (e) => setF({ ...f, [champ]: e.target.value });
  const basculer = (b) => setF({ ...f, besoins: f.besoins.includes(b) ? f.besoins.filter((x) => x !== b) : [...f.besoins, b] });
  const valide = f.titre.trim().length > 2 && f.description.trim().length > 10;

  const soumettre = (e) => {
    e.preventDefault();
    if (valide) nav('/constellation', { state: { idee: f } });
  };

  return (
    <form onSubmit={soumettre} className="formulaire page-idee">
      <Etapes actuelle={1} />
      <h1>Mon idée pour Saint-Roch</h1>

      <div className="exemples" aria-label="Exemples d'idées">
        <span className="discret petit">Exemples&nbsp;:</span>
        {EXEMPLES.map((ex) => (
          <button type="button" key={ex.titre} className="chip" onClick={() => setF({ ...f, ...ex })}>{ex.titre}</button>
        ))}
      </div>

      <div className="grille-form">
        <div className="carte">
          <label className="champ">
            <span>Nom du projet</span>
            <input value={f.titre} onChange={maj('titre')} placeholder="Ex. : Verdir notre ruelle" required maxLength={80} />
          </label>

          <label className="champ">
            <span>Décrivez votre idée en une ou deux phrases</span>
            <textarea value={f.description} onChange={maj('description')} rows={4} required maxLength={500}
              placeholder="Ce que vous voulez faire, pour qui, et pourquoi c'est bon pour le quartier." />
            <small className="discret">{f.description.length}/500</small>
          </label>

          <fieldset className="champ">
            <legend>De quoi avez-vous besoin&nbsp;?</legend>
            <div className="chips">
              {(meta?.besoins || []).map((b) => {
                const on = f.besoins.includes(b.cle);
                return (
                  <button type="button" key={b.cle} aria-pressed={on} className={`chip ${on ? 'chip-on' : ''}`} onClick={() => basculer(b.cle)}>
                    {on && <Icone nom="check" taille={14} />}{b.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="deux-colonnes">
            <label className="champ">
              <span>Votre nom</span>
              <input value={f.porteurNom} onChange={maj('porteurNom')} placeholder="Ex. : Marie" maxLength={60} />
            </label>
            <label className="champ">
              <span>Vous êtes</span>
              <select value={f.porteurType} onChange={maj('porteurType')}>
                <option value="citoyen">Citoyen·ne</option>
                <option value="commercant">Commerçant·e</option>
                <option value="organisme">Organisme</option>
                <option value="entreprise">Entreprise</option>
              </select>
            </label>
          </div>
        </div>

        <div className="carte">
          <div className="champ">
            <span className="champ-titre"><Icone nom="lieu" taille={16} /> Où dans le quartier&nbsp;? <small className="discret">Touchez la carte.</small></span>
            <MapView hauteur={300} cadrer={false} zoom={15} label="Choisir l'emplacement du projet"
              points={[{ id: 'moi', lat: f.lat, lng: f.lng, genre: 'moi', actif: true }]}
              onClic={({ lat, lng }) => setF({ ...f, lat, lng })} />
          </div>
        </div>
      </div>

      <div className="barre-action">
        {!valide && <span className="discret petit">Un nom (3 caractères) et une description (une phrase) suffisent.</span>}
        <button type="submit" className="bouton bouton-principal bouton-large" disabled={!valide}>
          Trouver mes partenaires <Icone nom="fleche" taille={18} />
        </button>
      </div>
    </form>
  );
}
