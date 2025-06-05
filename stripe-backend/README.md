# Stripe + Supabase Credits Backend

This is a minimal Express backend for handling Stripe Checkout and webhooks to grant credits (e.g., late submit, anonymous credits) to users in a Supabase-powered app.

## Features
- `/api/create-checkout-session`: Creates a Stripe Checkout session for a given price and user.
- `/api/stripe/webhook`: Handles Stripe webhooks and updates user credits in Supabase.

## Setup
1. Copy `.env.example` to `.env` and fill in your secrets (Stripe, Supabase, URLs).
2. `npm install`
3. `npm start`

## Environment Variables
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (keep this secret!)
- `SUCCESS_URL`: Where to send users after payment
- `CANCEL_URL`: Where to send users if they cancel
- `PORT`: Port to run the server (default 3000)

## Deploying to Render
- Create a new Web Service on Render, connect this repo/folder.
- Add all environment variables in the Render dashboard.
- Set the start command to `npm start`.

## Next Steps
- Fill in the TODOs in `index.js` to map Stripe price IDs to credit logic.
- Update your frontend to call your Render backend for checkout.

---

Questions? Paste your Render URL and I'll help you wire up the rest! 