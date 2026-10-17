// ÉTAPE 1 – Inspecter les fichiers Excel de la Ville (EN LOCAL)
// Usage (dans /server) :  npm run inspecter
// Affiche, pour chaque fichier .xlsx du dossier pcm/donnees/ :
//   - le nombre de lignes
//   - le NOM DES COLONNES  → c'est ce qu'il faut recopier dans import-config.json
//   - un aperçu des catégories (pour votre analyse, NE PAS copier dans un outil d'IA)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOSSIER = path.resolve(__dirname, '..', '..', 'donnees');

if (!fs.existsSync(DOSSIER)) {
  console.error(`❌ Dossier introuvable : ${DOSSIER}\n   Créez le dossier "donnees" à la racine de pcm/ et copiez-y les fichiers Excel.`);
  process.exit(1);
}

const fichiers = fs.readdirSync(DOSSIER).filter((f) => /\.(xlsx|xls|csv)$/i.test(f));
if (!fichiers.length) console.log('Aucun fichier Excel/CSV dans', DOSSIER);

for (const f of fichiers) {
  const wb = XLSX.readFile(path.join(DOSSIER, f));
  for (const nomFeuille of wb.SheetNames) {
    const lignes = XLSX.utils.sheet_to_json(wb.Sheets[nomFeuille], { defval: null });
    if (!lignes.length) continue;
    const colonnes = Object.keys(lignes[0]);
    console.log('\n══════════════════════════════════════════════');
    console.log(`📄 ${f}  ·  feuille « ${nomFeuille} »  ·  ${lignes.length} lignes`);
    console.log('   COLONNES (à recopier dans import-config.json) :');
    colonnes.forEach((c) => console.log(`     - "${c}"`));

    console.log('   Aperçu des colonnes à catégories (usage local seulement) :');
    for (const c of colonnes) {
      const compte = {};
      for (const l of lignes) if (l[c] != null) compte[l[c]] = (compte[l[c]] || 0) + 1;
      const distinctes = Object.keys(compte).length;
      if (distinctes > 1 && distinctes <= 25) {
        const top = Object.entries(compte).sort((a, b) => b[1] - a[1]).slice(0, 6)
          .map(([v, n]) => `${v} (${n})`).join(' · ');
        console.log(`     ${c} → ${distinctes} valeurs : ${top}`);
      }
    }
  }
}
console.log('\n✅ Recopiez les noms de colonnes dans server/scripts/import-config.json, puis : npm run import');
