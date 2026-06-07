# Location Tracking Implementation Guide

## Overview

This document describes the implementation of user location tracking for the Dénonce platform's administrative activity logging system.

## Components Implemented

### 1. Geolocation Service (`backend/src/services/geolocation.service.ts`)

**Purpose**: Retrieves approximate geographic location from user IP addresses

**Key Features**:
- Uses ip-api.com public API (free tier, no authentication required)
- Returns: `{ latitude, longitude, city, country }`
- Skips private/local IPs (127.0.0.1, 192.168.x.x, 10.x.x.x, ::1)
- Includes fallback/error handling
- 5-second timeout to prevent hanging requests

**Usage**:
```typescript
import { getLocationFromIP } from '../services/geolocation.service';

const location = await getLocationFromIP(userIpAddress);
if (location) {
  console.log(`User at ${location.latitude}, ${location.longitude}`);
}
```

### 2. Activity Log Service (`backend/src/services/activityLog.service.ts`)

**Purpose**: Centralized service for logging user activities with automatic location retrieval

**Key Functions**:
- `logUserActivity()`: Records activity with location data
- `getActivityLogsWithLocation()`: Retrieves logs with pagination and filtering

**Features**:
- Automatic IP extraction from request headers
- Automatic location lookup
- Graceful error handling (logging doesn't break main operations)
- Support for filtering by userId and action

### 3. Database Migration

**File**: `backend/migrations/001_add_location_to_activity_logs.sql`

**Changes**:
```sql
ALTER TABLE activity_logs 
ADD COLUMN latitude DECIMAL(10,8),
ADD COLUMN longitude DECIMAL(11,8);

CREATE INDEX idx_activity_location ON activity_logs(latitude, longitude);
```

**Columns Added**:
- `latitude`: DECIMAL(10,8) - Latitude coordinate (up to 8 decimal places)
- `longitude`: DECIMAL(11,8) - Longitude coordinate (up to 8 decimal places)
- Index created for efficient location-based queries

### 4. Updated Controllers

All activity logging functions have been updated to include location tracking:

#### `backend/src/controllers/auth.controller.ts`
- `logActivity()` - Enhanced to retrieve and store location data
- Tracks: LOGIN, LOGOUT, REGISTER, CHANGE_PASSWORD, password reset requests

#### `backend/src/controllers/comment.controller.ts`
- `logActivity()` - Enhanced with geolocation
- Tracks: CREATE_COMMENT, UPDATE_COMMENT, DELETE_COMMENT

#### `backend/src/controllers/report.controller.ts`
- `logActivity()` - Enhanced with geolocation
- Tracks: CREATE_REPORT, UPDATE_REPORT, DELETE_REPORT

#### `backend/src/controllers/live.controller.ts`
- `logActivity()` - Enhanced with geolocation and metadata preservation
- Tracks: CREATE_STREAM, END_STREAM, UPDATE_STREAM, SUBSCRIBE_STREAM

#### `backend/src/controllers/user.controller.ts`
- `logActivity()` - Enhanced with geolocation
- Tracks: UPDATE_PROFILE, UPDATE_AVATAR, CHANGE_PASSWORD, UPDATE_EMAIL, UPDATE_USERNAME, DELETE_ACCOUNT, BAN_USER, UNBAN_USER

### 5. Frontend Display

**File**: `web/src/pages/admin/Logs.tsx`

**Updates**:
- Added `MapPin` icon import from lucide-react
- Added "Localisation" column to admin logs table
- Displays latitude/longitude with:
  - MapPin icon indicator
  - Clickable Google Maps link
  - Formatted to 4 decimal places for readability
  - Fallback to "-" if location unavailable

**Column Example**:
```
📍 -4.3276, 15.3136 [clickable Google Maps link]
```

## Data Flow

```
User Request
    ↓
Extract IP Address from Headers/Socket
    ↓
Log Activity with IP
    ↓
Async: Get Location from IP-API
    ↓
Store Location (latitude, longitude) in Database
    ↓
Display in Admin Logs Table with Google Maps Link
```

## Performance Considerations

### IP Geolocation
- **Async Operation**: Location lookup is non-blocking (uses async/await)
- **Timeout**: 5-second timeout prevents hanging requests
- **Error Handling**: Graceful degradation - logs continue even if API fails
- **Caching Potential**: Future optimization could cache locations

### Database
- **Index**: `idx_activity_location` added for location-based queries
- **Column Types**: DECIMAL(10,8) and DECIMAL(11,8) are precise and efficient
- **Storage**: ~8 bytes per coordinate pair

## Privacy Considerations

### User Privacy
- Location is approximate (city/country level from IP)
- Not GPS-precise (no real-time tracking)
- Only available to administrators
- Serves security/audit purposes

### Data Retention
- Existing retention policies apply
- Location data subject to same deletion schedules as activity logs
- Can be anonymized via database policies if needed

## Testing the Implementation

### Manual Testing

1. **Check Database Migration**:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activity_logs' 
ORDER BY ordinal_position;
```

2. **Perform User Actions**:
   - Login/Register
   - Create a report
   - Create a comment
   - Create/end a live stream
   - Update profile

3. **Check Logs in Admin Panel**:
   - Navigate to Admin Dashboard → Logs
   - Verify "Localisation" column displays coordinates
   - Click on coordinates to verify Google Maps link works

### Sample Log Query
```sql
SELECT 
  id,
  action,
  username,
  ip_address,
  latitude,
  longitude,
  created_at
FROM activity_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE latitude IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

## Future Enhancements

1. **Location Caching**: Cache IP→Location mappings to reduce API calls
2. **Geofencing**: Alert admins of suspicious geographic patterns
3. **VPN Detection**: Detect and flag VPN/proxy IPs
4. **Maps Visualization**: Add map view of user activities
5. **Heatmaps**: Show activity density by geographic region
6. **Custom Geolocation Service**: Implement internal geolocation database instead of external API

## Troubleshooting

### No Coordinates Displayed

**Possible Causes**:
1. Database migration not run
2. API timeout (check logs for warnings)
3. Private/local IP address
4. Network connectivity issue to ip-api.com

**Solution**:
```bash
# Manually run migration
psql -U postgres -d denonciation_db -f backend/migrations/001_add_location_to_activity_logs.sql

# Check logs for errors
tail -f backend/logs/app.log | grep -i "geolocation\|location"
```

### Slow Admin Logs Loading

**Possible Cause**: Location lookups blocking requests (should not happen with async)

**Solution**: 
- Verify async/await implementation in controllers
- Check API response times
- Consider implementing caching

## Files Modified

1. ✅ `backend/migrations/001_add_location_to_activity_logs.sql` - Created
2. ✅ `backend/src/services/geolocation.service.ts` - Created
3. ✅ `backend/src/services/activityLog.service.ts` - Created
4. ✅ `backend/src/controllers/auth.controller.ts` - Updated
5. ✅ `backend/src/controllers/comment.controller.ts` - Updated
6. ✅ `backend/src/controllers/report.controller.ts` - Updated
7. ✅ `backend/src/controllers/live.controller.ts` - Updated
8. ✅ `backend/src/controllers/user.controller.ts` - Updated
9. ✅ `web/src/pages/admin/Logs.tsx` - Updated

## Configuration

No additional configuration required. The implementation uses:
- **IP-API**: Free tier (ip-api.com)
- **Rate Limits**: 45 requests/minute per IP
- **Accuracy**: City/Country level (±25km)

## References

- [IP-API Documentation](http://ip-api.com/docs/)
- [PostgreSQL DECIMAL Type](https://www.postgresql.org/docs/current/datatype-numeric.html)
- [WGS84 Coordinate System](https://en.wikipedia.org/wiki/World_Geodetic_System)
