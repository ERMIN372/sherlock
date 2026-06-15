# 🔎 Sherlock Web — consent-based face search

A simple, friendly web app to find people by a photo of their face — but only
people who **voluntarily opted in** or who appear in datasets the operator is
**authorized** to index. Inspired by the look & feel of the "Sherlock: AI Face
Search" mobile app, rebuilt for the web as an **ethical, opt-in** tool.

## What it does

- **Search** — upload a face photo. The browser detects the face and computes a
  128-dimensional descriptor (using face-api.js, fully client-side). The server
  compares it against consented profiles and returns ranked matches with a
  friendly "% match", source badge, and a link to the profile the person chose
  to share.
- **Add me** — anyone can opt in: add their own face photo, a display name, and
  an optional public link. They can remove themselves at any time.

## What it deliberately does NOT do

This is **not** a surveillance tool. It does not scrape social networks, bypass
logins, defeat rate limits, or identify strangers who never consented. Those are
out of scope by design. Only two kinds of records are searchable:

1. Profiles people add about **themselves** (opt-in), and
2. Datasets dropped into `data/sources/<name>/manifest.json` that the operator
   is **permitted** to index (marked `"consent": true`).

## Architecture

```
server/
  index.js                 Express app + JSON API
  db.js                    Tiny JSON-file storage
  matcher.js               Descriptor distance → ranked matches (pure math)
  sources/
    base.js                SourceAdapter interface
    index.js               Registry that merges all sources
    manualOptIn.js         Opt-in profiles (DB-backed)        ← core source
    authorizedDirectory.js Authorized on-disk datasets        ← example adapter
public/                    Static front-end (search + add pages)
  js/face.js               Browser face pipeline (face-api.js)
  models/                  Face detection + recognition weights
test/api.test.js           End-to-end opt-in + search test
```

### Pluggable sources

Every data source is an adapter implementing `listProfiles()` and returning
normalized, consented records. To add a new **authorized** source, subclass
`SourceAdapter`, return records (each with a precomputed 128-d `descriptor`),
and `register()` it in `server/index.js`. No other code changes are required.

## Run it

```bash
npm install
npm start
# open http://localhost:3000
```

The face models are bundled in `public/models`, so it works fully offline after
install.

## Test

```bash
npm test
```

## API

| Method | Path                 | Purpose                                   |
|--------|----------------------|-------------------------------------------|
| GET    | `/api/sources`       | List sources + indexed profile counts     |
| POST   | `/api/profiles`      | Opt in (name, descriptor, image, consent) |
| DELETE | `/api/profiles/:id`  | Withdraw consent / remove yourself        |
| POST   | `/api/search`        | Rank consented profiles vs. a descriptor  |

## Privacy notes

- Face matching runs in the browser; the server stores descriptors only to make
  consented people findable.
- Consent is required on every opt-in and removal is one click.
- Matching is approximate (descriptor distance, `0.6` threshold). It is meant
  for discovery between consenting people, not identification or verification.
