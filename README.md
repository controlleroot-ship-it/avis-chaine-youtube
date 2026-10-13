# Avis & Chaîne

Application de collecte et de lecture des avis de la communauté, avec React/Vite, une API PHP et une base MySQL.

## Développement local

1. Installer Node.js, PHP avec PDO MySQL et MariaDB/MySQL.
2. Pour MySQL, créer la base `avis_chaine` et renseigner les paramètres de `.env.example` dans `.env`. Sans ces paramètres, l’API conserve les avis dans un fichier local temporaire.
3. Installer les dépendances avec `npm ci`.
4. Avec MySQL, charger les variables dans le terminal de l’API : `set -a; source .env; set +a` (Bash), puis créer la table avec `php api/init-db.php`.
5. Démarrer l’API avec `npm run dev:api`.
6. Dans un autre terminal, démarrer React avec `npm run dev`.

Vite transmet `/api/*` à l’API PHP. `PHP_API_URL` peut remplacer sa cible locale lorsque les services tournent séparément.

## API

- `GET /api/reviews` retourne les avis récents.
- `GET /api/reviews?sort=top` retourne les avis les mieux notés.
- `POST /api/reviews` ajoute un avis JSON avec `name`, `rating` (1 à 5) et `message`.
- `GET /health` vérifie la connexion MySQL.

Dans le sandbox Kosuke, systemd gère les services : `frontend` lance `npm run dev` et `api` dépend du service `database` (MariaDB locale). La configuration des services injecte les variables `DB_*`, initialise la table avec `php api/init-db.php`, puis lance `npm run dev:api`. Le contrôle de santé de l’API utilise `/health` pour vérifier la connexion MySQL avant de démarrer le frontend. Vite compile les fichiers React et transmet les requêtes des avis à l’API PHP.

En développement local sans variables `DB_*`, l’API utilise un fichier temporaire. Utilisez MySQL pour conserver les avis hors du répertoire temporaire.

Pour héberger le site sur Hostinger, créez une base MySQL dans hPanel, autorisez l’accès distant si nécessaire, puis remplacez les variables `DB_*` par les valeurs fournies par Hostinger.
