# DEPLOYMENT GUIDE - Complete Instructions

## Overview
This guide covers deploying the Dénonce platform across all environments:
1. GitHub (source code repository)
2. AWS S3 (web frontend)
3. AWS EC2 (backend API)

## Prerequisites

### Required Credentials
```env
# GitHub
GITHUB_USERNAME=your-username
GITHUB_TOKEN=your-personal-access-token

# AWS
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-1 (or your preferred region)

# AWS Resources (pre-created)
- S3 bucket for web (e.g., denonce-web-prod)
- EC2 instance (t2.micro or t2.small)
- Security groups configured
```

### Tools Required
```bash
# Install globally
npm install -g aws-cli
npm install -g git

# Verify installations
aws --version
git --version
```

---

## STEP 1: GitHub Deployment

### 1.1 Initialize Git Repository

```bash
cd /path/to/denonciation
git init
git config user.name "Your Name"
git config user.email "your-email@example.com"
```

### 1.2 Create .gitignore

```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Production builds
build/
dist/
.next/
out/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*.DS_Store

# Testing
coverage/
.jest/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*

# Temporary
tmp/
temp/
*.tmp
EOF

git add .gitignore
```

### 1.3 Add All Files to Git

```bash
git add .
git status  # Verify all important files are included
```

### 1.4 Create Initial Commit

```bash
git commit -m "Initial commit: Dénonce whistleblowing platform with live streaming, reporting, and admin features"
```

### 1.5 Create Remote Repository on GitHub

```bash
# Option A: Via GitHub CLI (if installed)
gh repo create denonce --private --source=. --remote=origin --push

# Option B: Via GitHub Web Interface
# 1. Go to https://github.com/new
# 2. Create repository "denonce"
# 3. Keep it private
# 4. Run the commands shown:
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/denonce.git
git push -u origin main
```

### 1.6 Verify GitHub Upload

```bash
git remote -v
git push origin main --dry-run  # Test push
git push origin main  # Actual push
```

### 1.7 Create Environment-Specific Branches (Optional)

```bash
git checkout -b develop
git push -u origin develop

git checkout -b staging
git push -u origin staging
```

---

## STEP 2: AWS S3 Web Deployment

### 2.1 Prepare Environment Variables

**File: `web/.env.production`**
```env
VITE_API_URL=https://api.denonce.app  # Backend API
VITE_SOCKET_URL=https://api.denonce.app  # WebSocket URL
VITE_ENVIRONMENT=production
```

### 2.2 Build Web Application

```bash
cd web
npm install  # Install dependencies
npm run build  # Build for production
```

Expected output:
```
✓ 1,234 modules transformed
dist/
├── index.html
├── assets/
│   ├── index.js (main bundle)
│   ├── styles.css
│   └── vendor.js
```

### 2.3 Configure AWS S3 Bucket

```bash
# Set AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="eu-west-1"

# Create S3 bucket (if not exists)
aws s3 mb s3://denonce-web-prod --region eu-west-1

# Enable static website hosting
aws s3 website s3://denonce-web-prod \
  --index-document index.html \
  --error-document index.html

# Apply bucket policy for public access
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::denonce-web-prod/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket denonce-web-prod \
  --policy file://bucket-policy.json
```

### 2.4 Enable CloudFront (Optional but Recommended)

```bash
# CloudFront provides CDN, HTTPS, and caching benefits
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "denonce-web-'$(date +%s)'",
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "s3-denonce-web",
        "DomainName": "denonce-web-prod.s3.amazonaws.com",
        "S3OriginConfig": {}
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "s3-denonce-web",
      "ViewerProtocolPolicy": "redirect-to-https",
      "TrustedSigners": {
        "Enabled": false,
        "Quantity": 0
      },
      "MinTTL": 0,
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": {"Forward": "none"}
      }
    },
    "Enabled": true
  }'
```

### 2.5 Upload Web Build to S3

```bash
# Clear existing files
aws s3 rm s3://denonce-web-prod --recursive

# Upload new build
aws s3 sync web/dist s3://denonce-web-prod \
  --delete \
  --cache-control "max-age=3600" \
  --exclude "index.html" \
  --exclude "*.map"

# Upload index.html with no-cache
aws s3 cp web/dist/index.html s3://denonce-web-prod/ \
  --cache-control "no-cache, no-store, must-revalidate"

# Verify upload
aws s3 ls s3://denonce-web-prod --recursive
```

### 2.6 Test Web Deployment

```bash
# Get S3 website endpoint
aws s3 website s3://denonce-web-prod --query 'WebsiteConfiguration'

# Test direct S3 access (may not work due to CORS in development)
curl https://denonce-web-prod.s3.amazonaws.com/index.html

# If using CloudFront, test CloudFront URL
curl https://d1234567890.cloudfront.net
```

---

## STEP 3: AWS EC2 Backend Deployment

### 3.1 Prepare Backend Environment

**File: `backend/.env.production`**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@hostname:5432/denonciation_db
REDIS_URL=redis://hostname:6379
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@denonce.app

# AWS
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-1
CLOUDINARY_URL=cloudinary://...

# URLs
WEB_URL=https://denonce.app
SOCKET_URL=https://api.denonce.app
```

### 3.2 Build Backend

```bash
cd backend
npm install
npm run build  # TypeScript compilation to dist/
```

### 3.3 SSH into EC2 Instance

```bash
# Using SSH key
ssh -i ~/your-ec2-key.pem ec2-user@your-ec2-public-ip

# Example
ssh -i ~/denonce-key.pem ec2-user@54.123.45.67
```

### 3.4 Setup EC2 Instance

```bash
# Update system
sudo yum update -y
sudo yum install -y nodejs npm git postgresql docker

# Create app directory
mkdir -p /home/ec2-user/denonce
cd /home/ec2-user/denonce

# Clone from GitHub
git clone https://github.com/YOUR_USERNAME/denonce.git .
cd denonce/backend
```

### 3.5 Configure Database

```bash
# If using RDS
export DATABASE_URL="postgresql://admin:password@denonce-db.abc123.eu-west-1.rds.amazonaws.com:5432/denonciation_db"

# Run migrations
npx ts-node migrations/001_add_location_to_activity_logs.sql

# Verify connection
psql $DATABASE_URL -c "SELECT version();"
```

### 3.6 Setup PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 config file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'denonce-api',
    script: 'dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/denonce-error.log',
    out_file: '/var/log/denonce-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
sudo pm2 startup

# Verify
pm2 status
pm2 logs denonce-api
```

### 3.7 Configure Nginx Reverse Proxy

```bash
# Install Nginx
sudo amazon-linux-extras install -y nginx1

# Create Nginx config
sudo tee /etc/nginx/conf.d/denonce.conf << 'EOF'
upstream denonce_api {
  server 127.0.0.1:3000;
  server 127.0.0.1:3001;  # If running 2 instances
}

server {
  listen 80;
  server_name api.denonce.app;

  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.denonce.app;

  # SSL certificates (use Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/api.denonce.app/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.denonce.app/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;

  # Proxy settings
  location / {
    proxy_pass http://denonce_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_redirect off;
  }
}
EOF

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

### 3.8 Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo amazon-linux-extras install -y epel-release
sudo yum install -y certbot certbot-nginx

# Create certificate
sudo certbot certonly --standalone \
  -d api.denonce.app \
  -d denonce.app \
  --email admin@denonce.app \
  --agree-tos \
  --non-interactive

# Auto-renewal
sudo systemctl enable certbot-renew
sudo certbot renew --dry-run  # Test renewal
```

### 3.9 Deploy Backend Code

```bash
# Pull latest code
cd /home/ec2-user/denonce
git pull origin main

# Install dependencies
npm install --production

# Build
npm run build

# Restart PM2
pm2 restart denonce-api

# Verify
pm2 status
curl https://api.denonce.app/health
```

---

## STEP 4: Mobile App Distribution (Preview)

### 4.1 Android APK Build & GooglePlay

```bash
cd mobile

# Build APK (requires EAS CLI)
eas build --platform android

# Upload to GooglePlay Console:
# 1. Create signed APK/AAB
# 2. Upload to Google Play Console
# 3. Create release and publish
```

### 4.2 iOS Build & AppStore

```bash
# Build for iOS
eas build --platform ios

# Upload to TestFlight/AppStore:
# 1. Export from Xcode
# 2. Upload via Transporter
# 3. Submit for review
```

---

## STEP 5: Post-Deployment Verification

### 5.1 Health Checks

```bash
# Backend
curl https://api.denonce.app/health
curl -X POST https://api.denonce.app/auth/test

# Web
curl https://denonce.app
```

### 5.2 DNS Configuration

```bash
# Update DNS records (in your domain registrar)
API_CNAME: api.denonce.app → EC2-public-IP or ELB
WEB_CNAME: denonce.app → CloudFront distribution

# Verify DNS
nslookup denonce.app
nslookup api.denonce.app
```

### 5.3 Monitor Logs

```bash
# Backend logs (SSH into EC2)
ssh -i ~/denonce-key.pem ec2-user@your-ip
pm2 logs denonce-api
tail -f /var/log/nginx/access.log

# S3 access logs (if configured)
aws s3api get-bucket-logging --bucket denonce-web-prod
```

### 5.4 Setup Monitoring & Alerts

```bash
# CloudWatch monitoring
aws cloudwatch put-metric-alarm \
  --alarm-name denonce-ec2-cpu \
  --alarm-description "Alert when EC2 CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold

# CloudWatch logs
aws logs create-log-group --log-group-name /denonce/api
aws logs create-log-stream --log-group-name /denonce/api --log-stream-name backend
```

---

## Rollback Procedures

### Rollback Web (S3)

```bash
# Keep backup of previous build
aws s3 sync s3://denonce-web-prod s3://denonce-web-backup

# Restore from backup
aws s3 sync s3://denonce-web-backup s3://denonce-web-prod
```

### Rollback Backend (EC2)

```bash
# Via Git
cd /home/ec2-user/denonce
git revert HEAD
git push origin main

# Pull and restart
git pull
npm run build
pm2 restart denonce-api
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| S3 upload fails | Check AWS credentials, bucket permissions, region |
| EC2 connection timeout | Verify security group allows SSH (port 22) |
| SSL certificate errors | Verify domain ownership, check certificate expiry |
| Backend not responding | Check PM2 status, Nginx config, database connection |
| CORS errors on web | Verify SOCKET_URL environment variable |
| Socket.io connection fails | Check WebSocket port (443 for WSS) is open |

---

## Maintenance Checklist

- [ ] Daily: Monitor logs and error rates
- [ ] Weekly: Review analytics and performance metrics
- [ ] Monthly: Update security patches and dependencies
- [ ] Quarterly: Review architecture and optimize
- [ ] Yearly: Disaster recovery drill

---

## Next Steps

1. Configure automated backups (RDS, S3)
2. Setup CI/CD pipeline (GitHub Actions)
3. Implement monitoring and alerting
4. Plan disaster recovery procedures
5. Document runbooks for common issues

