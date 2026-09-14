# Orbit Waitlist

Static web app for the Orbit pre-launch waitlist. A single-screen form collects name + email and stores entries in Supabase. Shows a QR code for use at events.

The product story (problem, features) lives on orbitnetworker.com — `/join` is purely the signup step, so anyone arriving from the site lands straight on the form.

## Pages

| Route | File | Purpose |
|-------|------|---------|
| `/qr` | `index.html` | QR code — show at events for people to scan |
| `/join` | `join.html` | Waitlist signup form — name + email only (root `/` redirects here) |

## Stack

- Vanilla HTML / CSS / JS — zero runtime dependencies
- **QR:** `qrcode` npm package (bundled via esbuild to `vendor/qrcode.min.js`)
- **Database:** Supabase (`orbit_waitlist` table, anon inserts via RLS)
- **Hosting:** Vercel

## Setup

### 1. Install & build

```bash
npm install
npm run build
```

### 2. Update `site-config.json`

Set `baseUrl` to your custom domain (never a `.vercel.app` URL):

```json
{
  "baseUrl": "https://orbitwaitlist.au",
  "joinPath": "/join"
}
```

Then run `npm run build` so `join-url.json` and `assets/join-qr.png` encode the same URL. The QR page at **`/qr`** always points to that domain — opening it on a Vercel preview URL will not change what gets encoded.

### 3. Deploy to Vercel

```bash
# Login if needed
vercel login

# Deploy (first time — will ask a few questions)
vercel

# Deploy to production
vercel --prod
```

### 4. Push to GitHub

Create a new repo on github.com, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/Orbit-Waitlist.git
git push -u origin master
```

Then connect the GitHub repo to Vercel for automatic deployments on push.

## Keeping Supabase awake

Supabase pauses Free Plan projects with low activity over a 7-day period, and a
paused project means the signup form stops working. Their docs: *"Typically a
few user requests to the database each day over the previous week is enough to
keep the project from being paused."*

`.github/workflows/supabase-keepalive.yml` runs twice a day (19:37 and 07:13
UTC — 5:37am and 5:13pm AEST) and sends a small burst of real queries to the
`orbit_waitlist` table. It reads the project URL and anon key straight from
`site-config.json`, so there is nothing to configure and no secrets to manage.

Two runs a day, both off the top of the hour: GitHub's scheduler delays or drops
runs under load, and `:00` is its most congested slot. Running twice means a
missed run costs nothing, since the day is still covered.

- **Run it manually:** Actions tab → *Supabase keep-alive* → *Run workflow*
- **If it fails**, GitHub emails the repo owner — that is the early warning that
  the project needs attention. A paused project is resumed from the Supabase
  dashboard (data is preserved; there is a 90-day window to restore).
- It writes nothing to the database, so the waitlist table stays clean.
- Every 21 days it commits a timestamp to `.github/keepalive-heartbeat.txt`.
  That is deliberate: GitHub disables scheduled workflows on public repos after
  60 days of no repository activity, which would silently kill this workflow.
  The commit is tagged `[skip ci]` so it does not trigger a Vercel redeploy.

The only permanent fix is the Supabase Pro plan — paid projects are never paused.

## Viewing waitlist entries

Log in to [supabase.com](https://supabase.com) → Table Editor → `orbit_waitlist`.

You can export a CSV of all emails from there when you're ready to send the launch email.

## Apple Wallet / Home Screen

- **iOS:** Open `/qr` in Safari → Share → "Add to Home Screen"
- **Third-party wallet apps:** Paste your deployed URL into the app to generate a pass with the QR embedded

## Development

```bash
npm start  # Serves on http://localhost:3000
```
