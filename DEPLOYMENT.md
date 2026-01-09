# Deployment Guide

This app is a **Next.js 15** project and can be deployed anywhere that can run `next build` + `next start`.

## Runtime Modes

The app supports two storage modes:

### 1) LocalStorage-first mode (no server database required)

This is the default, most robust mode for simple external deployments.

* Creating a tournament always succeeds.
* Votes update ELO locally and persist in the browser.
* Results page reads from localStorage when the server cannot provide data.

**Limitation:** tournaments are stored per-browser. A share link will not work on a different device unless you enable a server database.

### 2) Optional Upstash Redis persistence (for shareable tournaments)

If you set Upstash env vars, the server will also persist tournaments and votes. If Redis is unavailable, the app continues in localStorage-only mode.

Required env vars:

```env
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxx
```

#### Common deployment gotcha: quotes

Some deployment UIs store quotes literally. Prefer **unquoted** values in the UI.

The app also strips wrapping quotes at runtime, so both of these work:

* `https://xxxx.upstash.io`
* `"https://xxxx.upstash.io"`

## Optional AI environment variables

If you want AI-generated contender *names*:

```env
OPENAI_API_KEY=...
NEXT_PUBLIC_POLLINATIONS_API_KEY=pk_...
```

If `OPENAI_API_KEY` is missing, the app falls back to default contenders.

### Image strategy (Wikipedia → Commons → Pollinations)

On tournament creation, the server resolves each contender image in this order:

1. English Wikipedia article lead image
2. Wikimedia Commons image via Wikidata (P18)
3. Pollinations (final fallback)

The UI shows a per-item `Source:` link when available.

Note: variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Kilo Deploy notes

Kilo Deploy builds the app, so it will run in **production** (it is not using `next dev`).

## Suggested next steps

* If you need true shareable tournaments, enable Upstash Redis persistence.
* If you only need a demo/prototype, localStorage-first mode is enough.
