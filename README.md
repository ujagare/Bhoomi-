# Bhoomi

Bhoomi construction and rockfall protection homepage.

## Project Structure

```text
.
|-- index.html
|-- gallary.html
|-- project.html
|-- assets/
|   |-- css/
|   |   `-- styles.css
|   |-- js/
|   |   `-- main.js
|   `-- images/
|       `-- Home/
|-- README.md
`-- .gitignore
```

Open `index.html` in a browser to view the site.

## Resend Contact Form

The contact form submits to the serverless endpoint at `api/contact.js`, saves enquiries in Supabase, and sends email notifications to `info@bhoomigunitingwork.com` using Resend. Secret keys must stay server-side in Vercel environment variables and must never be added to frontend files.

1. Verify `bhoomigunitingwork.com` in Resend.
2. Create a Resend API key with send access.
3. In Supabase SQL Editor, run `supabase/contact_messages.sql`.
4. In Supabase Dashboard > Project Settings > Data API, make sure the `public` schema and `contact_messages` table are exposed to the Data API.
5. For Vercel, add these Environment Variables:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` such as `Bhoomi Website <website@bhoomigunitingwork.com>`
   - `CONTACT_TO_EMAIL` as `info@bhoomigunitingwork.com`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` for server-side inserts, or `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_CONTACT_TABLE` as `contact_messages`
6. Keep the Build Command as `npm run build`.
7. Submit the form from `contact.html` and confirm the enquiry appears in Supabase and arrives at `info@bhoomigunitingwork.com`.

The API route validates required fields, keeps a honeypot spam field, rate-limits repeated submissions per server instance, saves the enquiry before sending email, and sets the visitor's email as `reply_to` when provided.

If email sends but Supabase has no new row, check the latest Vercel deployment has these exact Production env vars and redeploy after saving them:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` for server-side contact form inserts, or `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_ANON_KEY`
- `SUPABASE_CONTACT_TABLE`

Also rerun `supabase/contact_messages.sql` in the Supabase SQL Editor so the table has RLS, insert policy, and Data API grants.

## Vercel Production

Use these settings on Vercel:

- Framework Preset: Other
- Build Command: `npm run build`
- Output Directory: `.`

Add these Environment Variables for Production and Preview:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CONTACT_TO_EMAIL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_CONTACT_TABLE`
- `GOOGLE_SITE_VERIFICATION`
- `GOOGLE_TAG_MANAGER_ID`
- `GOOGLE_ANALYTICS_ID`

Do not expose `RESEND_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in client-side JavaScript. They are safe only in Vercel serverless environment variables.

## Google Search Console, Analytics and Tag Manager

The build runs `scripts/generate-google-tags.js` and injects Google integrations into every HTML page from environment variables.

For Vercel, add these Environment Variables for Production:

- `GOOGLE_SITE_VERIFICATION`: the Search Console HTML tag content value.
- `GOOGLE_TAG_MANAGER_ID`: your container ID, such as `GTM-XXXXXXX`.
- `GOOGLE_ANALYTICS_ID`: your Google Analytics measurement ID, such as `G-XXXXXXXXXX`.

If Google Analytics is already configured inside Google Tag Manager, leave `GOOGLE_ANALYTICS_ID` empty to avoid duplicate page views.

After the production domain is live:

1. Add `https://bhoomiconstructions.com/` as a URL-prefix property in Google Search Console.
2. Copy only the Search Console verification token into `GOOGLE_SITE_VERIFICATION`. For example, from `<meta name="google-site-verification" content="TOKEN" />`, use `TOKEN`.
3. Submit `https://bhoomiconstructions.com/sitemap.xml`.
4. Use URL Inspection for the home page and main service pages, then request indexing.
5. Monitor Core Web Vitals, indexing status, search queries, and sitemap coverage.
