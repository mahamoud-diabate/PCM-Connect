# Retour sur le Hackathon Saint-Roch 2026

## L'événement

Hackathon Saint-Roch 2026, à Québec. Deux jours, équipe de trois. Le défi : *comment faciliter la création de projets dans Saint-Roch en mobilisant les parties prenantes ?* La Ville fournissait quatre classeurs Excel : 1 696 organismes, commerces et entreprises du quartier, et 41 événements.

On a présenté le prototype au jury. On n'a pas gagné.

## Le problème qu'on a essayé de régler

Le 311 prend un signalement. Il ne connecte personne. Une idée de quartier meurt souvent là : la personne sait ce qu'elle veut faire, mais pas à qui parler. Les ressources sont dans les fichiers de la Ville, réparties dans des classeurs que personne ne consulte, sans recherche par besoin concret.

## Ce qu'on a construit

Une application React + Express avec un parcours en trois étapes.

On décrit l'idée. Le moteur propose les partenaires (**qui**), les lieux (**où**) et les événements à venir (**quand**). Chaque suggestion affiche pourquoi elle sort : thème commun, ressource offerte, distance, appartenance à la SDC. C'était un choix délibéré : un score qu'on peut contester ligne par ligne plutôt qu'une boîte noire.

Ensuite la page projet génère le message d'invitation pour chaque partenaire, suit les réponses et ouvre des **coups de main** : de petites tâches que les voisins cochent sans créer de compte. Une barre indique ce qui manque avant le jour J.

Le **Pouls** est le tableau de bord pour la Ville et la SDC : projets actifs, besoins non comblés, alignement avec le Plan d'action 2026-2029.

## Pourquoi on n'a pas gagné

Trois raisons, honnêtement.

On montrait trop de choses. Dépôt d'idée, constellation, invitations, coups de main, offres, tableau de bord : six écrans en quatre minutes. Un jury retient un angle, pas un tour complet de l'application.

La boucle d'invitation s'arrête à l'interface. Le message est rédigé et prêt à copier, mais rien ne part réellement par courriel ou SMS, et le partenaire ne reçoit pas de lien signé. En 48 h, on a préféré finir le parcours visible plutôt que brancher un service d'envoi.

Les chiffres du Pouls mesurent l'activité de la plateforme sur un jeu fictif. Ce ne sont pas des mesures d'impact social. On l'a dit au jury, et on le répète ici : mesurer un effet réel dans le quartier demanderait un pilote avec protocole d'évaluation.

## Choix techniques

**Le score est une formule, pas un appel à un LLM.** `0,55 × pertinence + 0,25 × besoins + 0,20 × proximité`. La pertinence prend le meilleur de trois signaux : un lexique de 10 thèmes, un TF-IDF local sur les descriptions, et un modèle d'embeddings optionnel qui tourne sur la machine. Aucune clé d'API, réponse en quelques millisecondes, et chaque point est justifiable devant un citoyen. La limite : les pondérations sont fixées à la main, sans données d'acceptation réelles pour les calibrer.

**Les données de la Ville ne sortent pas de la machine.** Deux dossiers séparés : `data/demo/` (fictif, versionné) et `data/local/` (les fichiers de la Ville, exclu de Git). Le géocodage par Nominatim est le seul script qui fait un appel réseau, et il est optionnel.

**Pas de base de données.** L'état vit en mémoire et se persiste en JSON, avec une réinitialisation en un clic entre deux passages devant le jury. Ça tient pour un prototype mono-instance, pas pour des écritures concurrentes. La suite logique serait SQLite ou PostGIS.

## Sur l'usage de l'IA

Le modèle de données, la formule du score, le pipeline d'import des quatre fichiers Excel, les tests et le scénario de pitch, c'est du travail humain, vérifié à la main. Le développement des composants React, la génération du jeu fictif et la mise en forme de la documentation ont été accélérés par l'IA. C'est assumé, et c'est écrit ici plutôt que découvert en entrevue.
