#!/usr/bin/env bash
set -euo pipefail

# Remplacer les variantes textuelles de la marque dans les fichiers suivis par git
# Exclut les fichiers binaires communs

echo "🔎 Collecting tracked files..."
files=$(git ls-files)

echo "🔁 Replacing strings..."
for f in $files; do
  # Skip binary extensions
  case "$f" in
    *.png|*.jpg|*.jpeg|*.gif|*.ico|*.pdf|*.zip|*.7z|*.tar|*.gz|*.tgz|*.mp4|*.mp3|*.mov) 
      continue
      ;;
  esac

  # Use perl in-place to replace several patterns (case-sensitive where appropriate)
  perl -0777 -pe \
    "s/\bDénonciation\b/Dénonce/g; s/\bDenonciation\b/Dénonce/g; s/\bDENONCIATION\b/DENONCE/g; s/\bdenonciation\b/denonce/g; s/denonciation/denonce/g; s/\bDénon\b/Dénon/g;" \
    -i -- "$f" 2>/dev/null || true

done

echo "✅ Renommage terminé."

echo "Git status:" 
 git status --porcelain
