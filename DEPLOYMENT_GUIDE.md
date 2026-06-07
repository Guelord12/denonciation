# Dénonciation Project - Deployment Guide

## Status Summary
- ✅ Backend: Password reset with email implemented
- ✅ Mobile: Rebranded to "Dénonce" 
- ✅ All platforms: D icon added to login/signup pages

## Remaining High-Priority Tasks

### 1. Live Stream Fixes (CRITICAL)
**Files:** 
- web/src/pages/LiveStreamDetail.tsx
- mobile/src/screens/LiveStreamScreen.tsx

**Issues:**
- Horizontal layout on mobile → needs vertical/responsive
- Chat send button not visible
- Camera/screen source switching error

**Solution approach:**
```typescript
// In LiveStreamDetail.tsx, add responsive wrapper:
<div className="grid grid-cols-1 lg:grid-cols-3">
  <div className="lg:col-span-2">/* Video Player */</div>
  <div className="lg:col-span-1">/* Chat Panel */</div>
</div>

// On mobile (col-1), arrange vertically
// On desktop (lg:col-3), arrange as 2:1 ratio
```

### 2. Mobile Profile Editing
**File:** mobile/src/screens/EditProfileScreen.tsx (may need creation)
**Reference:** web/src/pages/Profile.tsx
**Action:** Create mobile version of profile edit page

### 3. Translations System Enhancement
**Files:** 
- web/src/i18n/translations.ts
- mobile/src/i18n/index.ts

**Action:** Add language persistence to localStorage/AsyncStorage
```typescript
const saveLanguage = async (lang: string) => {
  localStorage.setItem('appLanguage', lang);
  i18n.changeLanguage(lang);
}
```

### 4. Admin Location Tracking
**File:** web/src/pages/admin/Logs.tsx
**Database:** Add location to activity_logs table

```sql
ALTER TABLE activity_logs ADD COLUMN latitude DECIMAL(10,8);
ALTER TABLE activity_logs ADD COLUMN longitude DECIMAL(11,8);
```

## Build & Deployment Commands

### Docker Build
```bash
# Backend
docker build -t denonce-backend backend/

# Web
docker build -t denonce-web web/

# Deploy to EC2
docker-compose up -d
```

### Mobile Build Commands
```bash
# Android APK (size reduction: disable dev tools)
eas build --platform android --profile production

# iOS IPA
eas build --platform ios --profile production

# Size optimization
# In app.json, ensure no dev dependencies are bundled
# Remove console.log statements for production
# Use ProGuard/R8 for Android
```

### Push to S3
```bash
aws s3 sync ./dist s3://denonce-app-bucket --delete
```

### GitHub Deployment
```bash
git add .
git commit -m "feat: Password reset, mobile rebranding, D icon"
git push origin main
```

## Environment Variables (Required)
```env
# Backend
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@denonce.app

# AWS
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# App
WEB_URL=https://denonce.app
SOCKET_URL=https://api.denonce.app
```

## Testing Checklist
- [ ] Login with new D icon displays
- [ ] Forgot password sends email with temp password
- [ ] Password reset works with temp password
- [ ] Mobile app renamed to "Dénonce"
- [ ] Live stream displays vertical on mobile
- [ ] Chat send button visible
- [ ] Camera/screen switching works
- [ ] Translations persist across app restart
- [ ] Admin logs show user locations
- [ ] APK size < 100 MB

## Release Timeline
1. Test on staging (3 hours)
2. Deploy backend to EC2 (30 mins)
3. Deploy web to S3 (15 mins)
4. Build & upload Android APK to GooglePlay (1-2 hours)
5. Build & upload iOS IPA to AppStore (1-2 hours)

## Notes
- Preserve all existing functionality
- Test on both Android and iOS
- Verify email service is working before releasing
- Set up monitoring for production errors
