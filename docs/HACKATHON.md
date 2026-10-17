# Retour d'expérience — Hackathon Saint-Roch 2026

## 1. Contexte de l'événement

| Paramètre | Détail |
| --- | --- |
| **Événement** | Hackathon Saint-Roch 2026 (Ville de Québec) |
| **Lieu** | Quartier Saint-Roch, Québec |
| **Format** | Prototype conçu, développé et présenté au jury en 48 heures (équipe de 3 personnes) |
| **Défi adressé** | *Comment faciliter la création de projets dans Saint-Roch en mobilisant les parties prenantes ?* |
| **Données exploitées (en local)** | 4 classeurs Excel fournis par la Ville de Québec (1 696 organisations/commerces/entreprises et 41 événements/initiatives) |
| **Résultat** | Prototype finalisé et présenté au jury — non primé |
| **Support de présentation** | [Présentation au jury (PDF, 14 diapositives)](./presentation/PCM-presentation-jury.pdf) · [Plan d'action et réponses au jury](../PLAN-ACTION.md) |

### Le constat de départ

Dans Saint-Roch, les ressources existent déjà : organismes communautaires, commerces membres de la SDC, entreprises engagées, parcs, îlots de chaleur identifiés et programmation culturelle. Pourtant, une idée de quartier s'essouffle souvent avant même le premier contact :

1. **Le 311 traite un signalement, pas une mobilisation** : il permet de signaler un irritant municipal, mais ne connecte ni les voisins, ni les commerçants, ni les organismes autour d'une initiative commune.
2. **Des données dispersées** : les 1 696 acteurs recensés par la Ville sont répartis dans des classeurs séparés, sans recherche par besoin concret (*qui peut prêter un local ? qui a des outils ? quel événement approche ?*).
3. **Le passage à l'action repose sur une seule personne** : même quand les partenaires sont identifiés, il manque un espace simple pour répartir les tâches (« coups de main ») sans imposer la création d'un compte.

---

## 2. Ce qui a été construit en 48 heures

Nous avons livré une application web complète (**React 18 + Vite + Leaflet** côté client, **Node.js + Express** côté serveur) qui amène un porteur de l'idée initiale jusqu'à la mobilisation concrète en moins de trois minutes :

1. **Déposer une idée (`/idee`)** : saisie en langage naturel (ou sélection d'un scénario type comme *Verdir notre ruelle*) avec détection automatique des thèmes et des besoins.
2. **Constellation de maillage (`/constellation`)** : moteur de recommandation explicable qui croise trois dimensions :
   - **QUI** : organismes, commerces et entreprises pertinents, avec le détail du score et la justification en français de chaque suggestion (thème, besoin couvert, distance à pied, membre SDC) ;
   - **OÙ** : lieux d'intervention ciblés dans le quartier (îlots de chaleur, parcs, placettes, locaux) sur une carte interactive OpenStreetMap/CARTO ;
   - **QUAND** : événements municipaux ou communautaires à venir auxquels greffer l'initiative.
3. **Page projet et « Coups de main » (`/projet/:id`)** : génération automatique des messages d'invitation adaptés à chaque partenaire, suivi des réponses (`Invité` → `Accepte` + badge *Bâtisseur de quartier*), et liste de tâches citoyennes à cocher sans création de compte avec barre de progression en temps réel.
4. **Place des offres (`/offres`)** : catalogue des ressources proposées par les acteurs du quartier (locaux, matériel, bénévolat, visibilité), reliées automatiquement aux projets qui en ont besoin.
5. **Pouls du quartier (`/pouls`)** : tableau de bord analytique pour la Ville de Québec et la SDC Saint-Roch permettant de suivre les projets actifs, les maillages créés, les besoins non comblés et l'alignement avec le *Plan d'action Saint-Roch 2026-2029*.

---

## 3. Résultat au hackathon et analyse rétrospective

Le projet n'a pas été retenu parmi les lauréats. Ce dépôt conserve l'intégralité du prototype fonctionnel, sa suite de tests automatisés et ses supports de présentation afin de documenter le travail d'ingénierie réalisé sous contrainte de temps.

Trois constats expliquent l'écart entre la solidité technique du prototype et son impact lors du pitch de 4 minutes :

- **Un périmètre très large pour 4 minutes de démonstration** : couvrir le dépôt d'idée, le moteur tripartite (*Qui / Où / Quand*), la gestion des invitations, les *Coups de main*, les *Offres* et le tableau de bord *Pouls* condensait beaucoup d'écrans en peu de temps.
- **Boucle de notification simulée** : si la génération du message d'invitation et le suivi d'état fonctionnent de bout en bout dans l'interface, l'envoi réel par courriel ou SMS et la confirmation par lien signé côté partenaire n'étaient pas branchés en 48 h.
- **Indicateurs d'activité plutôt que d'impact mesuré** : comme souligné honnêtement dans notre documentation au jury, les métriques du tableau de bord *Pouls* mesurent l'activité de la plateforme sur le jeu de démonstration ; la mesure d'impact réel dans le quartier nécessiterait un pilote terrain avec la SDC et la Ville.

---

## 4. Choix d'architecture et compromis techniques

| Décision technique | Justification en contexte hackathon (48 h) | Limite connue et évolution prévue |
| --- | --- | --- |
| **Formule de score hybride et explicable** (`0,55 × thème + 0,25 × besoins + 0,20 × proximité`) | Combine un lexique de 10 thèmes (`themes.js`), un calcul **TF-IDF local** (`texte.js`) pour capter les idées sans mot-clé exact (ex. *« tournoi d'échecs »* → organisme pour aînés) et, en option, des **embeddings locaux** (`@xenova/transformers`) sans envoyer les données de la Ville vers une API externe | Les pondérations (55 % / 25 % / 20 %) sont fixées empiriquement ; un pilote permettrait de les ajuster selon le taux d'acceptation réel des partenaires |
| **Cloisonnement strict `data/demo/` vs `data/local/`** | Respect absolu de l'entente de confidentialité de la Ville de Québec : les classeurs Excel (`donnees/`) et l'import JSON (`server/data/local/`) sont exclus de Git, tandis que le jeu fictif (`server/data/demo/` + `graines.js`) permet à quiconque de tester le dépôt immédiatement | Le géocodage des adresses brutes de la Ville via Nominatim (`npm run geocode`) est séparé du flux principal pour éviter tout appel réseau involontaire |
| **Stockage en mémoire avec persistance JSON (`store.js`)** | Aucune base de données externe à configurer ; réinitialisation instantanée en un clic (`/api/reset`) entre deux passages devant le jury | Non conçu pour des écritures concurrentes à grande échelle ; migration prévue vers SQLite ou PostgreSQL/PostGIS |

---

## 5. Rôle et transparence sur l'usage de l'IA

- **Conception, architecture et validation humaine** : modélisation du flux *Qui / Où / Quand / Coups de main*, conception de l'algorithme de score hybride (lexique + TF-IDF + Haversine), pipeline d'importation et d'assainissement des 4 fichiers Excel de la Ville de Québec (1 696 partenaires, 41 événements), écriture et validation des tests d'intégration (`server/test/moteur.test.js`), vérification d'accessibilité WCAG (contrastes ≥ 4,5:1) et préparation du scénario de pitch.
- **Assistance IA** : accélération du développement des composants d'interface React, génération du jeu de données fictif de démonstration (`graines.js` / `server/data/demo/`) et structuration documentaire.
