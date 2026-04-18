# Dénonciation - Plateforme de Signalement d'Abus

Application complète de signalement d'abus avec streaming live, interface web et mobile.

## 🚀 Fonctionnalités

### Utilisateurs
- ✅ Inscription avec validation email/SMS
- ✅ Connexion sécurisée JWT
- ✅ Profil utilisateur personnalisable
- ✅ Signalements avec photos/vidéos
- ✅ Commentaires et likes
- ✅ Témoignages
- ✅ Notifications en temps réel

### Streaming Live
- ✅ Diffusion en direct RTMP/HLS
- ✅ Chat en temps réel
- ✅ Streams premium payants
- ✅ Compteur de spectateurs en direct
- ✅ Likes pendant le stream

### Administration
- ✅ Tableau de bord temps réel
- ✅ Gestion complète des utilisateurs
- ✅ Modération des signalements
- ✅ Alertes SMS automatiques
- ✅ Audit et logs d'activité
- ✅ Export de données (CSV)
- ✅ Statistiques avancées

### Mobile (React Native/Expo)
- ✅ Support iOS et Android
- ✅ Caméra et galerie
- ✅ Géolocalisation
- ✅ Notifications push
- ✅ Lecture de streams live

## 📦 Installation

### Prérequis
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- FFmpeg (pour les streams)
- Docker (optionnel)

### Installation rapide avec Docker

```bash
# Cloner le projet
git clone https://github.com/votre-compte/denonciation.git
cd denonciation

# Configurer les variables d'environnement
cp backend/.env.example backend/.env
# Éditer backend/.env avec vos configurations

# Lancer avec Docker Compose
docker-compose up -d