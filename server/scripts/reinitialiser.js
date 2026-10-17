// Efface les projets et offres créés pendant l'utilisation (data/runtime.json).
// Le jeu de démonstration est régénéré au prochain démarrage du serveur.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runtime = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'runtime.json');
if (fs.existsSync(runtime)) {
  fs.unlinkSync(runtime);
  console.log("État effacé. Relancez l'application : le jeu de démonstration sera régénéré.");
} else {
  console.log('Rien à effacer.');
}
