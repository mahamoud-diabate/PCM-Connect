// OPTIONNEL – Ajoute lat/lng aux partenaires qui ont une adresse.
// ATTENTION : ce script envoie les ADRESSES à Nominatim (OpenStreetMap), un service externe.
//    Vérifiez avec les organisateurs que c'est permis par l'entente de confidentialité.
//    Alternative 100 % locale : joindre le fichier « Adresses » de Données Québec par adresse.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FICHIER = path.join(__dirname, '..', 'data', 'local', 'partners.json');
const CACHE = path.join(__dirname, 'geocode-cache.json');
const partenaires = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

let n = 0;
for (const p of partenaires) {
  if (p.lat != null || !p.adresse) continue;
  const requete = `${p.adresse}, Québec, QC, Canada`;
  if (!cache[requete]) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(requete)}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'PCM-Hackathon-StRoch/1.0' } });
    const json = await r.json();
    cache[requete] = json[0] ? { lat: +json[0].lat, lng: +json[0].lon } : { lat: null, lng: null };
    await pause(1100); // respect de la limite Nominatim (1 requête/seconde)
  }
  Object.assign(p, cache[requete]);
  if (p.lat != null) n++;
  process.stdout.write(`\r${n} adresses géocodées`);
}
fs.writeFileSync(FICHIER, JSON.stringify(partenaires, null, 2));
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
console.log('\nTerminé');
