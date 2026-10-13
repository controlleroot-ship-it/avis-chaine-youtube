#!/usr/bin/env bash
set -euo pipefail

for name in HOSTINGER_SSH_HOST HOSTINGER_SSH_USER HOSTINGER_SSH_KEY HOSTINGER_SSH_KNOWN_HOSTS HOSTINGER_PUBLIC_PATH HOSTINGER_SITE_URL; do
  if [[ -z "${!name:-}" ]]; then
    printf 'Configuration manquante : %s\n' "$name" >&2
    exit 1
  fi
done

port="${HOSTINGER_SSH_PORT:-65002}"
[[ "$HOSTINGER_SSH_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || { echo 'Hôte SSH invalide.' >&2; exit 1; }
[[ "$HOSTINGER_SSH_USER" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ ]] || { echo 'Utilisateur SSH invalide.' >&2; exit 1; }
[[ "$port" =~ ^[0-9]{1,5}$ ]] && (( 10#$port >= 1 && 10#$port <= 65535 )) || { echo 'Port SSH invalide.' >&2; exit 1; }
[[ "$HOSTINGER_PUBLIC_PATH" =~ ^/[a-zA-Z0-9_./-]+/public_html$ ]] && [[ "$HOSTINGER_PUBLIC_PATH" != *'..'* ]] || { echo 'Chemin public_html invalide.' >&2; exit 1; }
[[ "$HOSTINGER_SITE_URL" =~ ^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]+)?/?$ ]] || { echo 'URL HTTPS du site invalide.' >&2; exit 1; }
[[ -f hostinger-site/index.html && -f hostinger-site/api/index.php && -f hostinger-site/.htaccess && -f hostinger-site/release.json ]] || { echo 'Paquet Hostinger absent.' >&2; exit 1; }

credentials_dir=$(mktemp -d)
trap 'rm -rf -- "$credentials_dir"' EXIT
chmod 700 "$credentials_dir"
printf '%s\n' "$HOSTINGER_SSH_KEY" > "$credentials_dir/key"
printf '%s\n' "$HOSTINGER_SSH_KNOWN_HOSTS" > "$credentials_dir/known_hosts"
chmod 600 "$credentials_dir/key" "$credentials_dir/known_hosts"
unset HOSTINGER_SSH_KEY HOSTINGER_SSH_KNOWN_HOSTS
ssh-keygen -y -P '' -f "$credentials_dir/key" >/dev/null

ssh_options=(-p "$port" -i "$credentials_dir/key" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$credentials_dir/known_hosts" -o ConnectTimeout=15)
target="$HOSTINGER_SSH_USER@$HOSTINGER_SSH_HOST"
ssh "${ssh_options[@]}" "$target" "test -d '$HOSTINGER_PUBLIC_PATH' && test -f '$HOSTINGER_PUBLIC_PATH/../avis-communaute.config.php'"

# Aucun --delete : préserver la configuration privée et les anciens assets.
printf -v transport '%q ' ssh "${ssh_options[@]}"
rsync -rltz --delay-updates --chmod=D755,F644 -e "$transport" hostinger-site/ "$target:$HOSTINGER_PUBLIC_PATH/"

site_url="${HOSTINGER_SITE_URL%/}"
revision=$(node -p "JSON.parse(require('node:fs').readFileSync('hostinger-site/release.json', 'utf8')).revision")
curl --fail --silent --show-error --proto '=https' --connect-timeout 10 --max-time 30 "$site_url/" >/dev/null
curl --fail --silent --show-error --proto '=https' --connect-timeout 10 --max-time 30 "$site_url/health" | node -e "let data=''; process.stdin.on('data', part => data += part); process.stdin.on('end', () => { if (JSON.parse(data).status !== 'ok') process.exit(1); });"
curl --fail --silent --show-error --proto '=https' --connect-timeout 10 --max-time 30 "$site_url/api/reviews" | node -e "let data=''; process.stdin.on('data', part => data += part); process.stdin.on('end', () => { if (!Array.isArray(JSON.parse(data))) process.exit(1); });"
curl --fail --silent --show-error --proto '=https' --connect-timeout 10 --max-time 30 "$site_url/release.json?revision=$revision" | EXPECTED_REVISION="$revision" node -e "let data=''; process.stdin.on('data', part => data += part); process.stdin.on('end', () => { if (JSON.parse(data).revision !== process.env.EXPECTED_REVISION) process.exit(1); });"
echo 'Production Hostinger publiée et vérifiée.'
