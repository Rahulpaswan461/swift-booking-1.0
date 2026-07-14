# Supabase Setup & Getting Started

## Step-by-Step Guide

This guide assumes you already have a Supabase project. If not, [create one here](https://supabase.com) first.

---

### Step 1 — Configure Environment Variables

Create a `.env` file in the `Backend/` directory:

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

> **Important:** Use the **SERVICE ROLE key** (not the anon key). You can find it at
> Supabase Dashboard → Project Settings → API → Service Role Secret.

---

### Step 2 — Run Database Migrations

Open the **SQL Editor** in your Supabase dashboard and run each migration file
**in order**. Each migration is safe — it uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`
and won't drop existing data:

| # | Migration File | What It Does |
|---|---|---|
| 1 | `Backend/migrations/001_add_clinics_and_clinic_id.sql` | Creates `clinics` table, adds `clinic_id` to existing tables |
| 2 | `Backend/migrations/002_add_clinic_id_to_appointments.sql` | Adds `clinic_id` to appointments |
| 3 | `Backend/migrations/003_create_patient_and_otp_tables.sql` | Creates `patients` and `otp_verifications` tables |
| 4 | `Backend/migrations/004_add_session_notes.sql` | Creates `session_notes` table for visit records |
| 5 | `Backend/migrations/005_multi_tenant_saas_enhancements.sql` | Adds subscriptions, audit logs, notifications, RBAC, doctor leaves, and analytics views |

**How to run:** Copy the contents of each file into the Supabase SQL Editor and click
**Run**. Do them in order (001 → 005).

---

### Step 3 — Seed Initial Data

This creates a default clinic, admin user, doctor, and subscription:

```bash
cd Backend
npm install          # if you haven't already
npm run seed:clinic
```

Expected output:
```
✅ Clinic created → Swift Booking Clinic (slug: swift)
✅ Admin created → admin@example.com
✅ Default doctor created → doctor@example.com
✅ Free trial subscription created (14 days)
🎉 Seed complete!
```

> **You MUST have at least one active clinic** for the app to work. The
> `resolveTenant` middleware looks up the clinic on every patient-facing request.

---

### Step 4 — Start the Backend

```bash
cd Backend
npm start
```

Test it:
```bash
curl http://localhost:3000/health
# Output: ok
```

---

### Step 5 — Start the Frontend

```bash
cd Frontend
npm install          # if you haven't already
npm run dev
```

The app opens at **http://localhost:5173**.

---

### Step 6 — Use the Portal

#### 🏥 Admin Portal
1. Go to **http://localhost:5173/admin/login**
2. Sign in with the credentials from your `.env` (default: `admin@example.com` / `SecurePassword123`)
3. From the dashboard you can:
   - **Add doctors** — go to Doctors → Add Doctor
   - **Set schedules** — set working days, hours, and slot duration for each doctor
   - **View appointments** — filter by date, doctor, or status
   - **View stats** — today's appointments, weekly trends, doctor breakdown
   - **Customize branding** — change clinic name, colors, logo, and tagline

#### 👨‍⚕️ Doctor Portal
1. Go to **http://localhost:5173/doctor/login**
2. Sign in with: `doctor@example.com` / `Doctor@123`
3. On first login you'll be asked to change your password
4. From the dashboard you can:
   - View today's appointments
   - Update appointment status (confirmed → completed)
   - Add session notes (diagnosis, prescription, follow-up)
   - View patient history with past notes

#### 👤 Patient Flow (Booking)
1. Go to **http://localhost:5173/**
2. Click **Book Appointment**
3. Enter your email or phone → receive OTP → verify
4. Browse doctors → select a doctor → pick a date and time slot
5. Get instant confirmation
6. View your appointment history at **/my-appointments** (after verifying)

#### 🏥 Register a New Clinic (Multi-Tenant)
1. Go to **http://localhost:5173/admin/register**
2. Fill in clinic name, subdomain slug, email, password
3. A new clinic + admin account is created with a 14-day free trial
4. The clinic gets its own subdomain: `your-slug.medibook.in`

---

### Full Database Schema (After All Migrations)

The complete table list:

| Table | Purpose |
|---|---|
| `clinics` | Multi-tenant root — each clinic is a tenant |
| `patients` | Patient profiles (scoped to clinic via `clinic_id`) |
| `doctors` | Doctor profiles (scoped to clinic) |
| `admins` | Clinic admins (scoped to clinic, with `is_super_admin` flag) |
| `doctor_schedules` | Weekly working schedule per doctor |
| `doctor_unavailability` | One-off unavailability (holidays, sick days) |
| `appointments` | Appointment bookings (scoped to clinic) |
| `session_notes` | Visit records — diagnosis, prescription, follow-up |
| `otp_verifications` | OTP codes for patient verification |
| `otps` | Legacy OTP table (kept for backward compatibility) |
| `email_logs` | Email send/failure logs |
| `subscriptions` | Clinic subscription history (free/pro/enterprise) |
| `audit_logs` | Audit trail of all significant actions |
| `notifications` | In-app notification system |
| `appointment_status_history` | Tracks status changes (confirmed → completed, etc.) |
| `doctor_leaves` | Doctor leave requests |
| `roles` | RBAC roles (super_admin, clinic_admin, doctor, staff, receptionist) |
| `user_roles` | Links users to roles |

**Views:**
- `v_clinic_dashboard` — per-clinic summary (active doctors, patients, revenue)
- `v_daily_appointments` — daily appointment counts and revenue

---

### Step 7 — Enable Row Level Security (Optional but Recommended)

```sql
-- Enable RLS on all tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

Then create policies as needed for your security model.

---

## Troubleshooting

**Error: "Supabase URL not provided"**
- Check `SUPABASE_URL` in `.env`

**Error: "Failed to authenticate"**
- Verify `SUPABASE_SERVICE_KEY` is the SERVICE ROLE key, not ANON key

**Error: "relation ... does not exist"**
- A migration hasn't been run yet. Run the migration files in order (001 → 005)

**Error: "No active clinic found"**
- Run `npm run seed:clinic` to create a default clinic

**Error: "Your free trial has expired"**
- The 14-day trial has ended. Either update `trial_ends_at` in the `clinics` table
  or upgrade the subscription in the `subscriptions` table

**OTP not deleting after expiry**
- PostgreSQL doesn't have automatic TTL. The app handles manual cleanup in `verifyOtp()`

**Frontend can't connect to backend**
- Backend must be running on port 3000. The Vite dev proxy forwards `/api` requests
  to `http://localhost:3000/api`
