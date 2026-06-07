#!/usr/bin/env bash
set -euo pipefail

# Script de déploiement AWS (exemples). Nécessite AWS CLI configuré (credentials + region).
# Usage: ./scripts/deploy_aws.sh <s3-bucket> <ec2-ssh-user@host> <path/to/key.pem>

S3_BUCKET=${1:-denonce-web-prod}
SSH_DEST=${2:-ubuntu@YOUR_EC2_IP}
SSH_KEY=${3:-/path/to/key.pem}

echo "🔁 Build web"
cd web
npm ci
npm run build
cd ..

echo "☁️ Sync vers S3: ${S3_BUCKET}"
aws s3 sync web/dist s3://${S3_BUCKET} --delete

echo "🧾 Copie index.html"
aws s3 cp web/dist/index.html s3://${S3_BUCKET}/index.html

echo "🔑 Déployer backend (ex: git pull + pm2) sur ${SSH_DEST}"
ssh -i "${SSH_KEY}" "${SSH_DEST}" \
  'cd /home/ubuntu/denonce || exit 1; git pull origin main; npm ci --production; pm2 restart denonciation-backend || pm2 start ecosystem.config.js'

echo "✅ Déploiement AWS terminé (si commandes distantes réussissent)."
