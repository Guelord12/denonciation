#!/usr/bin/env bash
set -euo pipefail

# Script de build mobile via EAS (Expo Application Services).
# Nécessite eas-cli, compte Expo connecté, et les certificats Google/Apple configurés.
# Usage: ./scripts/build_eas.sh android|ios

PLATFORM=${1:-android}
cd mobile

if ! command -v eas >/dev/null 2>&1; then
  echo "eas-cli non trouvé. Installer: npm install -g eas-cli"
  exit 1
fi

echo "🔐 Vérifiez que vous êtes connecté: eas whoami || eas login"

echo "🔧 Lancement du build pour ${PLATFORM}"
eas build --platform ${PLATFORM} --profile production

echo "✅ Build demandé. Récupérez l'URL/artefact depuis la sortie EAS." 
