#!/bin/bash
# DEPLOYMENT AUTOMATION SCRIPT
# This script automates the deployment process to GitHub, AWS S3, and AWS EC2

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Dénonce Platform Deployment Script${NC}"
echo "========================================"

# Verify required tools
check_tools() {
  echo -e "${BLUE}📋 Checking required tools...${NC}"
  
  tools=("git" "npm" "aws" "node")
  for tool in "${tools[@]}"; do
    if ! command -v $tool &> /dev/null; then
      echo -e "${RED}❌ $tool is not installed${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ $tool installed${NC}"
  done
}

# Stage 1: GitHub Deployment
deploy_github() {
  echo -e "\n${BLUE}📦 Stage 1: GitHub Deployment${NC}"
  
  if [ ! -d ".git" ]; then
    echo -e "${BLUE}Initializing Git repository...${NC}"
    git init
    git config user.name "Denonce Deployer"
    git config user.email "deploy@denonce.app"
  fi
  
  echo -e "${BLUE}Adding files to staging...${NC}"
  git add .
  
  read -p "Enter commit message (default: 'Production deployment'): " COMMIT_MSG
  COMMIT_MSG=${COMMIT_MSG:-"Production deployment"}
  
  git commit -m "$COMMIT_MSG" || echo "No changes to commit"
  
  echo -e "${BLUE}Pushing to GitHub...${NC}"
  git push -u origin main || git push origin main
  
  echo -e "${GREEN}✅ GitHub deployment complete${NC}"
}

# Stage 2: Web (S3) Deployment
deploy_web() {
  echo -e "\n${BLUE}🌐 Stage 2: Web (S3) Deployment${NC}"
  
  # Check environment variables
  if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${RED}❌ AWS credentials not set${NC}"
    exit 1
  fi
  
  echo -e "${BLUE}Building web application...${NC}"
  cd web
  npm install
  npm run build
  
  echo -e "${BLUE}Uploading to S3...${NC}"
  S3_BUCKET="${S3_BUCKET:-denonce-web-prod}"
  
  # Backup current build
  aws s3 sync s3://$S3_BUCKET s3://$S3_BUCKET-backup-$(date +%s) || true
  
  # Upload new build
  aws s3 rm s3://$S3_BUCKET --recursive
  aws s3 sync dist s3://$S3_BUCKET \
    --delete \
    --cache-control "max-age=3600" \
    --exclude "index.html"
  
  # Upload index.html with no-cache
  aws s3 cp dist/index.html s3://$S3_BUCKET/ \
    --cache-control "no-cache, no-store, must-revalidate"
  
  echo -e "${GREEN}✅ Web deployment complete${NC}"
  cd ..
}

# Stage 3: Backend (EC2) Deployment
deploy_backend() {
  echo -e "\n${BLUE}⚙️  Stage 3: Backend (EC2) Deployment${NC}"
  
  read -p "Enter EC2 instance IP or hostname: " EC2_HOST
  read -p "Enter SSH key path (default: ~/.ssh/id_rsa): " SSH_KEY
  SSH_KEY=${SSH_KEY:-~/.ssh/id_rsa}
  
  if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found at $SSH_KEY${NC}"
    exit 1
  fi
  
  echo -e "${BLUE}Connecting to EC2 instance...${NC}"
  
  # Deploy script to run on EC2
  cat > /tmp/deploy-ec2.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting backend deployment..."
cd ~/denonce/backend

# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Build
npm run build

# Restart PM2
pm2 restart denonce-api

echo "Backend deployment complete!"
EOF
  
  # Transfer and execute
  scp -i "$SSH_KEY" /tmp/deploy-ec2.sh ec2-user@$EC2_HOST:/tmp/
  ssh -i "$SSH_KEY" ec2-user@$EC2_HOST "bash /tmp/deploy-ec2.sh"
  
  echo -e "${GREEN}✅ Backend deployment complete${NC}"
}

# Menu
show_menu() {
  echo -e "\n${BLUE}Select deployment stage:${NC}"
  echo "1) Check tools"
  echo "2) Deploy to GitHub"
  echo "3) Deploy web to S3"
  echo "4) Deploy backend to EC2"
  echo "5) Full deployment (all stages)"
  echo "6) Exit"
  
  read -p "Enter choice (1-6): " CHOICE
}

# Main loop
check_tools

while true; do
  show_menu
  
  case $CHOICE in
    1)
      check_tools
      ;;
    2)
      deploy_github
      ;;
    3)
      deploy_web
      ;;
    4)
      deploy_backend
      ;;
    5)
      deploy_github
      deploy_web
      deploy_backend
      echo -e "\n${GREEN}🎉 Full deployment complete!${NC}"
      ;;
    6)
      echo -e "${BLUE}Exiting...${NC}"
      exit 0
      ;;
    *)
      echo -e "${RED}Invalid choice${NC}"
      ;;
  esac
done
