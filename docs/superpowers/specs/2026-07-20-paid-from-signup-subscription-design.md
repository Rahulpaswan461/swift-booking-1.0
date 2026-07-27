# Paid-from-Signup Subscription Model — Design

**Date:** 2026-07-20
**Status:** Approved, ready for implementation planning

## Problem

The platform has three paid tiers (Basic ₹99 / Growth ₹299 / Pro ₹499) but the
signup flow still creates clinics on a legacy `"free"` plan with a 14-day trial.
This causes three concrete problems:

1. **Confusing onboarding copy.** The register/dashboard/billing pages mention a
   "14-day free trial" and a "Basic plan" simultaneously, which no longer matches
   the intended business model.
2. **Plan updates don't reflect after payment on localhost.** Dodo's webhook
   (the only mechanism that flips `subscription_plan`) can't reach a developer
   machine, so a completed payment never updates the plan locally.
3. **No enforced "pick a plan" gate.** New clinics get free access via the trial
   instead of being required to subscribe.

`BETA_MODE` is currently `false` in `Backend/.env`, so plan enforcement is
already live — this is not a matter of turning enforcement on, but of fixing the
signup/payment lifecycle around it.

## Decision Summary

- **No free plan and no trial.** A clinic must pick and pay for a plan before the
  portal (and its public booking page) becomes usable.
- **Create clinic locked, then pay.** Registration creates the clinic + admin
  immediately in an unpaid state, then routes the admin to the billing page to
  choose a plan and pay. Abandoned checkouts can be resumed by logging back in.
- **Plan choice happens on the billing page** (a separate step after
  registration), reusing the existing plan cards.
- **Verify-on-return fixes localhost** and doubles as a production safety net for
  delayed/missed webhooks.

## Architecture

### 1. Data model — "unpaid" is derived, not a new column

- At registration, a clinic is created with `subscription_plan: null` and **no**
  `trial_ends_at`. The `trial_ends_at` column remains in the schema but is unused
  by the new flow (no migration required).
- `is_active` keeps its existing meaning: support-level deactivation of a clinic.
  It is **not** overloaded to mean "unpaid."
- A clinic is considered **unpaid** when it has no `active` row in the
  `subscriptions` table AND no `subscription_plan`. Both are already loaded by
  `loadClinicSubscription` in `middleware/tenant.js`, so no schema change is
  needed to determine paid/unpaid state.

### 2. Signup → billing → pay flow

- **Register** (`clinicController.registerClinic`): creates clinic + admin as
  today, minus `subscription_plan: "free"` and the `trial_ends_at` assignment.
  New clinics are created with `subscription_plan: null`.
- **Frontend redirect**: on successful registration, `RegisterClinic.jsx`
  redirects to `/admin/billing` instead of `/admin/dashboard`.
- **Billing page** (`BillingPage.jsx`) is the plan-selection gate. The existing
  three plan cards stay; selecting one calls the existing
  `POST /admin/billing/checkout` → Dodo hosted payment page.
- **Return / activation**: a new `POST /api/admin/billing/verify` endpoint takes
  the `subscription_id` Dodo appends to the return URL, fetches the subscription
  from Dodo's API server-side, and — if active — applies the same update the
  webhook would by reusing `handleDodoEvent`'s activation logic (plan update +
  subscription upsert + cache invalidation). `BillingPage` calls this on
  `?status=success`, then re-fetches `/admin/clinic/me` so the new plan shows
  immediately. Webhooks remain the primary mechanism in production.

### 3. Enforcement changes (`middleware/tenant.js`)

- `enforceSubscription` **drops the `subscription_plan === "free"` trial branch
  entirely**, along with the `trial_ends_at` expiry checks.
- New rule: if **not** `EARLY_ACCESS` and the clinic has no `active` subscription,
  block the request:
  - **Staff** (`req.admin` / `req.doctor`) → `403 { subscription_required: true }`
    with an upgrade message.
  - **Patients** (public booking / tenant routes) → the existing neutral
    "Online booking is temporarily unavailable" message. Plans/upgrades are never
    mentioned to patients.
- **Exempt routes** (must remain reachable by an unpaid admin): `protectAdmin`
  auth routes, `GET /admin/clinic/me`, `POST /admin/billing/checkout`, and the new
  `POST /admin/billing/verify`. These are already **not** behind
  `enforceSubscription` today (verified in `routes/Admin.js`); the new verify
  route must be wired the same way.
- **Gated routes** (blocked until a plan is active): `/admin/doctors*`,
  `/admin/appointments`, `/admin/stats`, `/admin/clinic/branding`,
  `/admin/clinic/settings`, and the public booking page — all already behind
  `enforceSubscription`.

### 4. Frontend redirect on `subscription_required` (NEW — not yet built)

- `Frontend/src/api/axios.js` currently handles only **401** (clears token,
  redirects to login). It does **not** handle the 403 `subscription_required`
  response.
- Add a branch to the `adminApi` response interceptor: on
  `err.response?.status === 403 && err.response.data?.subscription_required`,
  redirect the admin to `/admin/billing` (without clearing the auth token, so the
  admin stays logged in to pay). The billing and `clinic/me` routes must be
  excluded from this redirect to avoid a loop.

### 5. Feature entitlement — already correct, unchanged

- `clinics.subscription_plan` is the source of truth. `config/plans.js` maps each
  plan → feature flags (`customBranding`, `credentialBadges`, `visitTags`,
  `sessionNotes`, `smsNotifications`) + `maxDoctors`. `enforceSubscription`,
  `enforcePlanLimits`, and `entitlementsFor` already read it.
- Once payment sets `subscription_plan` to `basic`/`growth`/`pro`, the correct
  entitlements flow automatically. **No changes needed here** — this is the part
  that already works; it only appeared broken because the localhost webhook gap
  meant the plan never updated after payment.

### 6. Copy cleanup

Remove all "14-day free trial" / "Basic plan" trial language from:

- `RegisterClinic.jsx` — messaging becomes "Choose your plan to get started."
- `AdminDashboard.jsx` — remove the trial-days-remaining banner.
- `BillingPage.jsx` — current-plan card shows either the active plan name or a
  "No active plan — choose one below" prompt. Remove the "Trial until …" badge.
- `PricingPage.jsx` — remove trial mentions.
- Seed scripts (`seedClinic.js`, `seedDemoClinic.js`) — drop trial/free-plan
  defaults; seed a real plan instead.

### 7. Local webhook testing doc

Add `Backend/docs/dodo-local-webhooks.md`: how to run ngrok/cloudflared, point the
Dodo dashboard webhook at the tunnel, and test the real webhook path end-to-end
before going live. Complements verify-on-return (which does not exercise the
webhook signature path).

## Migration / Existing Data

- Existing clinics created with `subscription_plan: "free"` will become "unpaid"
  and be gated the moment this ships (since `BETA_MODE=false`). For local
  development, either:
  - manually set your existing test clinic(s) to a real plan
    (`basic`/`growth`/`pro`) in the `clinics` table, or
  - flip `BETA_MODE=true` in `Backend/.env` while developing to suspend
    enforcement, and set it back to `false` before testing the paywall.
- No production migration is prescribed here; the legacy `LEGACY_PLAN_MAP` in
  `config/plans.js` still normalizes any stray `"free"` value to `basic` for
  display, but such clinics will still be gated as unpaid until they subscribe.

## Out of Scope

- **Onboarding walkthrough video** — content produced by the product owner. Once
  hosted, a "How it works" link can be added to the dashboard (placement TBD by
  owner). No design/build work included in this spec.
- **Dodo built-in trial period** — explicitly rejected; the trial concept is
  removed entirely.
- **Pay-first-then-create-account** signup ordering — rejected in favor of
  create-locked-then-pay.

## Testing

- **Registration** creates a clinic with `subscription_plan: null` and no trial
  date; response routes to billing.
- **Unpaid gating**: an unpaid admin hitting `/admin/stats` (or any gated route)
  receives `403 subscription_required`; hitting `/admin/clinic/me` and
  `/admin/billing/*` succeeds.
- **Public booking** for an unpaid clinic returns the neutral patient message,
  not a plan/upgrade message.
- **Verify-on-return**: given a Dodo `subscription_id` for an active subscription,
  `POST /admin/billing/verify` sets `subscription_plan` and creates an active
  `subscriptions` row; a second call is idempotent.
- **Entitlements**: after activation to each of basic/growth/pro,
  `entitlementsFor` returns the correct feature flags and doctor limit, and
  `enforcePlanLimits("doctors")` blocks at the plan's `maxDoctors`.
- **Frontend interceptor**: a 403 `subscription_required` from `adminApi`
  redirects to `/admin/billing` without logging the admin out; no redirect loop
  on the billing/`clinic/me` routes.
