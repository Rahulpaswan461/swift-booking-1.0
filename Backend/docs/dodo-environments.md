# Test first, then live

Checkout uses the original single set of environment variables:

```dotenv
DODO_API_BASE=https://test.dodopayments.com
DODO_API_KEY=
DODO_WEBHOOK_SECRET=
DODO_PRODUCT_BASIC=
DODO_PRODUCT_GROWTH=
DODO_PRODUCT_PRO=
```

All six values must belong to the same Dodo environment. The default API base
is test; use `https://live.dodopayments.com` for live payments. The API base is
not a checkout/product URL. Changing the URL alone does not change credentials.
`DODO_TEST_*` and `DODO_LIVE_*` variables are no longer used.

For local development, keep a test block and a commented live block using these
same names (see .env.example). Comment the whole active block before uncommenting
the other one. Keep exactly one assignment per variable active. On the deployed
server, keep only these original six variables with the values for that server's
payment mode. No second set or renamed hosting variables is required.

In Dodo, select Test Mode and create/copy its API key with write access, webhook
signing secret and three recurring monthly product IDs. Keep secrets out of
source control and chat. Basic, Growth and Pro should match the pricing page's
INR 99, 299 and 499 monthly prices; applicable taxes are calculated at checkout.

Run `npm run check:billing` from Backend. It checks the active configuration,
creates no checkout and prints no keys or secrets. Optionally add
`-- --environment test` or `-- --environment live` to assert the expected mode;
this flag does not switch the API URL or credentials.
After the configuration passes, use Plan & Billing to open hosted checkout and
complete your sandbox test using Dodo's documented test payment details.
For localhost webhook delivery, follow dodo-local-webhooks.md. A signed event
from Dodo is needed to verify the configured webhook secret end to end; checking
that the secret is present alone does not prove delivery or signature validity.

Before real payments, replace the active settings with the matching Live Mode
values and run `npm run check:billing -- --environment live`. Checkout creation,
return verification, payment history synchronization and webhook authentication
all use the same active settings. No automatic fallback switches payment modes.
Use a test clinic/database during sandbox testing; separate production data
before taking real payments.

Restart an already-running backend once to load the nodemon configuration.
Subsequent .env saves restart development automatically. Production deployments
need an explicit restart/redeploy. Hosting/shell variables can override .env.
Startup logs show the selected payment API without revealing credentials.

Provider documentation:
https://docs.dodopayments.com/developer-resources/integration-guide
