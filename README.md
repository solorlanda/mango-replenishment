# Mango · Replenishment — MongoDB version

This is a separate Node.js/Next.js version prepared for hosting outside ChatGPT.
The English page, layout, CSS and interactions are copied from the live Site.
The original Site has not been changed. This package is not yet deployed, and no
production records have been transferred.

## Start locally

1. Install Node.js 22.13 or newer and run `npm ci`.
2. Copy `.env.example` to `.env.local`; configure a MongoDB Atlas URI securely.
   The database user needs read/write access only to `mango_replenishment`.
   Permit the application's server addresses in the Atlas network access list.
   Never use a `NEXT_PUBLIC_` prefix for the URI or commit a real `.env` file.
3. Run `npm run db:setup`, then `npm run dev`.
4. For a production build, run `npm run build`, then `npm start`.

The app uses the standard Node.js MongoDB driver and a reused connection pool.
No Cloudflare bindings or ChatGPT runtime are required.

## Host on Render

Create a Node Web Service from a repository containing this package:

- Build: `npm ci && npm run build`
- Start: `npm start -- --port $PORT`
- Environment: `MONGODB_URI` (secret), `MONGODB_DB=mango_replenishment`,
  `APP_ORIGIN=https://YOUR_FINAL_HOSTNAME` (no trailing slash).
- Run `npm run db:setup` once before accepting traffic.
- Choose the hosting plan and review any charges before deploying. No plan or
  billable service has been provisioned by preparing this package.

MongoDB Atlas stores the data; Render hosts the page and Node API. MongoDB alone
cannot replace the website host. The new hosting service will provide a new URL.
The existing `chatgpt.site` URL remains associated with the original Site.

## Move existing records safely

1. Set `SOURCE_SITE_URL` to the current public Site. The supplied default is the
   existing Mango Site. Choose a date range covering ALL records, including any
   future dates used. The original Site was created on 2026-11-08.
2. Run a dry run first:
   `npm run migrate -- --from 2026-11-08 --to YYYY-MM-DD`
3. Ask the team to pause changes on the old URL. Re-run the migration after the
   pause, with `--write --backup /private/path/mango-backup.json`. The backup path
   must not already exist. Keep the backup private and outside version control.
4. The importer copies morning AND afternoon shifts, all sizes, statuses and
   archived records. IDs and shift keys stay the same. It verifies every record.
   It only inserts missing IDs; it never overwrites destination changes or deletes
   source data. If interrupted, it can be re-run. If verification finds a conflict,
   stop the switch and resolve it before using the new URL.
5. Check the new app on two phones: same date and shift, add a temporary product,
   mark one size found and another unavailable, check filters and archive, and
   reload to confirm persistence. Test previous dates too.
6. Share the NEW URL with the team only after checks pass. Keep the original Site
   available for rollback. Records added on either copy do not sync to the other.

The importer reads each date and shift because the original public API has no
all-dates export route. A date outside the selected range is not imported.

## Same app behaviour

- Product, colour, sizes; no references or quantities.
- Pending, Found, Unavailable states per size; filters and completed archive.
- Separate lists by date and shift, with refresh every five seconds.
- Stored shift labels `Mañana` / `Tarde` are retained internally for data
  compatibility; the UI displays Morning / Afternoon.
- Public link access is intentional: anyone with the URL can read and update
  the replenishment list. Do not add sensitive personal information.

## Verification status

The package can be checked with `npm run check` and `npm run build` without a
MongoDB credential. A real Atlas connection, data transfer, and external
production deployment require your connected accounts and must be verified
before this replaces the live Site.
