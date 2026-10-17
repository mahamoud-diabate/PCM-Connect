# Retour sur le Hackathon Saint-Roch 2026

## 1. Contexte et défi

| Paramètre | Détail |
| --- | --- |
| **Événement** | Hackathon Saint-Roch 2026 (Québec) |
| **Lieu** | Quartier Saint-Roch, Ville de Québec |
| **Format** | Prototype conçu, codé et présenté au jury en 48 heures (équipe de 3) |
| **Défi adressé** | *Comment faciliter la création de projets dans Saint-Roch en mobilisant les parties prenantes ?* |
| **Données fournies** | 5 classeurs Excel de la Ville de Québec (1 696 organismes, commerces et entreprises ; 31 initiatives et programmes) |
| **Résultat** | Projet présenté au jury, non primé |

Dans Saint-Roch, les ressources existent : organismes communautaires, commerces engagés, lieux culturels, programmes municipaux et citoyens prêts à donner un coup de main. Pourtant, lorsqu'un résident ou un commerçant veut lancer une initiative concrète (frigo-partage, verdissement d'une ruelle, fête de rue), il se heurte à trois obstacles :

1. **Dispersion de l'information** : les 1 696 acteurs recensés dans les fichiers de la Ville sont répartis dans plusieurs classeurs hétérogènes sans outil de recherche par besoin concret.
2. **Absence de passerelle vers l'action** : un annuaire statique donne un nom et une adresse, mais ne dit pas *qui peut prêter un local*, *qui a des bénévoles*, ni *par quelle démarche municipale commencer*.
3. **Essoufflement des porteurs** : faute de feuille de route et de suivi partagé, plusieurs idées abandonnent avant le premier contact.

---

## 2. Ce qui a été construit pendant l'événement

Plutôt qu'un simple répertoire cartographique ou un générateur de texte opaque, l'équipe a livré une application web complète (**React 18 + Vite** côté client, **Node.js + Express** côté serveur) structurée autour d'un parcours en 4 étapes :

1. **Déposer une idée (`/idee`)** : saisie en langage courant du titre, de la description, du thème, des besoins concrets (local, bénévoles, matériel, communication, compétences, financement) et du lieu sur la carte OpenStreetMap de Saint-Roch.
2. **Constellation d'alliés (`/constellation`)** : le moteur d'appariement (`server/src/matching.js`) parcourt les acteurs et retourne :
   - les **organismes et entreprises recommandés** avec un score sur 100 et la liste exacte des critères qui justifient chaque recommandation ;
   - les **offres citoyennes et matérielles** compatibles ;
   - les **projets similaires déjà actifs** dans le quartier pour éviter les doublons ;
   - les **initiatives et programmes de la Ville** mobilisables ;
   - une **feuille de route en 5 étapes** adaptée aux besoins cochés (incluant le repérage du permis municipal ou du soutien financier pertinent).
3. **Espace projet collaboratif (`/projets/:id`)** : transformation en un clic de la constellation en projet actif avec suivi des partenaires (`Suggéré` → `Contacté` → `En discussion` → `Confirmé`), liste de tâches, journal d'activité horodaté, réactions citoyennes (« Je veux participer », « J'apporte du matériel », « Je soutiens ») et générateur de message de prise de contact.
4. **Place des offres (`/offres`) et Pouls du quartier (`/pouls`)** : publication d'offres de compétences/matériel par les résidents et tableau de bord analytique temps réel pour la Ville (couverture des besoins, répartition thématique, besoins non comblés).

---

## 3. Résultat au hackathon et analyse

Le projet n'a pas été primé par le jury. Je publie le dépôt tel qu'il a été conçu, avec ses tests et ses limites explicites, parce qu'il reflète fidèlement notre démarche d'ingénierie sous contrainte de temps.

Avec le recul, trois facteurs expliquent l'écart entre la richesse fonctionnelle du prototype et l'impact en présentation de 3 minutes :

- **Surface fonctionnelle large pour un passage de 3 minutes** : montrer en 180 secondes la saisie d'idée, la constellation cartographique, l'espace projet, les offres citoyennes et le tableau de bord municipal diluait le message principal, là où un angle unique ultra-ciblé marque plus vite un jury.
- **Prise de contact encore manuelle** : le prototype prépare un message personnalisé prêt à copier et suit l'état de chaque partenaire, mais n'intègre pas d'envoi direct (courriel/SMS) ni de notification entrante pour l'organisme sollicité.
- **Géocodage approximatif sur le jeu complet** : les classeurs municipaux bruts ne contenaient pas tous des coordonnées latitude/longitude normalisées ; le script d'importation (`server/scripts/import-excel.js`) répartit déterministement les acteurs sans coordonnées autour des artères de Saint-Roch pour la carte, ce qui reste une approximation tant qu'un géocodage par adresse civique (API Adresse Québec / Nominatim) n'est pas branché.

---

## 4. Choix techniques et compromis assumés

| Choix | Pourquoi ce compromis en 48 h | Limite actuelle et suite logique |
| --- | --- | --- |
| **Moteur de score pondéré explicable** (`matching.js`) plutôt qu'un appel LLM | Zéro clé API requise, réponse en `< 5 ms`, chaque point est justifiable devant un citoyen ou un conseiller municipal | Sensible aux synonymes non prévus dans les dictionnaires de mots-clés ; pourrait être enrichi par une recherche plein texte racinisée (SQLite FTS5) |
| **Persistance JSON atomique** (`store.js` avec écriture `.tmp` + `rename`) | Démarrage instantané sur n'importe quelle machine sans installer PostgreSQL ou MongoDB | Suffisant pour un prototype mono-instance, à remplacer par SQLite ou PostgreSQL/PostGIS en multi-utilisateurs concurrents |
| **Séparation stricte données Ville / données démo** (`--demo` et `.gitignore`) | Les 5 fichiers Excel de la Ville contiennent des renseignements soumis à l'entente de confidentialité du hackathon | Le dépôt public embarque uniquement `server/data/demo/store.json` (18 organismes fictifs mais réalistes) ; le pipeline d'importation Excel reste fourni et testable |

---

## 5. Usage de l'IA et rôle dans le projet

Conformément aux bonnes pratiques de transparence des hackathons (MLH / OWASP) :

- **Ce qui a été défini et vérifié humainement** : le modèle de données unifié (normalisation des 5 classeurs Excel municipaux vers un schéma unique), la formule de pondération du moteur d'appariement (thèmes 35 pts, besoins 30 pts, mots-clés 15 pts, proximité Haversine 10 pts, ancrage Saint-Roch 10 pts), la génération conditionnelle de la feuille de route et le scénario de démonstration.
- **Ce que l'assistance IA a accéléré** : la structuration des composants React/Leaflet, la rédaction du jeu de démonstration fictif (`server/data/demo/store.json`) et la mise en forme de la documentation.
