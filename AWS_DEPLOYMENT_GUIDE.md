# 🚀 Guide Déploiement AWS - Denonce Application

## 📋 Prérequis

### Outils requis
```bash
# AWS CLI v2
aws --version

# Node.js 18+
node -v

# npm
npm -v

# EAS CLI (pour builds mobiles)
npm install -g eas-cli
```

### Comptes & Credentials
- Compte AWS avec accès administrateur
- AWS Access Key ID & Secret Access Key
- Domaine registré (ex: denonce.app)

---

## 🌐 Phase 1: Configuration AWS (20-30 min)

### 1.1 Configurer AWS CLI
```bash
aws configure
# AWS Access Key ID: [votre-id]
# AWS Secret Access Key: [votre-secret]
# Default region: eu-west-1 (ou votre région)
# Default output format: json
```

### 1.2 Créer S3 Bucket pour Web Build
```bash
# Créer le bucket
aws s3api create-bucket \
  --bucket denonce-web-prod \
  --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1

# Activer static website hosting
aws s3api put-bucket-website \
  --bucket denonce-web-prod \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "index.html"}
  }'

# Activer versioning (pour rollback)
aws s3api put-bucket-versioning \
  --bucket denonce-web-prod \
  --versioning-configuration Status=Enabled

# Configurer CORS
cat > cors.json << 'EOF'
{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD", "POST"],
    "AllowedOrigins": ["https://denonce.app", "https://api.denonce.app"],
    "MaxAgeSeconds": 3000
  }]
}
EOF

aws s3api put-bucket-cors --bucket denonce-web-prod --cors-configuration file://cors.json
```

### 1.3 Configurer Permissions S3
```bash
# Politique de bucket pour accès public (lecture seule)
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::denonce-web-prod/*"
  }]
}
EOF

aws s3api put-bucket-policy --bucket denonce-web-prod --policy file://bucket-policy.json
```

### 1.4 Lancer EC2 pour Backend

```bash
# 1. Créer security group
aws ec2 create-security-group \
  --group-name denonce-backend \
  --description "Security group pour backend Denonce" \
  --region eu-west-1

# Récupérer l'ID du group
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=denonce-backend" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# 2. Autoriser ports
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 8000 --cidr 0.0.0.0/0

# 3. Créer IAM role pour S3 access
aws iam create-role --role-name denonce-backend-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attacher politiques
aws iam attach-role-policy --role-name denonce-backend-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-role-policy --role-name denonce-backend-role \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

# Créer instance profile
aws iam create-instance-profile --instance-profile-name denonce-backend-profile
aws iam add-role-to-instance-profile \
  --instance-profile-name denonce-backend-profile \
  --role-name denonce-backend-role

# 4. Lancer l'instance EC2
aws ec2 run-instances \
  --image-id ami-0d527b8c289b4af7f \
  --instance-type t3.small \
  --security-group-ids $SG_ID \
  --iam-instance-profile Name=denonce-backend-profile \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=denonce-backend}]' \
  --user-data file://userdata.sh \
  --region eu-west-1

# Récupérer IP publique
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=denonce-backend" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

aws ec2 allocate-address --domain vpc
aws ec2 associate-address --instance-id $INSTANCE_ID --public-ip [VOTRE-IP-ELASTIQUE]
```

### 1.5 Créer CloudFront Distribution
```bash
# Créer distribution pour S3
aws cloudfront create-distribution --distribution-config '{
  "CallerReference": "'$(date +%s)'",
  "Comment": "Denonce Web App CDN",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "denonce-web-s3",
      "DomainName": "denonce-web-prod.s3.amazonaws.com",
      "S3OriginConfig": {"OriginAccessIdentity": ""}
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "denonce-web-s3",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {"Enabled": false, "Quantity": 0},
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"}
    },
    "MinTTL": 0
  }
}'
```

---

## 🏗️ Phase 2: Déployer l'Application

### 2.1 Créer user-data pour EC2
```bash
cat > userdata.sh << 'EOF'
#!/bin/bash
set -e

# Mise à jour système
apt-get update
apt-get upgrade -y

# Installer Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Installer PM2 pour gérer le process
npm install -g pm2

# Installer Nginx pour reverse proxy
apt-get install -y nginx

# Clone le projet
cd /home/ubuntu
git clone [VOTRE-REPO-URL] denonce
cd denonce

# Installer dépendances
npm install

# Build backend
npm run build:server

# Configurer PM2
pm2 start "npm run start:server" --name "denonce-api"
pm2 startup
pm2 save

# Configurer Nginx
cat > /etc/nginx/sites-available/denonce << 'NGINX'
server {
    listen 80;
    server_name denonce.app api.denonce.app;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/denonce /etc/nginx/sites-enabled/
systemctl enable nginx
systemctl restart nginx

# Configurer Let's Encrypt (SSL)
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d denonce.app -d api.denonce.app

echo "Setup complete!"
EOF
```

### 2.2 Build Web
```bash
cd /path/to/denonce

# Installer dépendances
npm install

# Build production
npm run build:web

# Vérifier le build
ls -lah web/dist/
```

### 2.3 Upload Web vers S3
```bash
# Syncer les fichiers (avec delete des fichiers supprimés)
aws s3 sync web/dist/ s3://denonce-web-prod/ \
  --delete \
  --cache-control "max-age=3600" \
  --metadata-directive REPLACE

# Ou upload spécifique
aws s3 cp web/dist/index.html s3://denonce-web-prod/ \
  --cache-control "max-age=0" \
  --content-type "text/html"
```

### 2.4 Build Mobile (via EAS)

```bash
# Setup EAS
eas login

# Build iOS (depuis Mac ou service EAS)
eas build --platform ios --profile production

# Build Android
eas build --platform android --profile production

# Ou tester en développement
eas build --platform android --profile preview

# Télécharger les builds
# Les fichiers seront disponibles sur le dashboard EAS
```

### 2.5 Déployer sur App Stores

#### Google Play Store
```bash
# Créer key store (une seule fois)
# keytool -genkey -v -keystore keystore.jks \
#   -keyalg RSA -keysize 2048 -validity 10000 \
#   -alias denonce

# Build signed APK/AAB
eas build --platform android --profile production

# Uploader sur Google Play Console
# - Créer application
# - Upload AAB
# - Remplir store listing (description, screenshots, etc.)
# - Review & Publish
```

#### Apple App Store
```bash
# Build signed IPA
eas build --platform ios --profile production

# Via Xcode
open -a Xcode ios/

# Ou via CLI
xcrun altool --upload-app -f app.ipa -t ios \
  -u votre-apple-id@example.com \
  -p votre-app-specific-password
```

---

## 🔧 Phase 3: Configuration Post-Déploiement

### 3.1 Configurer Variables d'Environnement
```bash
# Sur l'instance EC2
cat >> /home/ubuntu/denonce/.env << 'EOF'
DATABASE_URL=postgresql://user:password@rds-instance.amazonaws.com/denonce
REDIS_URL=redis://elasticache.amazonaws.com:6379
AWS_BUCKET=denonce-web-prod
AWS_REGION=eu-west-1
JWT_SECRET=your-secret-key-here
API_PORT=8000
NODE_ENV=production
EOF
```

### 3.2 Configurer RDS pour Database
```bash
# Créer RDS instance
aws rds create-db-instance \
  --db-instance-identifier denonce-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password your-secure-password \
  --allocated-storage 20 \
  --storage-type gp2 \
  --no-publicly-accessible
```

### 3.3 Configurer CloudWatch Monitoring
```bash
# Créer alarm CPU
aws cloudwatch put-metric-alarm \
  --alarm-name denonce-high-cpu \
  --alarm-description "Alert si CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

### 3.4 Auto-Scaling (optionnel)
```bash
# Créer Launch Configuration
aws autoscaling create-launch-configuration \
  --launch-configuration-name denonce-lc \
  --image-id ami-0d527b8c289b4af7f \
  --instance-type t3.small \
  --iam-instance-profile denonce-backend-profile

# Créer Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name denonce-asg \
  --launch-configuration-name denonce-lc \
  --min-size 2 \
  --max-size 6 \
  --desired-capacity 2
```

---

## ✅ Checklist Déploiement

- [ ] AWS CLI configuré
- [ ] S3 bucket créé et configuré
- [ ] EC2 instance lancée avec security group
- [ ] IAM roles et policies configurés
- [ ] CloudFront distribution créée
- [ ] DNS records pointant vers CloudFront
- [ ] Certificate SSL/TLS installé
- [ ] Web build compilé et uploadé sur S3
- [ ] Backend déployé sur EC2
- [ ] Base de données RDS configurée
- [ ] Variables d'environnement définies
- [ ] Tests de connectivité API réussis
- [ ] Builds mobiles créés via EAS
- [ ] Apps publiées sur Google Play et App Store
- [ ] CloudWatch monitoring activé
- [ ] Backups et disaster recovery configurés

---

## 🔍 Tests Post-Déploiement

```bash
# Test Web
curl https://denonce.app/

# Test API
curl https://api.denonce.app/health

# Test S3
aws s3 ls s3://denonce-web-prod/

# Test EC2 SSH
ssh -i your-key.pem ec2-user@your-ec2-ip
pm2 logs denonce-api
```

---

## 📊 Monitoring & Maintenance

### Logs
```bash
# Voir logs applicat

ion
pm2 logs denonce-api

# Logs Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# CloudWatch
aws logs tail /aws/ec2/denonce-api --follow
```

### Health Checks
- Endpoint: `https://api.denonce.app/health`
- Réponse: `{ "status": "ok", "timestamp": "..." }`

### Backup Database
```bash
# Snapshot RDS quotidien (automatique)
aws rds create-db-snapshot \
  --db-instance-identifier denonce-db \
  --db-snapshot-identifier denonce-db-backup-$(date +%Y%m%d)
```

---

## 💰 Coûts Estimés (Mensuels)

| Service | Instance | Cost |
|---------|----------|------|
| **S3** | Storage 10GB | ~$0.23 |
| **S3** | Data Transfer | ~$5-10 |
| **EC2** | t3.small | ~$10 |
| **RDS** | db.t3.micro | ~$15 |
| **CloudFront** | 100GB/month | ~$8.50 |
| **Route53** | 1 zone | ~$0.50 |
| **Total Estimate** | | **~$40-50/month** |

---

**Prêt pour le déploiement!** 🚀
