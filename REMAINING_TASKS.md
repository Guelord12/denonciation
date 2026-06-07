# REMAINING TASKS - Detailed Instructions

## PRIORITY 1: Fix Live Stream Layout (HIGH IMPACT)

### Task 1a: Make Live Stream Vertical on Mobile
**File:** web/src/pages/LiveStreamDetail.tsx (lines 358-400)
**Change:** Replace flex layout with responsive grid

```typescript
// BEFORE:
<div className="fixed inset-0 bg-black flex">
  <div className="flex-1 relative">
    {/* Video */}
  </div>
  <div className="w-96 bg-gray-900 border-l"> 
    {/* Chat */}
  </div>
</div>

// AFTER:
<div className="fixed inset-0 bg-black flex flex-col lg:flex-row">
  <div className="flex-1 relative lg:flex-1">
    {/* Video - takes full height on mobile, shares space on desktop */}
  </div>
  <div className="h-64 lg:h-auto lg:w-96 bg-gray-900 lg:border-l border-t lg:border-t-0">
    {/* Chat - fixed height on mobile, full height on desktop */}
  </div>
</div>
```

### Task 1b: Make Chat Send Button Visible
**File:** web/src/components/live/LiveChat.tsx (lines 85-105)
**Issue:** Form might be cut off or hidden
**Solution:** Ensure form is in viewport and properly padded

```typescript
// Add CSS to ensure form is visible:
className="p-4 border-t border-gray-800 sticky bottom-0 z-50"
```

### Task 1c: Fix Camera/Screen Switching Error
**File:** web/src/pages/LiveStreamDetail.tsx (lines 200-250)
**Issue:** startBroadcasting('screen') fails
**Solution:** Add error handling

```typescript
const startBroadcasting = async (sourceType: 'camera' | 'screen') => {
  try {
    let mediaStream: MediaStream;
    
    if (sourceType === 'screen') {
      try {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true
        });
      } catch (screenError) {
        if (screenError.name === 'NotAllowedError') {
          toast.error('Permission de partage d\'écran refusée');
          return;
        }
        throw screenError;
      }
    } else {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
    }
    
    // ... rest of code
  } catch (error) {
    console.error('Broadcast error:', error);
    toast.error('Erreur: ' + error.message);
  }
};
```

---

## PRIORITY 2: Mobile Profile Editing

### Task 2: Create/Update Mobile Profile Edit
**File:** mobile/src/screens/EditProfileScreen.tsx (create if missing)
**Reference:** mobile/src/screens/SettingsScreen.tsx

```typescript
// Copy structure from web Profile.tsx
// Main sections:
// 1. Profile picture upload
// 2. Basic info (first_name, last_name, username)
// 3. Contact (phone, email)
// 4. Location (country, city, nationality)
// 5. Save button with loading state
```

### Navigation Update
**File:** mobile/src/navigation/MainTabNavigator.tsx
Add route:
```typescript
<Stack.Screen name="EditProfile" component={EditProfileScreen} />
```

---

## PRIORITY 3: Translations System

### Task 3a: Add Language Persistence
**File:** web/src/i18n/translations.ts

```typescript
// Add at initialization:
const savedLang = localStorage.getItem('appLanguage') || 'fr';
i18n.changeLanguage(savedLang);

// On language change:
const handleLanguageChange = (lang: string) => {
  localStorage.setItem('appLanguage', lang);
  i18n.changeLanguage(lang);
};
```

### Task 3b: Mobile i18n Update
**File:** mobile/src/i18n/index.ts

```typescript
// Initialize with saved language:
const initializeI18n = async () => {
  const savedLang = await AsyncStorage.getItem('appLanguage');
  const deviceLanguage = Localization.locale.split('-')[0];
  const defaultLang = savedLang || deviceLanguage || 'fr';
  
  await i18n.changeLanguage(defaultLang);
};

// Save on change:
const saveLanguage = async (lang: string) => {
  await AsyncStorage.setItem('appLanguage', lang);
};
```

---

## ✅ PRIORITY 4: Admin User Location Tracking [COMPLETED]

### Task 4a: Database Update ✅
```sql
-- Add location columns to activity_logs
ALTER TABLE activity_logs 
ADD COLUMN latitude DECIMAL(10,8),
ADD COLUMN longitude DECIMAL(11,8);

-- Create index for faster queries
CREATE INDEX idx_activity_location ON activity_logs(latitude, longitude);
```
**Status**: Migration file created at `backend/migrations/001_add_location_to_activity_logs.sql`

### Task 4b: Backend Update ✅
**Files Updated**:
- ✅ `backend/src/controllers/auth.controller.ts` - Enhanced logActivity with geolocation
- ✅ `backend/src/controllers/comment.controller.ts` - Enhanced logActivity with geolocation
- ✅ `backend/src/controllers/report.controller.ts` - Enhanced logActivity with geolocation
- ✅ `backend/src/controllers/live.controller.ts` - Enhanced logActivity with geolocation and metadata
- ✅ `backend/src/controllers/user.controller.ts` - Enhanced logActivity with geolocation

**New Services Created**:
- ✅ `backend/src/services/geolocation.service.ts` - IP geolocation lookup via ip-api.com
- ✅ `backend/src/services/activityLog.service.ts` - Centralized activity logging with location

**Implementation Details**:
```typescript
// All logActivity functions now:
1. Extract IP address from request headers
2. Automatically lookup location using getLocationFromIP()
3. Store latitude/longitude in database
4. Include error handling (non-breaking if API fails)
5. Support async/await for performance
```

### Task 4c: Admin Logs Display ✅
**File**: `web/src/pages/admin/Logs.tsx`
**Changes**:
- Added `MapPin` icon from lucide-react
- Added "Localisation" column to activity logs table
- Displays coordinates formatted to 4 decimal places
- Includes clickable Google Maps link for each location
- Fallback to "-" if location unavailable

**Example Display**:
```
📍 -4.3276, 15.3136 [link to Google Maps]
```

---

## OPTIMIZATION TASKS

### Task 5a: Reduce APK Size
1. Remove console.log from production
2. Disable source maps in production build
3. Use ProGuard/R8 for Android
4. Tree-shake unused dependencies

### Task 5b: Clean Up Live Scripts
Remove unused files from live streaming modules.

---

## DEPLOYMENT STEPS

### Step 1: Test Locally
```bash
npm test
npm run build
```

### Step 2: Git Commit
```bash
git add .
git commit -m "feat: live fixes, mobile profile edit, translations, user location tracking"
git push origin main
```

### Step 3: Build & Deploy
```bash
# Backend
docker build -t denonce-backend:v2.0 backend/
docker push your-registry/denonce-backend:v2.0

# Web
npm run build
aws s3 sync dist/ s3://denonce-web-bucket/

# Mobile
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

## CHECKLIST BEFORE RELEASE

- [ ] All TypeScript errors resolved
- [ ] No console errors in browser dev tools
- [ ] Live stream responsive on all screen sizes
- [ ] Chat button always visible and clickable
- [ ] Camera/screen switching works without errors
- [ ] Password reset email delivers correctly
- [ ] Mobile app shows "Dénonce" in all places
- [ ] D icon visible on login/signup pages
- [ ] Translations persist after app restart
- [ ] Admin can see user locations in activity logs
- [ ] APK size < 100 MB
- [ ] All forms submit successfully
- [ ] No memory leaks in long-running streams

---

## Contact & Support
For issues during implementation:
1. Check backend logs: `docker logs denonce-backend`
2. Check client errors: Browser DevTools
3. Verify environment variables are set
4. Test on staging before production
