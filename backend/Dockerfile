FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances (incluant dev pour le build)
RUN npm ci

# Copier le code source
COPY . .

# Compiler TypeScript
RUN npm run build

# Exposer le port
EXPOSE 8080

# Démarrer l'application
CMD ["node", "dist/index.js"]