# Avis de la communauté

Application React/Vite en français et API PHP. L’aperçu local enregistre les avis dans un fichier temporaire. Le site publié les enregistre dans une base MySQL Hostinger.

## Publier manuellement après la fusion d’une pull request

Cette procédure ne publie rien sur Hostinger automatiquement. Après chaque fusion, GitHub prépare un ZIP à envoyer manuellement sur Hostinger.

### 1. Fusionner et télécharger le paquet

1. Ouvrir la pull request vers `main`. Lire ses changements ; si GitHub la présente en brouillon, cliquer sur **Ready for review**. Attendre les vérifications vertes et l’approuver si GitHub le demande, puis cliquer sur **Merge pull request**.
2. Ouvrir l’onglet **Actions** du dépôt. Dans le workflow **Vérifications**, ouvrir l’exécution du commit de fusion dans `main` et attendre son résultat vert.
3. En bas de cette exécution, cliquer sur **site-hostinger** et télécharger le fichier ZIP. Ce lien reste disponible pendant 14 jours.
4. Décompresser ce ZIP sur votre ordinateur. Vous devez voir `index.html`, `.htaccess`, `release.json` et les dossiers `assets/` et `api/`. Le ZIP contient uniquement le site compilé ; il ne contient aucun mot de passe.

Il ne faut envoyer ni le dépôt GitHub entier, ni `src/`, ni `node_modules/`, ni `.env`. Le PHP à envoyer est déjà dans le dossier `api/` du ZIP ; vous n’avez pas à le déplacer depuis d’autres dossiers du dépôt.

### 2. Créer la base MySQL, une seule fois

Dans Hostinger, choisir **Websites → Dashboard → Databases → Management**, sélectionner le site `beluis.com`, puis créer une base et son utilisateur. Garder les cinq valeurs affichées : hôte MySQL, nom de la base, utilisateur, mot de passe et port `3306`. Hostinger ajoute un préfixe à la base et à l’utilisateur ; garder leur nom complet. [Guide Hostinger pour créer la base et son utilisateur](https://www.hostinger.com/support/1583542-how-to-create-a-new-mysql-database-in-hostinger/).

La base existe dans la section **Databases** de Hostinger, séparément des fichiers du site. Elle ne va ni dans `public_html`, ni dans le dépôt GitHub. Vous pouvez ouvrir **phpMyAdmin** dans **Databases → Management** pour consulter les avis. Il n’y a rien à importer : l’API crée la table `reviews` dans la base lors du premier appel.

### 3. Préparer le fichier privé de connexion à la base

Sur votre ordinateur, créer un fichier appelé `avis-communaute.config.php` avec ce contenu :

```php
<?php
return [
    'DB_HOST' => 'HOTE_MYSQL_AFFICHE_PAR_HOSTINGER',
    'DB_PORT' => '3306',
    'DB_NAME' => 'NOM_COMPLET_DE_LA_BASE',
    'DB_USER' => 'UTILISATEUR_MYSQL_COMPLET',
    'DB_PASSWORD' => 'MOT_DE_PASSE_MYSQL',
];
```

Remplacer les quatre valeurs par celles de votre base ; si Hostinger indique `localhost` comme hôte, mettre `localhost`. Ce mot de passe est celui de **MySQL**, pas celui du FTP. Ne pas remplir le modèle avec vos secrets dans GitHub et ne jamais téléverser ce fichier dans GitHub.

### 4. Sauvegarder le site déjà en ligne

**Le domaine `beluis.com` affiche actuellement votre portfolio.** Le chemin indiqué par votre compte FTP est `/home/u510042410/domains/beluis.com/public_html`. Envoyer l’application dans ce dossier remplacera la page d’accueil et les règles `.htaccess` actuelles. Avant l’envoi, télécharger une copie de tout `public_html` avec FileZilla. Si vous voulez garder le portfolio à la racine, créer un sous-domaine ou un site distinct dans Hostinger et utiliser son propre `public_html`.

Les avis se trouvent dans MySQL et ne sont pas stockés dans `public_html`. L’archive ne contient pas votre configuration MySQL, donc elle ne la remplace pas.

### 5. Se connecter à Hostinger et envoyer les fichiers

1. Dans Hostinger, ouvrir **Websites → Dashboard → Files → FTP Accounts** et recopier **l’adresse IP FTP**, le nom d’utilisateur, le répertoire autorisé et le port affichés pour votre compte. Hostinger donne l’IP FTP et le port 21 sur cette page. L’adresse `ftp.beluis.com` fournie ne résout actuellement pas : utiliser l’IP indiquée par hPanel. Ne pas remplacer cette IP par une adresse trouvée au hasard. [Guide officiel Hostinger pour les détails FTP et l’envoi de fichiers](https://www.hostinger.com/support/1869164-how-to-upload-backups-with-ftp-in-hostinger/).
2. Dans FileZilla, entrer l’IP de l’hôte, le nom d’utilisateur et le port 21. Sélectionner **FTP**. L’aide Hostinger indique **Only use plain FTP** pour ce type d’accès. Le FTP simple n’est pas chiffré : changer d’abord le mot de passe déjà partagé dans la conversation, puis saisir le nouveau directement dans FileZilla. Ne pas le coller ici ni dans GitHub.
3. Pour les petits fichiers, vous pouvez aussi utiliser **Hostinger → File Manager** dans votre navigateur à la place de FileZilla. Hostinger permet d’y téléverser un ZIP et de le décompresser.
4. Du côté distant, vérifier que le chemin finit bien par `domains/beluis.com/public_html`, sauf si vous avez créé un sous-domaine.
5. Du côté de votre ordinateur, ouvrir le dossier décompressé et sélectionner son contenu. Envoyer `index.html`, `release.json`, `.htaccess`, et les dossiers `assets/` et `api/` dans `public_html`. Envoyer le dossier `assets/` en entier pour conserver sa structure. Si FileZilla masque `.htaccess`, choisir **Server → Force showing hidden files**.
6. Si FileZilla demande quoi faire des fichiers existants, remplacer `index.html`, `.htaccess`, `assets/` et les deux fichiers PHP fournis. Ne pas supprimer les autres fichiers. Garder dans `api/` le fichier privé `avis-communaute.config.php` ; le ZIP ne le contient pas.
7. Envoyer aussi `avis-communaute.config.php` depuis votre ordinateur dans `public_html/api/`. Son chemin final doit être `public_html/api/avis-communaute.config.php`. L’API le lit automatiquement et `.htaccess` bloque son accès direct depuis Internet.

### 6. Vérifier le site

Ouvrir votre site en HTTPS. Pour vérifier séparément :

- `/health` doit afficher `{"status":"ok"}`. Ce contrôle vérifie aussi la connexion MySQL.
- `/api/reviews` doit afficher `[]` si personne n’a encore publié d’avis.
- Depuis la page, publier un avis test, recharger la page et vérifier que l’avis apparaît toujours.
- Dans phpMyAdmin, ouvrir la base créée puis `reviews` pour retrouver cet avis.

Si `/health` répond par une erreur, vérifier d’abord le fichier privé dans `public_html/api/`, puis les cinq valeurs MySQL. Si la page renvoie une erreur 404 à la place d’un fichier JSON, vérifier la présence du fichier `.htaccess` dans `public_html`.

### Pour les publications suivantes

Après chaque nouvelle fusion, télécharger le nouvel artefact **site-hostinger**, le décompresser, sauvegarder les fichiers qui sont en ligne puis envoyer le nouveau contenu. Ne pas recréer la base, ne pas importer de fichier SQL et ne pas écraser `api/avis-communaute.config.php`. La base conserve les avis.

### En cas de retour à l’ancien site

Dans FileZilla, remettre en place les fichiers sauvegardés avant la publication. Ne pas supprimer la base MySQL : elle contient les avis et n’a pas besoin d’être modifiée pour restaurer l’ancien site.

Pour créer ou restaurer une sauvegarde de base, ouvrir **Websites → Dashboard → Databases → Management → Enter phpMyAdmin**, puis utiliser **Export**. [Guide Hostinger pour phpMyAdmin](https://www.hostinger.com/support/4529011-how-to-export-a-database-with-phpmyadmin-in-hostinger/).

## Commandes pour le paquet local

Si vous utilisez un ordinateur avec Node.js installé, la même archive peut être créée depuis la branche fusionnée :

```sh
npm ci
npm test
npm run build:hostinger
```

Le site compilé se trouve alors dans `hostinger-site/`.
