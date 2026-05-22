# Supabase Setup Instructions

## 1. Create a Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Copy these credentials to `.env`:
   - `SUPABASE_URL=https://your-project.supabase.co`
   - `SUPABASE_SERVICE_KEY=your_service_role_key` (NOT anon key!)

## 2. Create PostgreSQL Schema

Go to Supabase SQL Editor and run the entire schema (provided in project overview):

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Patients
CREATE TABLE patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(50)  NOT NULL,
  date_of_birth VARCHAR(20),
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Doctors
CREATE TABLE doctors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      VARCHAR(255) NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password       TEXT         NOT NULL,
  qualification  VARCHAR(255),
  specialization VARCHAR(255),
  is_active      BOOLEAN      DEFAULT TRUE,
  first_login    BOOLEAN      DEFAULT TRUE,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- Admins
CREATE TABLE admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   TEXT         NOT NULL,
  role       VARCHAR(50)  DEFAULT 'admin',
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Doctor Schedules
CREATE TABLE doctor_schedules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id        UUID    NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  working_days     TEXT[]  NOT NULL,
  start_time       VARCHAR(10) NOT NULL,
  end_time         VARCHAR(10) NOT NULL,
  slot_duration_min INTEGER DEFAULT 15,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id)
);

-- Doctor Unavailability
CREATE TABLE doctor_unavailability (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  date       VARCHAR(20)  NOT NULL,
  start_time VARCHAR(10)  DEFAULT NULL,
  end_time   VARCHAR(10)  DEFAULT NULL,
  reason     TEXT         DEFAULT '',
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_unavailability_doctor_date
  ON doctor_unavailability(doctor_id, date);

-- Appointments
CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id),
  doctor_id        UUID NOT NULL REFERENCES doctors(id),
  appointment_date VARCHAR(20)  NOT NULL,
  appointment_time VARCHAR(10)  NOT NULL,
  status           VARCHAR(20)  DEFAULT 'confirmed'
    CHECK (status IN ('pending','confirmed','completed','no_show','cancelled')),
  notes            TEXT         DEFAULT '',
  cancel_token     TEXT         NOT NULL,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_appointments_doctor_date
  ON appointments(doctor_id, appointment_date, appointment_time);

CREATE INDEX idx_appointments_patient
  ON appointments(patient_id, created_at DESC);

CREATE UNIQUE INDEX idx_no_double_booking
  ON appointments(doctor_id, appointment_date, appointment_time)
  WHERE status NOT IN ('cancelled');

-- OTPs
CREATE TABLE otps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) NOT NULL,
  otp        VARCHAR(10)  NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  used       BOOLEAN      DEFAULT FALSE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Email Logs
CREATE TABLE email_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID REFERENCES appointments(id),
  email_type      VARCHAR(100) DEFAULT 'booking_confirmation',
  recipient_email VARCHAR(255) NOT NULL,
  status          VARCHAR(20)  CHECK (status IN ('sent','failed')),
  sent_at         TIMESTAMPTZ  DEFAULT NOW()
);
```

## 3. Configure .env

Create `.env` file in Backend directory:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Admin Seed
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword123

# Server
PORT=3000
```

## 4. Seed Admin User

```bash
cd Backend
npm run seed:admin
```

Expected output:
```
Admin created → admin@example.com
```

## 5. Test the Connection

Start the server:
```bash
npm start
```

Test with curl:
```bash
# Check server
curl http://localhost:3000/health
# Output: ok

# Send OTP
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@example.com"}'
```

## 6. Enable Row Level Security (Optional but Recommended)

```sql
-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
```

Then create policies as needed for your security model.

## Troubleshooting

**Error: "Supabase URL not provided"**
- Check SUPABASE_URL in .env

**Error: "Failed to authenticate"**
- Verify SUPABASE_SERVICE_KEY is the SERVICE ROLE key, not ANON key

**Error: "relation ... does not exist"**
- Schema hasn't been created yet. Run all SQL in Supabase SQL Editor

**OTP not deleting after expiry**
- PostgreSQL doesn't have automatic TTL. App handles manual cleanup in verifyOtp()

