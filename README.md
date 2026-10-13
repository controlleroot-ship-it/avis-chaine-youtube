# Avis & Chaîne

Application de collecte et de lecture des avis de la communauté, avec React/Vite, une API PHP et une base MySQL.

## Développement local

1. Installer Node.js, PHP avec PDO MySQL et un serveur MySQL accessible.
2. Copier `.env.example` vers `.env` et renseigner les paramètres MySQL.
3. Installer les dépendances avec `npm ci`.
4. Créer la table des avis avec `php api/init-db.php`.
5. Démarrer l’API avec `php -S 0.0.0.0:8000 api/router.php`.
6. Dans un autre terminal, démarrer React avec `npm run dev`.

Vite transmet `/api/*` à l’API PHP. `PHP_API_URL` peut remplacer sa cible locale lorsque les services tournent séparément.

## API

- `GET /api/reviews` retourne les avis récents.
- `GET /api/reviews?sort=top` retourne les avis les mieux notés.
- `POST /api/reviews` ajoute un avis JSON avec `name`, `rating` (1 à 5) et `message`.
- `GET /health` vérifie la connexion MySQL.

La table `reviews` est créée automatiquement au démarrage de l’API si elle n’existe pas.
