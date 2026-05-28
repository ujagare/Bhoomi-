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
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_CONTACT_TABLE` as `contact_messages`
6. Keep the Build Command as `npm run build`.
7. Submit the form from `contact.html` and confirm the enquiry appears in Supabase and arrives at `info@bhoomigunitingwork.com`.

The API route validates required fields, keeps a honeypot spam field, rate-limits repeated submissions per server instance, and sets the visitor's email as `reply_to` when provided.

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
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_CONTACT_TABLE`

Do not expose `RESEND_API_KEY` in client-side JavaScript. Only use the Supabase publishable key for contact form inserts, not a service role key.

## Google Search Console

After the production domain is live:

1. Add `https://bhoomiconstructions.com/` as a URL-prefix property in Google Search Console.
2. Copy the HTML verification meta tag from Search Console into the `<head>` of `index.html`, or use DNS verification for the domain.
3. Submit `https://bhoomiconstructions.com/sitemap.xml`.
4. Use URL Inspection for the home page and main service pages, then request indexing.
5. Monitor Core Web Vitals, indexing status, search queries, and sitemap coverage.
