import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

export const CENTRE = [46.8128, -71.2245];

// Fonds de carte retenus après vérification du CONTENU des tuiles (pas du code HTTP) :
//  - tile.openstreetmap.org renvoie une image "Access blocked" (entête x-blocked) ;
//  - basemaps.cartocdn.com renvoie une image "API key required" (16 couleurs, 97 % d'un seul ton) ;
//  - Esri (Light Gray puis Street) et OSM France renvoient de vraies cartes, sans clé.
// Si un fond échoue, on bascule automatiquement sur le suivant.
const FONDS = [
  {
    // Fond clair : Esri Light Gray Canvas. Vérifié par le contenu de l'image
    // (128 couleurs, écart-type 6,7 : une vraie carte, pas une image de remplacement).
    nom: 'Esri Light Gray',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    reference: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    sous: 'abc',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, &copy; OpenStreetMap'
  },
  {
    nom: 'Esri Street',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    sous: 'abc',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, &copy; OpenStreetMap'
  },
  {
    nom: 'OSM France',
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    sous: 'abc',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> France'
  }
];export const COULEURS = {
  moi: '#16181d',
  organisme: '#2f6ea8',
  commerce: '#a4506b',
  entreprise: '#3f7a55',
  lieu: '#8a7420',
  evenement: '#6a4fa0',
  recherche: '#8b90a0',
  en_cours: '#2f6ea8',
  realise: '#16181d'
};

const NOMS = {
  moi: 'Votre projet', organisme: 'Organismes', commerce: 'Commerces', entreprise: 'Entreprises', lieu: 'Lieux',
  evenement: 'Événements', recherche: 'Cherche son équipe', en_cours: 'En action', realise: 'Réalisé'
};

const icones = {};
function icone(genre, actif) {
  const cle = `${genre}-${actif}`;
  if (!icones[cle]) {
    icones[cle] = L.divIcon({
      className: '',
      html: `<span class="pin${actif ? ' pin-actif' : ''}${genre === 'moi' ? ' pin-moi' : ''}" style="--c:${COULEURS[genre] || '#999'}"></span>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -10]
    });
  }
  return icones[cle];
}

/** Fond de carte avec bascule automatique : OSM, puis Esri, puis message discret. */
function Fond({ onIndisponible }) {
  const [index, setIndex] = useState(0);
  const erreurs = useRef(0);
  const fond = FONDS[index];
  const echec = () => {
    erreurs.current += 1;
    if (erreurs.current >= 4) {
      erreurs.current = 0;
      if (index < FONDS.length - 1) setIndex(index + 1);
      else onIndisponible();
    }
  };
  return (
    <>
      <TileLayer
        key={fond.nom}
        url={fond.url}
        subdomains={fond.sous}
        attribution={fond.attribution}
        maxZoom={19}
        eventHandlers={{ tileerror: echec }}
      />
      {/* le fond clair n'a pas de texte : une seconde couche porte les noms de rues */}
      {fond.reference && <TileLayer key={fond.nom + '-ref'} url={fond.reference} subdomains="abc" maxZoom={19} />}
    </>
  );
}

function Clic({ onClic }) {
  useMapEvents({ click: (e) => onClic?.({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Cadrer({ points }) {
  const map = useMap();
  const cle = JSON.stringify(points.map((p) => [p.lat, p.lng]));
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [28, 28], maxZoom: 17 });
  }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** points : [{ id, lat, lng, genre, titre, sousTitre, actif }] */
export default function MapView({ points = [], hauteur = 260, onClic, cadrer = true, zoom = 15, label = 'Carte de Saint-Roch' }) {
  const [indisponible, setIndisponible] = useState(false);
  const valides = points.filter((p) => p.lat != null && p.lng != null);
  return (
    <div className="carte-map" style={{ height: hauteur }} role="region" aria-label={label}>
      <MapContainer center={CENTRE} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <Fond onIndisponible={() => setIndisponible(true)} />
        {valides.map((p) => (
          <Marker key={`${p.genre}-${p.id}`} position={[p.lat, p.lng]} icon={icone(p.genre, p.actif)}>
            {p.titre && (
              <Popup>
                <strong>{p.titre}</strong>
                {p.sousTitre && <><br />{p.sousTitre}</>}
              </Popup>
            )}
          </Marker>
        ))}
        {onClic && <Clic onClic={onClic} />}
        {cadrer && <Cadrer points={valides} />}
      </MapContainer>
      {indisponible && (
        <p className="carte-note">Fond de carte indisponible (réseau filtré) : les points et les fiches restent affichés.</p>
      )}
    </div>
  );
}

export function Legende({ genres }) {
  return (
    <ul className="legende" aria-label="Légende de la carte">
      {genres.map((g) => (
        <li key={g}><span className={`pastille${g === 'moi' ? ' pastille-moi' : ''}`} style={{ background: COULEURS[g] }} />{NOMS[g]}</li>
      ))}
    </ul>
  );
}
