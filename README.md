# PCM — Plateforme citoyenne de mobilisation

> De l'idée au projet de quartier, en trois minutes.
> Hackathon Saint-Roch 2026 · React + Vite (interface) · Node.js + Express (API)

Un citoyen, un commerçant ou un organisme décrit son idée. PCM lui propose :

- **QUI** : des organismes, commerces et entreprises pertinents, avec la raison de chaque suggestion ;
- **OÙ** : des lieux pour agir (îlots de chaleur, parcs, locaux vacants) ;
- **QUAND** : des événements à venir pour lancer le projet.

Le porteur invite ensuite ses partenaires et le projet obtient sa page. Chaque projet publie aussi ses **coups de main** : citoyens, commerces, entreprises et organismes cochent les tâches qu'ils peuvent prendre et laissent leur nom, sans compte ; une **barre de progression** dit où en est l'équipe avant le jour J. Les partenaires publient aussi leurs **offres** (un local, du matériel, des bénévoles). Un **tableau de bord** pour la Ville et la SDC montre les projets, les partenariats créés et les besoins sans réponse.

---

## 1. Installation (5 minutes)

Prérequis : **Node.js 18 ou plus récent** (`node -v`).

```bash
cd pcm
npm run install:all     # installe la racine, le serveur et le client
npm run dev:demo        # lance l'API (port 3001) et l'interface (port 5173) avec les données FICTIVES
```

Ouvrez ensuite **http://localhost:5173**. C'est le mode à utiliser pour présenter : il ne dépend pas des fichiers de la Ville.

**Pour tester sur un téléphone :** branchez-le au même Wi-Fi que votre ordinateur, puis ouvrez `http://<IP-de-votre-ordi>:5173` (l'adresse IP s'affiche dans le terminal, à la ligne `Network:`).

**Pour la version « production »** (un seul serveur sur le port 3001) :

```bash
npm run build && npm run start:demo
```

## 2. Scénario de démo pour le jury (2 min 30)

1. **Accueil** → « Lancer mon idée ».
2. Cliquez sur l'exemple **« Verdir notre ruelle »**, puis tapez votre nom (par exemple « Marie »).
3. « Trouver mes partenaires » ouvre **la constellation**. Montrez :
   - l'onglet **Qui** : les partenaires et les raisons de chaque suggestion (domaine, ce qu'ils peuvent offrir, distance, membre de la SDC) ;
   - l'onglet **Où** : les îlots de chaleur à verdir ;
   - l'onglet **Quand** : la Journée de plantation collective.
4. « Inviter 3 partenaires » ouvre la page du projet. Cliquez sur « Accepte » pour faire apparaître le badge **Bâtisseur de quartier**. Montrez ensuite le message d'invitation, rédigé automatiquement.
5. **Coups de main** (sur la même page) : cochez deux tâches, tapez un nom, validez — la barre passe de **33 % à 50 %** et le nom apparaît sur les tâches. Montrez « Marquer terminée » sur une tâche.
6. **Offres** : montrez que les offres des partenaires sont reliées automatiquement aux projets qui en ont besoin.
7. **Pouls** : le tableau de bord de la Ville et de la SDC (besoins sans réponse, lien avec le Plan d'action 2026-2029).

Pour rejouer la démo à l'identique : bouton **« Réinitialiser la démo »** en bas de l'écran Pouls (ou `npm run reinitialiser` dans `server/`). Le jeu de démonstration est régénéré au démarrage suivant.

## 3. Brancher les vraies données (EN LOCAL UNIQUEMENT)

⚠️ **Entente de confidentialité** : les fichiers fournis par la Ville ne doivent pas être envoyés à un outil d'IA externe, et ne doivent pas être versionnés. Tout le traitement se fait **sur cette machine**.

1. Créez un dossier `donnees/` à la racine de `pcm/` et copiez-y les 4 fichiers Excel. Ce dossier est **exclu de Git**.
2. Ouvrez `server/scripts/import-config.json` et vérifiez **les chemins des fichiers** et **le nom exact des colonnes** (la première ligne de chaque fichier Excel).
3. Lancez :
   ```bash
   cd server
   npm run import
   ```
   Le script affiche les colonnes qu'il trouve dans chaque fichier, ce qui aide à corriger la configuration. Il écrit `server/data/local/partners.json` et `server/data/local/events.json` — un dossier **exclu de Git**.
4. **Coordonnées (optionnel)** : `npm run geocode` ajoute la latitude et la longitude à partir des adresses, via Nominatim (OpenStreetMap). Ce service est **externe** : vérifiez avec les organisateurs que c'est permis avant de l'utiliser. Sans coordonnées, la correspondance se fait par domaine, par catégorie et par arrondissement.

Pour revenir au jeu fictif à tout moment : supprimez le dossier `server/data/local/`, ou lancez `npm run dev:demo`.
Les lieux d'exemple (parcs, îlots de chaleur) se mettent dans `server/data/places.json`.

## 4. Le moteur de suggestion

Fichiers : `server/src/matching.js`, `server/src/texte.js`, `server/src/themes.js`

```
score = 0,55 × pertinence thématique + 0,25 × besoins couverts + 0,20 × proximité
```

- **Pertinence thématique**, trois signaux locaux, le meilleur des trois l'emporte :
  1. un lexique de 10 thèmes (`server/src/themes.js`) comprend une idée écrite en langage courant ;
  2. **TF-IDF** sur les fiches des partenaires (`server/src/texte.js`) : une idée qui n'emploie aucun mot-clé du lexique trouve quand même le bon partenaire si les textes se ressemblent (test : « tournoi d'échecs » rejoint l'organisme qui s'occupe des aînés) ;
  3. une **IA sémantique locale** optionnelle (voir plus bas).
- **Besoins couverts** : ce que le partenaire peut offrir, d'après son type ou ses offres publiées.
- **Proximité** : distance à vol d'oiseau (Haversine). Le score est 1 sur place et 0 au-delà de 1,5 km. Un partenaire sans adresse est situé par son arrondissement, jamais par un score inventé.

**Fond de carte** : les tuiles viennent de CARTO (données OpenStreetMap) et non du serveur public `tile.openstreetmap.org`, qui bloque les applications trop demandeuses (erreur 403 « Access blocked »). Si la carte apparaît grise, c'est que la connexion Internet est coupée : les points et les fiches restent affichés.

### IA sémantique locale (optionnelle)

```bash
cd server
npm i @xenova/transformers
USE_EMBEDDINGS=1 npm run dev:demo      # Windows PowerShell : $env:USE_EMBEDDINGS=1; npm run dev:demo
```

Cette option charge le modèle multilingue `paraphrase-multilingual-MiniLM-L12-v2`, qui **tourne sur la machine**. Le modèle est téléchargé une seule fois, puis aucune donnée ne sort de l'ordinateur. Un repère « IA locale » s'affiche alors dans la constellation.

## 5. Structure

```
pcm/
├── client/                        React + Vite (installable sur mobile)
│   └── src/
│       ├── pages/                 Accueil, Idee, Constellation, Projet, Offres, Pouls
│       ├── components/            MapView (Leaflet / OpenStreetMap), Icone, Ui
│       ├── api.js                 appels à l'API, libellés français
│       └── styles.css             thème clair, une seule police (Manrope), coins de 6 px
└── server/                        Node.js + Express
    ├── src/
    │   ├── index.js               routes /api/*, validation des entrées
    │   ├── matching.js            moteur QUI / OÙ / QUAND
    │   ├── themes.js              lexique thématique
    │   ├── texte.js               TF-IDF local
    │   ├── graines.js             jeu de démonstration FICTIF, régénéré à la demande
    │   ├── embeddings.js          IA locale optionnelle
    │   └── store.js               données en mémoire, état dans data/runtime.json
    ├── data/
    │   ├── demo/                  données FICTIVES versionnées
    │   ├── local/                 données de la Ville (exclu de Git)
    │   ├── places.json            lieux d'exemple
    │   └── runtime.json           projets et offres créés (exclu de Git)
    ├── test/moteur.test.js        7 tests du moteur et de l'API (npm test)
    └── scripts/                   import Excel, géocodage, réinitialisation
```

### API

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/meta` | thèmes, besoins, source des données, statistiques |
| GET | `/api/partners?q=` | recherche d'organisations (30 résultats maximum) |
| POST | `/api/match` | `{titre, description, besoins[], lat, lng}` → `{qui, ou, quand, offres}` |
| GET / POST | `/api/projects` | lister ou créer des projets (avec les partenaires invités) |
| PATCH | `/api/projects/:id/equipe/:partnerId` | réponse d'un partenaire (`invite`, `accepte` ou `decline`) |
| PATCH | `/api/projects/:id` | changer le statut d'un projet (`recherche`, `en_cours`, `realise`) |
| POST | `/api/projects/:id/taches` | ajouter un coup de main à pourvoir (libellé, besoin, nombre de places) |
| POST | `/api/projects/:id/contribuer` | s'inscrire à une ou plusieurs tâches (nom, type, tâches cochées) |
| PATCH | `/api/projects/:id/taches/:tacheId` | marquer un coup de main comme terminé (ou le remettre à faire) |
| GET / POST | `/api/offers` | offres des partenaires, avec les projets correspondants |
| GET | `/api/dashboard` | indicateurs du tableau de bord Ville / SDC |
| POST | `/api/reset` | régénérer le jeu de démonstration |

## 6. Données et confidentialité

- Deux jeux de données séparés : `data/demo/` (fictif, versionné) et `data/local/` (la Ville, **exclu de Git** — voir `.gitignore`).
- L'interface indique toujours la source : « Données de la Ville · locales » ou « Données fictives ».
- Les projets et les offres de démonstration portent `demo: true` et s'affichent avec la marque **« Exemple fictif »**.
- Le script de géocodage est le seul à sortir de la machine : il envoie des adresses à Nominatim et le dit dans son en-tête.
- L'API n'a pas d'authentification : c'est un prototype de démonstration, à faire évoluer avant toute mise en ligne (comptes partenaires, clé d'API, limitation de débit).

## 7. Vérifications faites

| Commande | Résultat obtenu |
|---|---|
| `npm test` (dans `server/`) | 7 tests verts : moteur, TF-IDF, jeu de démonstration, coups de main (inscription, progression, doublons), validation de l'API |
| `npm run build` (dans `client/`) | build de production réussi |
| Parcours complet dans Chrome (sans interface) | accueil → idée → constellation → invitation → projet → coups de main → offres → pouls, **0 erreur JS** ; barre de progression mesurée à 301 px sur 601 px après inscription (33 % → 50 %) |
| Contrôle des contrastes WCAG | tous les textes ≥ 4,5:1 sur leur fond |
| `npm run import` puis démarrage | 1 696 partenaires, 41 événements, toute la chaîne sur les données réelles |

## 8. Pistes d'évolution (pour le pitch)

- Des comptes partenaires, pour que chacun mette sa fiche à jour, et des notifications par courriel ou SMS.
- Un module **Vitrines vivantes** : les locaux vacants deviennent des offres, au service des actions 5 et 10 de l'axe 3.
- L'intégration au futur quartier universitaire de l'UQ (projets étudiants).
- L'extension aux 9 artères commerciales des SDC de Québec.

---
*Les données de démonstration sont fictives. Les noms d'organismes et de commerces sont inventés. Ce prototype a été codé avec une forte assistance IA : c'est assumé, et ce README distingue ce qui est vérifié de ce qui ne l'est pas.*
