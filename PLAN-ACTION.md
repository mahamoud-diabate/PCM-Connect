# Plan d'action — PCM, hackathon Saint-Roch 2026

Un tableau à cocher, à remplir avec l'équipe. La colonne **Qui** est volontairement vide : c'est la vôtre à remplir.
Fichiers concernés : ce dépôt (`pcm/`), le dossier `docs/` (dossier du jury) et la présentation (`PCM-presentation.pptx`, `PCM-presentation-a-presenter.docx`).

## 1. État d'avancement

| Étape | État | Qui | Quand |
|---|---|---|---|
| Interface refaite : thème clair, une seule police, coins de 6 px, mise en page large pour le projecteur | ✅ fait | | |
| Sécurité de l'API : validation des entrées, cors fermé par défaut, en-têtes, taille de requête limitée | ✅ fait | | |
| Données de la Ville hors de Git (`.gitignore`, dossier `data/local/`) | ✅ fait | | |
| Jeu de démonstration fictif régénéré (projets et offres), marqué « Exemple fictif » | ✅ fait | | |
| Tests automatisés du moteur et de l'API (7 tests) | ✅ fait | | |
| Section « Coups de main » : tâches à cocher, inscription au nom, barre de progression | ✅ fait | | |
| Moteur : ajout du TF-IDF local (idée sans mot-clé) | ✅ fait | | |
| Parcours complet vérifié dans Chrome, contrôles de contraste WCAG | ✅ fait | | |
| README réécrit (installation, structure, confidentialité, vérifications) | ✅ fait | | |
| Présentation PowerPoint + document de rôle de chacun | ✅ fait | | |
| Répétition du pitch avec chronomètre, deux fois | ⬜ à faire | | avant le jour J |
| Préparer la machine de démonstration (mode `dev:demo`, jeu de données fictif) | ⬜ à faire | | la veille |
| Se répartir les questions du jury (voir §4) | ⬜ à faire | | la veille |
| Test sur téléphone (même Wi-Fi) et sur le projecteur (résolution) | ⬜ à faire | | la veille |
| Vérifier la connexion Internet de la salle (la carte en dépend) | ⬜ à faire | | sur place |
| Pousser le dépôt sur GitHub après vérification du `.gitignore` | ⬜ à faire | | avant le pitch |

## 2. Le jour J — ordre d'exécution

1. Machine allumée, Node installé, `npm run build` déjà fait.
2. `npm run start:demo` (un seul serveur, port 3001) puis ouvrir `http://localhost:3001`.
3. Vérifier une fois : accueil, exemple « Verdir notre ruelle », onglet Qui, invitation, projet, offres, pouls.
4. « Réinitialiser la démo » pour partir d'un état propre devant le jury.
5. Aucun onglet parasite ouvert, notifications coupées, luminosité de l'écran baissée (thème sombre).
6. Si Internet tombe : le parcours reste utilisable, seule la carte OpenStreetMap devient grise. Le dire calmement, ne pas s'excuser.

## 3. Pitch minuté (4 minutes)

| Temps | Séquence | Écran | Présentateur (à remplir) |
|---|---|---|---|
| 0:00–0:10 | Couverture. | Accueil | |
| 0:10–0:45 | Le problème : une bonne idée meurt faute de savoir à qui parler. Ni le 311 ni les formulaires ne relient voisins, commerçants et organismes. | Diapo 2 | |
| 0:45–1:10 | La promesse : de l'idée au projet en trois minutes — qui, où, quand. | Diapos 3 | |
| 1:10–2:45 | Démonstration : idée → constellation (Qui, Où, Quand) → invitation → page du projet → message prêt. | Application | |
| 2:45–3:15 | Les coups de main : on coche une tâche devant le jury, la barre monte de 33 % à 50 %. | Application | |
| 3:15–3:50 | Moteur, technologies, outils et données exploitées ; données de la Ville hors de Git, IA locale. | Diapos 7 et 8 | |
| 3:50–4:10 | Le pouls : la Ville et la SDC voient les besoins sans réponse. | Diapo 9 | |
| 4:10–4:25 | Ce qui est vérifié : tests, parcours, contrastes, build. | Diapo 11 | |
| 4:25–4:45 | Limites assumées, sans excuse. | Diapo 12 | |
| 4:45–5:00 | La suite : trois acteurs volontaires, indicateurs définis avec eux, vitrines vivantes. | Diapo 13 | |

Durée totale : **5 minutes**, puis 3 minutes de questions (cahier du participant). Les diapositives 4 (promesse) et 10 (mobile) ne sont pas dites : elles servent de secours pendant les questions. Une version de 90 secondes est prête dans le document Word.

## 4. Questions du jury — réponses écrites

| Question probable | Réponse (une ou deux phrases) |
|---|---|
| « Pourquoi pas le 311 ? » | Le 311 prend un signalement ; PCM connecte des acteurs entre eux. Le 311 traite un irritant, PCM organise une action collective. |
| « Comment mesurez-vous l'impact ? » | Six indicateurs dans Pouls : projets, partenariats, acteurs mobilisés, taux de réponse, projets réalisés, offres. Ce sont des mesures d'activité, pas d'impact social — l'impact demanderait un pilote et un protocole d'évaluation. |
| « C'est de l'IA ou des mots-clés ? » | Les deux, et c'est assumé : un lexique de thèmes, un TF-IDF local, et une IA sémantique optionnelle qui tourne sur la machine. Aucune donnée ne part chez un fournisseur. |
| « Qui maintient la plateforme ? » | Personne, c'est un prototype jetable de hackathon — et c'est un choix d'ingénierie assumé. Le passage à un service réel suppose une équipe et un propriétaire identifiés, à décider avec la Ville. |
| « Comment la financez-vous ? » | À explorer après validation du besoin : un pilote financé par un programme de la Ville ou de la SDC, puis un modèle par abonnement des acteurs commerciaux pour les vitrines vacantes. |
| « Les données des commerces sont-elles protégées ? » | Elles ne quittent pas la machine : le dossier local est exclu de Git, l'interface indique la source, et le jeu présenté au jury est entièrement fictif. |
| « Et les partenaires réels, ils ont accepté ? » | Non, et rien ne le prétend : les projets de la démonstration sont marqués « Exemple fictif » et les réponses sont simulées. Le moteur, lui, tourne bien sur les 1 696 organisations réelles fournies par la Ville. |

## 5. À ne pas dire

- « Notre IA comprend les projets » → dire : « un lexique, un TF-IDF local et une IA optionnelle ».
- « Ça marche pour tout Québec » → dire : « Saint-Roch d'abord, les 9 artères des SDC ensuite ».
- « Les partenaires sont déjà d'accord » → ce n'est pas le cas, les réponses sont simulées.
- Un chiffre d'impact social inventé. Les indicateurs sont des mesures d'activité sur un jeu fictif.
