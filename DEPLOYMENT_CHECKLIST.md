# DEPLOYMENT CHECKLIST

## Pre-Deployment (24 hours before)

### Code Quality & Testing
- [ ] All console.log statements removed for production
- [ ] No sensitive data in code (API keys, passwords, tokens)
- [ ] Environment variables properly configured
- [ ] Error handling implemented throughout
- [ ] All dependencies up-to-date (npm audit clean)
- [ ] TypeScript compilation successful (no errors)
- [ ] All tests passing (if applicable)

### Security
- [ ] SSL/TLS certificates ready (Let's Encrypt)
- [ ] Database credentials stored securely (not in code)
- [ ] API keys rotated and secured
- [ ] CORS policies configured correctly
- [ ] Security headers added to responses
- [ ] Authentication/authorization working
- [ ] Rate limiting implemented

### Code Repository
- [ ] `.gitignore` configured (node_modules, .env, etc.)
- [ ] Code committed to GitHub
- [ ] No large binary files tracked
- [ ] Meaningful commit messages
- [ ] README.md up-to-date
- [ ] CHANGELOG.md documented

---

## GitHub Deployment Checklist

- [ ] GitHub repository created and initialized
- [ ] Remote origin added (`git remote -v`)
- [ ] SSH/HTTPS authentication working
- [ ] All code pushed to main branch
- [ ] Branches created (develop, staging, main)
- [ ] Repository visibility set to private
- [ ] Collaborators added (if needed)
- [ ] Branch protection rules configured

**Verification Command:**
```bash
git remote -v
git log --oneline | head -5
git branch -a
```

---

## AWS Credentials & Setup

- [ ] AWS Account created
- [ ] IAM user created for deployment
- [ ] Access keys generated and saved securely
- [ ] IAM policies attached:
  - [ ] AmazonS3FullAccess
  - [ ] AmazonEC2FullAccess
  - [ ] AmazonRDSFullAccess
  - [ ] CloudFrontFullAccess
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS credentials configured (`aws configure`)
- [ ] AWS region set (eu-west-1 recommended)

**Verification Command:**
```bash
aws sts get-caller-identity
aws s3 ls
```

---

## S3 Web Deployment Checklist

### Pre-Deployment
- [ ] Web app builds successfully (`npm run build`)
- [ ] Build output in `dist/` directory
- [ ] Environment variables in `.env.production`
- [ ] API endpoints point to correct backend
- [ ] Socket.io URL configured
- [ ] Images and assets optimized
- [ ] No broken links in build

### S3 Configuration
- [ ] S3 bucket created (`denonce-web-prod`)
- [ ] Bucket versioning enabled (for rollback)
- [ ] Static website hosting enabled
- [ ] Bucket policy allows public access
- [ ] CORS configuration added
- [ ] Logging enabled (optional)
- [ ] Server-side encryption enabled

### Upload
- [ ] Old files backed up to `denonce-web-backup`
- [ ] Build files uploaded to S3
- [ ] `index.html` uploaded with no-cache header
- [ ] Static assets uploaded with long cache TTL
- [ ] File permissions verified (public-read)
- [ ] File sizes reasonable (< 5MB total)

### Post-Upload
- [ ] Website accessible via S3 endpoint
- [ ] CloudFront cache invalidated (if applicable)
- [ ] HTTPS working (CloudFront or certificate)
- [ ] All assets loading correctly
- [ ] No CORS errors
- [ ] Performance acceptable (< 3s load time)

**Verification Commands:**
```bash
aws s3 ls s3://denonce-web-prod --recursive
aws s3 website s3://denonce-web-prod --query 'WebsiteConfiguration'
curl https://denonce.s3.amazonaws.com/index.html
```

---

## EC2 Backend Deployment Checklist

### EC2 Instance Setup
- [ ] EC2 instance created (t2.micro or t2.small)
- [ ] Security group configured:
  - [ ] Port 22 (SSH) - restricted to your IP
  - [ ] Port 80 (HTTP) - open to 0.0.0.0
  - [ ] Port 443 (HTTPS) - open to 0.0.0.0
  - [ ] Port 3000 (Node) - only from localhost
- [ ] Instance started and running
- [ ] Elastic IP assigned (static public IP)
- [ ] SSH key pair downloaded and secured
- [ ] SSH access verified

### System Setup
- [ ] System packages updated (`sudo yum update -y`)
- [ ] Node.js installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed (`git --version`)
- [ ] PM2 installed globally (`pm2 --version`)
- [ ] PostgreSQL client installed (for DB connection)
- [ ] Docker installed (if using containers)
- [ ] Nginx installed (if using reverse proxy)

### Database
- [ ] PostgreSQL database created (RDS or local)
- [ ] Database credentials stored in `.env`
- [ ] Connection test successful (`psql ...`)
- [ ] Initial schema applied (migrations run)
- [ ] Backup enabled (if RDS)
- [ ] Read replicas configured (if needed)

### Backend Code
- [ ] Code cloned from GitHub
- [ ] Environment variables configured (`.env.production`)
- [ ] Dependencies installed (`npm install --production`)
- [ ] Build successful (`npm run build`)
- [ ] Tests passing (if applicable)
- [ ] Production secrets configured

### Process Management
- [ ] PM2 ecosystem.config.js created
- [ ] PM2 app started (`pm2 start ecosystem.config.js`)
- [ ] PM2 saves on reboot (`pm2 save`)
- [ ] PM2 startup enabled (`pm2 startup`)
- [ ] Process monitoring working (`pm2 status`)
- [ ] Logs accessible (`pm2 logs`)

### Web Server (Nginx)
- [ ] Nginx installed and running
- [ ] Nginx config file created
- [ ] Upstream proxy configured (3000, 3001)
- [ ] HTTP → HTTPS redirect configured
- [ ] SSL certificate installed
- [ ] Security headers added
- [ ] Nginx syntax valid (`sudo nginx -t`)
- [ ] Nginx started (`sudo systemctl start nginx`)

### SSL/TLS Certificate
- [ ] Domain(s) configured in DNS
- [ ] Let's Encrypt certificate obtained
- [ ] Certificate placed in correct location
- [ ] Certificate auto-renewal configured
- [ ] HTTPS working (`curl https://api.denonce.app`)
- [ ] Certificate valid for 90+ days (`openssl s_client...`)

### Backend Verification
- [ ] API responding (`curl https://api.denonce.app/health`)
- [ ] Database connected (check logs)
- [ ] Redis connected (if applicable)
- [ ] WebSocket working (check browser console)
- [ ] CORS enabled for frontend domain
- [ ] Environment variables loaded correctly
- [ ] Error handling working (test with invalid request)

**Verification Commands:**
```bash
pm2 status
pm2 logs denonce-api | head -50
curl -I https://api.denonce.app
sudo nginx -t
sudo systemctl status nginx
```

---

## Domain & DNS Checklist

- [ ] Domain name purchased
- [ ] DNS provider configured
- [ ] A record created for main domain (denonce.app → EC2 IP)
- [ ] CNAME record for API (api.denonce.app → API hostname/IP)
- [ ] CNAME record for web (web.denonce.app → CloudFront if applicable)
- [ ] DNS propagation verified (24-48 hours)
- [ ] SSL certificate issued for all domains
- [ ] Subdomains tested

**Verification Commands:**
```bash
nslookup denonce.app
dig denonce.app
dig +short denonce.app
```

---

## Frontend Testing Checklist

- [ ] Web app loads without errors
- [ ] All pages accessible
- [ ] Navigation working
- [ ] Login/Register functional
- [ ] Live streaming playable
- [ ] Chat messaging works
- [ ] File uploads successful
- [ ] Forms submit correctly
- [ ] Error messages displayed
- [ ] Responsive design working (mobile/tablet)
- [ ] Images loading
- [ ] Videos loading (HLS, WebRTC)
- [ ] Console clean (no JavaScript errors)
- [ ] Network requests successful (check DevTools)

---

## Backend Testing Checklist

- [ ] API endpoints responding
- [ ] Database queries working
- [ ] WebSocket connections established
- [ ] Authentication tokens valid
- [ ] Error responses formatted correctly
- [ ] Input validation working
- [ ] File uploads to storage
- [ ] Email sending working
- [ ] Rate limiting functioning
- [ ] Logs being written
- [ ] Performance metrics acceptable

**API Test:**
```bash
# Test health endpoint
curl https://api.denonce.app/health

# Test authentication
curl -X POST https://api.denonce.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## Mobile App Deployment Checklist (Preview)

- [ ] Android APK built
- [ ] iOS app archived
- [ ] App icons configured
- [ ] App version bumped
- [ ] Build optimized for size
- [ ] Signing certificates configured
- [ ] Google Play Console account ready
- [ ] Apple Developer account ready
- [ ] Privacy policy ready
- [ ] App store descriptions written
- [ ] Screenshots prepared
- [ ] Testing on real devices

---

## Monitoring & Alerting

- [ ] CloudWatch metrics enabled
- [ ] Error rate monitoring
- [ ] Performance monitoring
- [ ] Disk space monitoring
- [ ] Database connection monitoring
- [ ] SSL certificate expiry alerts
- [ ] Uptime monitoring configured
- [ ] Log aggregation setup
- [ ] Backup verification

---

## Post-Deployment (First 24 hours)

- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify all features working
- [ ] Test user workflows end-to-end
- [ ] Monitor resource usage (CPU, memory, disk)
- [ ] Check database performance
- [ ] Verify backup completion
- [ ] Monitor API response times
- [ ] Check CloudFront cache effectiveness
- [ ] User feedback collection

---

## Documentation

- [ ] Deployment guide completed (DEPLOYMENT_GUIDE_COMPLETE.md)
- [ ] README.md updated
- [ ] Architecture documentation
- [ ] API documentation
- [ ] Database schema documented
- [ ] Environment variables documented
- [ ] Troubleshooting guide created
- [ ] Runbook for common issues

---

## Rollback Plan

- [ ] S3 backup of previous build
- [ ] Git tags for releases
- [ ] Database backup recent
- [ ] Rollback procedure documented
- [ ] Tested rollback procedure
- [ ] Communication plan if issues

---

## Sign-Off

**Deployment Date:** _______________
**Deployed By:** _______________
**Verified By:** _______________
**Issues Found:** None / Document below

```
1. 
2. 
3. 
```

**Notes:**

---

## Next Steps

1. Monitor production for 24-48 hours
2. Gather user feedback
3. Optimize based on metrics
4. Plan next release
5. Update documentation with learnings

---

**Status: Ready for Deployment ✅** if all items are checked.
