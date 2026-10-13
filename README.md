# Avis de la communauté

Application React/Vite avec une API PHP. L’aperçu utilise le stockage local ; la production utilise MySQL.

## Production automatique sur Hostinger

La fusion d’une pull request dans `main` lance **Production Hostinger**. Le workflow teste et compile le dernier `main`, puis transfère le site par SSH/rsync. Il vérifie ensuite la page, MySQL via `/health`, `/api/reviews` et la révision publiée. Une pull request fermée sans fusion ne publie rien. Une simple approbation de review ne publie pas encore le code.

Ce mode utilise un site PHP/HTML Hostinger avec Apache/LiteSpeed et un accès SSH. Les offres Web Premium ou supérieures et Cloud prennent en charge SSH/rsync. Un VPS doit avoir un serveur web PHP compatible avec `.htaccess`. Un site Hostinger AI Builder ne convient pas à ce paquet.

### Configuration initiale, une seule fois

1. Dans hPanel, activer SSH pour le site, utiliser PHP 8.3 avec `pdo_mysql`, et créer une base MySQL et son utilisateur.
2. Autoriser une clé SSH dédiée au déploiement. Garder sa clé privée dans GitHub, jamais dans le dépôt.
3. Copier `deploy/avis-communaute.config.php.example` dans le dossier du domaine, **à côté de `public_html`**, sous le nom `avis-communaute.config.php`. Renseigner les identifiants MySQL. La table des avis est créée automatiquement. Aucun secret MySQL n’est transféré par le workflow.
4. Dans GitHub → Settings → Secrets and variables → Actions, créer les secrets et variables ci-dessous.
5. Fusionner la pull request dans `main`. Le workflow peut aussi être relancé depuis Actions → Production Hostinger → Run workflow, sur `main`, après correction d’un accès ou de la configuration.

| Secret GitHub | Valeur |
| --- | --- |
| `HOSTINGER_SSH_HOST` | Adresse SSH du serveur indiquée dans hPanel |
| `HOSTINGER_SSH_USER` | Utilisateur SSH, par exemple `u123456789` |
| `HOSTINGER_SSH_KEY` | Clé privée SSH dédiée, complète, sans phrase secrète |
| `HOSTINGER_SSH_KNOWN_HOSTS` | Ligne `known_hosts` du serveur, avec le port SSH |

| Variable GitHub | Valeur |
| --- | --- |
| `HOSTINGER_PUBLIC_PATH` | Chemin absolu existant, par exemple `/home/u123456789/domains/exemple.fr/public_html` |
| `HOSTINGER_SITE_URL` | URL HTTPS canonique du site, par exemple `https://exemple.fr`, à la racine du domaine |
| `HOSTINGER_SSH_PORT` | Port de hPanel ; `65002` par défaut |

Obtenir la ligne `known_hosts` avec `ssh-keyscan -p 65002 ADRESSE_SSH`, puis vérifier son empreinte par un canal fiable auprès de Hostinger avant de la stocker. Le déploiement impose la vérification de cette clé ; un changement de clé serveur bloque le transfert.

L’environnement GitHub `production` ne doit pas exiger une seconde approbation si la publication doit suivre immédiatement la fusion. Pour réserver la validation aux pull requests, protéger `main`, exiger une review et le contrôle **Tests et compilation**, et interdire les pushes directs.

Le transfert remplace uniquement les fichiers du paquet. Il garde la configuration privée, les données MySQL et les anciens assets. Les fichiers frontend sont compilés et les routes PHP sont servies par `.htaccess`. Les anciens assets restent disponibles pour les pages déjà ouvertes. Une base absente ou inaccessible fait échouer le contrôle de production ; l’API ne stocke aucun avis dans un fichier temporaire en production.

Si une vérification échoue après le transfert, le workflow est en échec et la version transférée peut déjà être en ligne. Corriger la configuration ou fusionner un correctif, puis relancer le workflow. Il ne restaure pas automatiquement la version précédente.

### Commandes locales

```sh
npm ci
npm test
npm run build:hostinger
```

Le paquet se trouve dans `hostinger-site/`. Il contient le frontend compilé, l’API PHP, `.htaccess` et `release.json`. Il ne contient ni `.env`, ni identifiants MySQL, ni sources React, ni `node_modules`.

Documentation : [accès SSH et rsync Hostinger](https://www.hostinger.com/support/which-file-transfer-and-server-access-options-are-supported-at-hostinger/), [déclenchement après fusion GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#running-your-pull_request-workflow-when-a-pull-request-merges).
