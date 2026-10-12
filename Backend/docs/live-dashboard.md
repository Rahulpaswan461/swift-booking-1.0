# Live doctor and admin dashboards

This release requires **no new SQL migrations** and makes no database structure changes. It uses the existing appointments, session_notes, patients, doctors, admins and clinics tables. Admin statistics use migration 016's clinic_dashboard_stats function when available. If the function is missing, the endpoint falls back to paged clinic-scoped appointment metadata and doctor reads, preserving all totals and avoiding the Data API's 1,000-row cap. Permissions and connection failures remain errors; they are never reported as zero bookings. Missing RPC availability is checked once per minute, with one warning per outage. If 016 was already applied, do not rerun it. Do not rerun the older migration history for this update.

## Behavior

- New bookings appear on the selected date in the doctor's open dashboard, with a visual notice and a 15-second row highlight. A different date produces a notice with a View date button; it does not move the selected day or close notes.
- Cancellations, reschedules (old and new date), completed/no-show changes, and saved notes invalidate the relevant screen. Admin overview and appointment lists refresh for their own clinic. Cancelled and no-show totals are separate.
- Failed snapshot reads retry with backoff while the tab is visible, including when the socket stays connected. Authentication and access failures are not retried.
- Background reads retain existing content. Bursts coalesce, reads do not overlap, and an event during a read triggers a follow-up. A date change aborts the old request and hides rows for that old date.
- One Socket.IO connection exists per open dashboard tab. It authenticates with the existing staff JWT, derives the room on the server, checks account and clinic/subscription access on connect and every five minutes, and disconnects at token expiry.
- Events contain appointment ID, event type and dates, not patient details, note content or cancellation tokens. Sensitive data still comes from the authenticated REST API.
- Reconnection and returning to a visible tab trigger a full snapshot refresh. While disconnected, a visible tab retries the snapshot at most once per minute. Socket heartbeats do not query Supabase. Missed notifications are repaired through snapshots, not persisted in new database tables.
- The patient roster reads compact appointment metadata and profiles, then note metadata and only the latest note bodies for the current page. Search/page responses contain at most 25 patients. Metadata is cached for 15 seconds per doctor/clinic (up to 50 entries), coalesced, and invalidated by appointment changes. Totals are collected across Data API pages so the 1,000-row cap does not silently truncate them. Lifetime aggregation still scans compact historical rows; a database aggregate is the future optimization if volume warrants a migration.

## Deploy

1. Install backend and frontend dependencies from their lockfiles (`npm ci` in each folder).
2. Deploy the backend on the existing Render web service and port. The HTTP server now also serves `/socket.io/` using WebSocket transport.
3. On Vercel set `VITE_REALTIME_URL=https://swift-booking-1-0-1.onrender.com` (or the backend's actual public HTTPS origin), then build/deploy the frontend. The code currently defaults to the existing Render URL when no API/realtime origin is configured. A new backend URL requires changing that configuration.
4. Leave the current Vercel `/api` rewrite for REST. The socket connects directly to Render; do not route its upgrade through the SPA fallback. Development also connects sockets directly to the backend (`http://localhost:3000` by default, or the Vite proxy target configured by `VITE_API_URL`). Only REST uses the Vite `/api` proxy, preserving clinic Host headers. Override `VITE_REALTIME_URL` when the browser needs a different public backend origin, for example on another device. This avoids reset/EPIPE errors from the extra Vite WebSocket proxy hop on reload or disconnect.
5. If using another frontend domain, add its exact origin to the backend `CORS_ORIGINS` comma-separated list. The existing platform domain, clinic subdomains and known Vercel domain remain allowed.
6. Open a doctor dashboard and an admin dashboard, book through the patient flow, and verify the new row and clinic totals. Repeat for cancellation/rescheduling, then reconnect a dashboard after briefly taking it offline.

No credentials or Supabase service key go into Vercel's public environment variables. Only the backend origin is public configuration. Statistics dates use `DASHBOARD_TZ`, then `REMINDER_TZ`, then `Asia/Kolkata`, so UTC midnight does not select the wrong business day. Set a valid IANA timezone if operating in another region.

## Render free tier and future growth

Render Free currently runs one instance, so in-memory room routing fits this deployment. Free services can sleep after 15 minutes without inbound HTTP/WebSocket traffic, take about a minute to wake and restart unexpectedly. The UI displays Connecting/Reconnecting and resyncs when access returns. It cannot guarantee instant updates while the backend is asleep or unavailable. Active dashboards consume normal Render bandwidth and instance time.

Before scaling to multiple backend instances, add a shared Socket.IO adapter such as Redis so a mutation handled on one instance reaches connections on another. Current notifications cover mutations through this backend. Direct SQL changes or other writers require a database event source/outbox in a future release. Alerts when the dashboard/browser is closed would require Web Push or an email/SMS notification flow; this release covers open dashboards.

Sources: [Render Free](https://render.com/docs/free), [Render WebSockets](https://render.com/docs/websocket), [Socket.IO multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/).

## Validation

Run `npm test` in Backend and Frontend, then `npm run build` in Frontend. Backend WebSocket integration tests open a temporary localhost port and use test identities; they never read Supabase credentials. The 24 tests cover authentication, isolation, expiry, reconnect, post-write booking/rescheduling notifications, older optional-column compatibility, roster paging beyond 1,000 records, scoped latest-note reads, cache invalidation during an in-flight read, burst coalescing and retry/cleanup behavior. Manual browser checks use a separate localhost sample API, not production data.
