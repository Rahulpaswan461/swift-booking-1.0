# MongoDB → PostgreSQL Migration Complete ✅

## Summary
Successfully migrated MediBook backend from MongoDB (Mongoose) to PostgreSQL (Supabase).

## Changes Made

### 1. **Config Layer** (Step 1)
- ✅ Created `src/config/supabase.js` - Supabase client initialization
- ✅ Removed `connection.js` - No longer needed

### 2. **Main Entry Point** (Step 2)
- ✅ Updated `index.js` - Removed MongoDB connection logic
- ✅ Imports now use Supabase directly from controllers

### 3. **Controllers** (Steps 3-7)
All controllers migrated to Supabase queries:

#### **authController.js**
- ✅ `sendOtp()` - Uses `supabase.from('otps').insert()`
- ✅ `verifyOtp()` - Uses `.single()` for fetching, handles expired OTPs manually
- Fixed: Proper error handling for Supabase responses

#### **Appointment.js**
- ✅ `bookAppointment()` - Upserts patient, inserts appointment with cancel_token
- ✅ `getAppointment()` - Single query retrieval
- ✅ `cancelAppointment()` - Updates with updated_at timestamp
- ✅ `cancelAppointmentWithToken()` - Token validation and update

#### **Doctor.js**
- ✅ `createDoctor()` - Inserts new doctor with hashed password
- ✅ `doctorLogin()` - Fetches with password, returns token
- ✅ `changePassword()` - Updates password and first_login flag
- ✅ `getDoctor()` - Excludes password from response
- ✅ `getAllDoctors()` - Selects specific columns
- ✅ `getDoctorAppointments()` - Uses select() with joins to fetch patient/doctor details
- ✅ `updateAppointmentStatus()` - Ownership check with .eq('doctor_id', doctorId)

#### **adminController.js**
- ✅ `adminlogin()` - Token generation for admin role
- ✅ `getAllAppointments()` - Dynamic filters + joins for patient/doctor details
- ✅ `getStats()` - Parallel queries with aggregation-like breakdown
- ✅ `toggleDoctor()` - Fetch, toggle, and update is_active flag

#### **scheduleController.js**
- ✅ `setDoctorSchedule()` - Upsert with onConflict on doctor_id
- ✅ `addUnavailability()` - Insert unavailability records
- ✅ `getDoctorSlots()` - Fetch schedule + unavailability + booked appointments, return available slots

### 4. **Seed Script** (Step 8)
- ✅ Updated `scripts/seedAdmin.js` - Uses Supabase instead of Mongoose

### 5. **Package Management** (Step 9)
- ✅ Updated `package.json` - Added @supabase/supabase-js, removed mongoose
- ✅ Installed dependencies: `npm install`
- ✅ Uninstalled mongoose: `npm uninstall mongoose`
- ✅ Removed `models/` directory - All model files deleted
- ✅ Removed `connection.js` - No longer needed

## Field Name Mappings

```
MongoDB          → PostgreSQL
_id              → id
fullName         → full_name
doctorId         → doctor_id
workingDays      → working_days
startTime        → start_time
endTime          → end_time
slotDurationMin  → slot_duration_min
```

## Key Supabase Patterns Used

### Pattern 1: Single Row Fetch
```javascript
const { data, error } = await supabase
  .from('table')
  .select('columns')
  .eq('field', value)
  .single()
```

### Pattern 2: Upsert
```javascript
const { data, error } = await supabase
  .from('table')
  .upsert({ ...fields }, { onConflict: 'unique_field' })
  .select()
  .single()
```

### Pattern 3: Update with Ownership Check
```javascript
const { data, error } = await supabase
  .from('table')
  .update({ field: value })
  .eq('id', id)
  .eq('owner_id', ownerId)  // ownership check
  .select()
  .single()
```

### Pattern 4: Join Query (replaces .populate())
```javascript
const { data } = await supabase
  .from('appointments')
  .select(`
    *,
    patients (full_name, email, phone),
    doctors  (full_name, specialization)
  `)
  .eq('doctor_id', doctorId)
```

### Pattern 5: Manual TTL (OTP Cleanup)
```javascript
// No automatic TTL index - delete manually:
await supabase.from('otps').delete().eq('email', email).lt('expires_at', now)
```

## Important Rules Applied

✅ **Never return password** - Always exclude with explicit .select()  
✅ **Updated timestamps** - Pass `updated_at: new Date().toISOString()` manually  
✅ **cancel_token** - Generated with `crypto.randomBytes(32).toString('hex')`  
✅ **Error handling** - Check `{ data, error }` before using data  
✅ **NULL handling** - `.single()` returns null if no row found

## Environment Variables Required

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=securepassword
ADMIN_NAME=Admin User
```

## Next Steps

1. **Set Supabase credentials** in .env file
2. **Create PostgreSQL schema** using SQL provided in project overview
3. **Test endpoints** with Postman:
   - POST `/api/auth/send-otp` - Send OTP to patient
   - POST `/api/auth/verify-otp` - Verify OTP
   - POST `/api/doctors/login` - Doctor login
   - POST `/api/admin/login` - Admin login
4. **Seed admin user** with `npm run seed:admin`
5. **Deploy** to production

## Migration Status: ✅ COMPLETE

All 9 migration steps completed successfully.
- Controllers: ✅ 5/5 migrated
- Config: ✅ 1/1 created
- Seed script: ✅ Updated
- Dependencies: ✅ Updated
- Model files: ✅ Removed
