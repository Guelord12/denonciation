# Location Tracking - Testing Guide

## Pre-Testing Checklist

- [ ] Database migration executed
- [ ] Backend services compiled without errors
- [ ] Frontend assets built
- [ ] Admin logs page accessible

## Test Scenarios

### Scenario 1: Database Verification

**Objective**: Ensure location columns exist in activity_logs table

**Steps**:
1. Connect to PostgreSQL database:
   ```bash
   psql -U postgres -d denonciation_db
   ```

2. Verify columns:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'activity_logs' 
   ORDER BY ordinal_position;
   ```

3. Verify index:
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'activity_logs';
   ```

**Expected Results**:
- ✅ `latitude` column exists (DECIMAL(10,8))
- ✅ `longitude` column exists (DECIMAL(11,8))
- ✅ `idx_activity_location` index created

**Pass/Fail**: ___________

---

### Scenario 2: User Registration with Location Logging

**Objective**: Verify location is captured during user registration

**Steps**:
1. Navigate to Registration page
2. Fill in registration form:
   - Username: `testuser_location_$(date +%s)`
   - Email: `testuser_$(date +%s)@test.com`
   - Password: `Test@1234`
   - Other required fields
3. Click "Register"
4. Check database for new activity log entry

**Database Check**:
```sql
SELECT al.id, al.user_id, al.action, al.ip_address, 
       al.latitude, al.longitude, al.created_at
FROM activity_logs al
WHERE al.action = 'REGISTER'
ORDER BY al.created_at DESC LIMIT 1;
```

**Expected Results**:
- ✅ New activity log created
- ✅ `latitude` is NOT NULL
- ✅ `longitude` is NOT NULL
- ✅ `ip_address` captured
- ✅ Coordinates reasonable (not 0,0)

**Pass/Fail**: ___________

---

### Scenario 3: Login Activity Logging

**Objective**: Verify location is captured during login

**Steps**:
1. Navigate to Login page
2. Login with test credentials
3. Check database for login activity

**Database Check**:
```sql
SELECT al.id, al.user_id, al.action, al.ip_address, 
       al.latitude, al.longitude, al.created_at
FROM activity_logs al
WHERE al.action = 'LOGIN'
ORDER BY al.created_at DESC LIMIT 1;
```

**Expected Results**:
- ✅ Activity log created with action='LOGIN'
- ✅ Location data populated (latitude/longitude NOT NULL)
- ✅ Same coordinates as registration (same IP)

**Pass/Fail**: ___________

---

### Scenario 4: Report Creation with Location

**Objective**: Verify location tracked for report creation

**Steps**:
1. Login as authenticated user
2. Create a new report:
   - Title: "Test Report for Location Tracking"
   - Description: "Location should be captured"
   - Category: Any
   - City: Any
3. Submit report
4. Check database

**Database Check**:
```sql
SELECT al.id, al.user_id, al.action, al.latitude, al.longitude
FROM activity_logs al
WHERE al.action = 'CREATE_REPORT'
ORDER BY al.created_at DESC LIMIT 1;
```

**Expected Results**:
- ✅ Activity logged with action='CREATE_REPORT'
- ✅ Location data present

**Pass/Fail**: ___________

---

### Scenario 5: Comment Creation with Location

**Objective**: Verify location tracked for comments

**Steps**:
1. Navigate to a report
2. Add a comment: "Testing location tracking"
3. Submit comment
4. Check database

**Database Check**:
```sql
SELECT al.id, al.user_id, al.action, al.latitude, al.longitude
FROM activity_logs al
WHERE al.action = 'CREATE_COMMENT'
ORDER BY al.created_at DESC LIMIT 1;
```

**Expected Results**:
- ✅ Activity logged with action='CREATE_COMMENT'
- ✅ Location data present

**Pass/Fail**: ___________

---

### Scenario 6: Admin Logs Display

**Objective**: Verify location displayed correctly in admin panel

**Steps**:
1. Login as admin user
2. Navigate to Admin Dashboard → Logs
3. Verify table displays location column
4. Check specific recent activities

**Visual Verification**:
- ✅ "Localisation" column visible
- ✅ Coordinates displayed in format: `-4.3276, 15.3136`
- ✅ MapPin icon visible next to coordinates
- ✅ Clicking coordinates opens Google Maps
- ✅ Activities without location show "-"

**Expected Display Example**:
```
Activity: LOGIN
User: testuser
IP: 192.168.1.100
Localisation: 📍 -4.3276, 15.3136 [Google Maps link]
```

**Pass/Fail**: ___________

---

### Scenario 7: Google Maps Integration

**Objective**: Verify location links work correctly

**Steps**:
1. In Admin Logs, find entry with location data
2. Click on the coordinate link
3. Verify Google Maps opens in new tab with correct location

**Expected Results**:
- ✅ Google Maps URL format: `https://www.google.com/maps?q=LATITUDE,LONGITUDE`
- ✅ Map shows correct location
- ✅ Coordinates match database values

**Pass/Fail**: ___________

---

### Scenario 8: Live Stream Activity Logging

**Objective**: Verify location tracked for live stream activities

**Steps**:
1. Create a live stream
2. End the live stream
3. Check database for location

**Database Check**:
```sql
SELECT al.id, al.user_id, al.action, al.latitude, al.longitude
FROM activity_logs al
WHERE al.action IN ('CREATE_STREAM', 'END_STREAM')
ORDER BY al.created_at DESC LIMIT 2;
```

**Expected Results**:
- ✅ Both CREATE_STREAM and END_STREAM logged
- ✅ Location data present for both

**Pass/Fail**: ___________

---

### Scenario 9: Profile Update Location Tracking

**Objective**: Verify location tracked for profile updates

**Steps**:
1. Navigate to profile settings
2. Update profile information (e.g., phone, city)
3. Save changes
4. Check database

**Database Check**:
```sql
SELECT al.id, al.user_id, al.action, al.latitude, al.longitude
FROM activity_logs al
WHERE al.action = 'UPDATE_PROFILE'
ORDER BY al.created_at DESC LIMIT 1;
```

**Expected Results**:
- ✅ Activity logged with action='UPDATE_PROFILE'
- ✅ Location data present

**Pass/Fail**: ___________

---

### Scenario 10: Error Handling - Private IP

**Objective**: Verify system handles private IPs gracefully

**Test Case**: Connecting from localhost/private network

**Expected Results**:
- ✅ Activity still logged
- ✅ Latitude/longitude = NULL (not geolocation)
- ✅ No errors in logs
- ✅ Activity log still displays "-" for location

**Pass/Fail**: ___________

---

## Performance Tests

### Test 1: Admin Logs Load Time

**Objective**: Verify admin logs load within reasonable time

**Steps**:
1. Open browser DevTools → Network tab
2. Navigate to Admin Logs
3. Measure page load time

**Expected Result**: < 2 seconds for initial load

**Actual Result**: __________ seconds

**Pass/Fail**: ___________

---

### Test 2: Activity Logging Performance

**Objective**: Verify activity logging doesn't slow down operations

**Steps**:
1. Create 10 reports rapidly
2. Measure time taken
3. Verify all logged with locations

**Expected Result**: No noticeable delay, all entries logged

**Pass/Fail**: ___________

---

## Database Tests

### Test 1: Location Index Performance

**Objective**: Verify location index improves query performance

**Steps**:
1. Execute query with location filter:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM activity_logs 
   WHERE latitude IS NOT NULL 
   LIMIT 100;
   ```

2. Verify index is used (should show "Index Scan")

**Expected Result**: Index Scan on idx_activity_location

**Pass/Fail**: ___________

---

### Test 2: Data Integrity

**Objective**: Verify location data is valid

**Steps**:
```sql
-- Check for invalid coordinates
SELECT COUNT(*) as invalid_count
FROM activity_logs
WHERE (latitude IS NOT NULL AND (latitude < -90 OR latitude > 90))
   OR (longitude IS NOT NULL AND (longitude < -180 OR longitude > 180));
```

**Expected Result**: 0 invalid records

**Pass/Fail**: ___________

---

## Integration Tests

### Test 1: Multi-User Activity Tracking

**Objective**: Verify multiple users tracked with different IPs

**Steps**:
1. Have 3+ users perform actions simultaneously
2. Check admin logs for all activities
3. Verify each has location data

**Expected Result**: All activities logged with locations

**Pass/Fail**: ___________

---

### Test 2: Activity Filtering

**Objective**: Verify filtering works with location data

**Steps**:
1. Admin Logs → Filter by action: "LOGIN"
2. Verify only LOGIN entries displayed
3. Check all have location data
4. Try other action filters

**Expected Result**: Filters work, location data preserved

**Pass/Fail**: ___________

---

## Edge Cases

### Test 1: API Timeout Handling

**Objective**: Verify system handles IP-API timeout

**Test Case**: Disable internet / Mock timeout
**Expected Result**: Activity still logged (latitude/longitude = NULL)

**Pass/Fail**: ___________

---

### Test 2: Null/Invalid Location Data

**Objective**: Verify system handles missing location gracefully

**Test Case**: API returns error
**Expected Result**: 
- ✅ Activity logged successfully
- ✅ Location fields NULL
- ✅ Admin display shows "-"

**Pass/Fail**: ___________

---

## Summary Report

| Test Category | Passed | Failed | Notes |
|---|---|---|---|
| Database Setup | _ | _ | |
| User Actions | _ | _ | |
| Admin Display | _ | _ | |
| Performance | _ | _ | |
| Edge Cases | _ | _ | |
| **TOTAL** | _ | _ | |

**Overall Status**: ______ (PASS/FAIL)

**Issues Found**:
1. ...
2. ...

**Recommendations**:
1. ...
2. ...

**Tester Name**: ________________
**Date**: ________________
**Time Spent**: ________________
