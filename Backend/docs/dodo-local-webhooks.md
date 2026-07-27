# Testing Dodo Payments webhooks locally

Dodo delivers subscription events (activation, renewal, cancellation) by
`POST`ing to a public HTTPS URL. It cannot reach `localhost`, so on a dev
machine the plan never updates from the webhook alone.

There are two ways a payment activates a clinic's plan:

1. **Verify-on-return** (works on localhost with no setup). When the admin
   returns from the Dodo checkout to `/admin/billing?status=success&subscription_id=…`,
   the frontend calls `POST /api/admin/billing/verify`, which fetches the
   subscription from Dodo's API server-side and activates the plan. This is
   the path you get for free locally, and it also backs up delayed or missed
   webhooks in production.
2. **Webhooks** (the primary mechanism in production). To exercise the real
   webhook signature path locally, expose your backend with a tunnel.

## Exposing the backend with a tunnel

Pick one. The backend runs on port `5000` by default (check your `.env`).

### ngrok

```bash
ngrok http 5000
```

Copy the `https://<random>.ngrok-free.app` forwarding URL.

### cloudflared

```bash
cloudflared tunnel --url http://localhost:5000
```

Copy the printed `https://<random>.trycloudflare.com` URL.

## Point Dodo at the tunnel

1. Dodo dashboard → **Developer → Webhooks**.
2. Set the endpoint URL to `<tunnel-url>/api/webhooks/dodo`.
3. Copy the signing secret (`whsec_…`) into `DODO_WEBHOOK_SECRET` in
   `Backend/.env` and restart the backend.

The webhook receiver verifies the signature over the raw body and rejects
deliveries older than 5 minutes, so the tunnel must forward requests
promptly and the secret must match exactly.

## Test the flow end-to-end

1. Register a clinic (it starts unpaid — `subscription_plan = null`).
2. Go to **Plan & Billing**, pick a plan, and complete the Dodo test
   checkout.
3. On return, verify-on-return should flip the plan immediately.
4. Watch the backend logs for `[Dodo] Clinic <id> → <plan> (…)` — a
   `verify:*` event is the return path; a plain event type
   (`subscription.active`, etc.) is the real webhook arriving via the tunnel.

## Notes

- The tunnel URL changes each run (unless you have a reserved ngrok domain),
  so you must update the Dodo dashboard webhook URL each session.
- `verify-on-return` and the webhook are idempotent: the subscription row is
  upserted on `provider_subscription_id`, so both firing for the same payment
  is harmless.
- To bypass billing entirely while developing unrelated features, set
  `BETA_MODE=true` in `Backend/.env` — enforcement is suspended and every
  clinic gets full access. Set it back to `false` to test the paywall.
