# Healibrate Launch Video — Design

**Date:** 2026-07-28
**Status:** Approved — building

## Goal
A professional ~85-second product launch video for **Healibrate** (multi-tenant
clinic booking SaaS), for the website, YouTube, and phone-first social. Covers
every major surface: marketing home, a clinic's own branded booking page, the
full patient booking flow, live design customization + preview, the admin
dashboard, and the doctor portal. Rendered for **desktop (16:9)** and
**mobile (9:16)**. Built with **Remotion** (animated UI recreations, not
screenshots). Music is a drop-in placeholder; on-screen text captions carry the
message so it works muted.

## Storyboard (~85s, 30fps)

| # | Time | Scene | Shows | Caption |
|---|------|-------|-------|---------|
| 0 | 0–5s | Logo cold-open | Healibrate mark on teal gradient | "Healibrate" → "Your clinic. Online in minutes." |
| 1 | 5–14s | Home page | Marketing hero in a browser frame | "One platform for bookings, branding & patients." |
| 2 | 14–34s | Patient books | Phone: branded booking page → tap Book → email verify (typing + code) → pick doctor → pick slot → confirmation ✓ | "Their own branded link." → "No app. Just a code." → "Booked in under a minute." |
| 3 | 34–40s | Confirmation & reminders | Phone: confirmation email + reminder | "Instant confirmation. Automatic reminders." |
| 4 | 40–56s | Design it your way | Desktop: branding settings — cursor changes color/logo/tagline; live preview updates | "Make it yours — watch the preview update live." |
| 5 | 56–66s | Admin dashboard | Desktop: stats, booking link, today's appointments | "Your whole clinic at a glance." |
| 6 | 66–74s | Doctor portal | Desktop: doctor dashboard — My Patients, schedule, notes | "Doctors get their own portal." |
| 7 | 74–81s | Plans | Three pricing cards (₹99 / ₹299 / ₹499) | "Three simple plans." |
| 8 | 81–85s | CTA outro | Logo + URL | "Launch your clinic today · healibrate.in" |

## Technical design

- **Isolated project:** new `video/` folder at repo root with its own
  `package.json`. Never imports from or modifies `Frontend/`/`Backend/`.
- **Remotion skill:** install via `npx skills add remotion-dev/skills` and follow it.
- **Brand tokens** (`src/theme.js`): teal `#1d7f72` (brand-600), surfaces, and a
  display/serif + sans pairing matching the app, so mockups read as the real UI.
- **Reusable primitives:** `BrowserFrame`, `PhoneFrame`, `Cursor`, `TypeOn`,
  `Caption`, transition helpers (spring/slide/fade).
- **Screen components** (one per surface): `HomeScreen`, `ClinicBookingScreen`,
  `VerifyScreen`, `DoctorPickScreen`, `SlotScreen`, `ConfirmScreen`,
  `BrandingPreviewScreen`, `AdminDashboardScreen`, `DoctorDashboardScreen`,
  `PricingScreen`, `Outro`. Each is a pure component taking a `format` prop.
- **Two compositions** from the same timeline component, driven by `format`:
  - `LaunchDesktop` — 1920×1080
  - `LaunchMobile` — 1080×1920 (phone scenes fill; desktop scenes reframed/scaled)
- **Timing:** a single `Timeline` composes scenes with `<Sequence>`; scene
  durations from the storyboard.
- **Audio:** `<Audio>` with a placeholder track in `public/`, documented for
  drop-in replacement; captions ensure it works with sound off.
- **Render:** npm scripts — `render:desktop`, `render:mobile` → `out/healibrate-desktop.mp4`,
  `out/healibrate-mobile.mp4`.

## Build order
1. **Prove the pipeline first:** scaffold Remotion, render a 1-second test to
   confirm rendering works in this environment before building everything.
2. Brand tokens + primitives (BrowserFrame, PhoneFrame, Cursor, TypeOn, Caption).
3. Screen components (desktop-first), composed into the Timeline.
4. Desktop composition end-to-end; render + review.
5. Mobile reframe; render + review.
6. Music placeholder + final polish.

## Out of scope
- Licensed music sourcing (placeholder + timing provided).
- Voiceover (captions-only by decision).
- Real screen recordings (using animated recreations by decision).

## Success criteria
- Both `.mp4` files render cleanly and play on desktop and phone.
- Every listed surface appears and is recognizable as Healibrate.
- On-brand, smooth motion; readable captions; ~85s ± a few seconds.
