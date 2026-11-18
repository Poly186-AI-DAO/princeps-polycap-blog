# Blog assets: root-relative `/api/local-blobs/` paths

Status: shim shipped in `src/app/api/local-blobs/[...path]/route.js`. Needs one
env var to arm.

## The problem, measured

Every published document in `PrincepsBlog` stores its assets as root-relative
platform paths:

| Where | Value |
|---|---|
| `image.url` (hero) | `/api/local-blobs/workspace-d8849d70-…/…creative_studio_2k.jpg` |
| inline portrait in `content` | `/api/local-blobs/workspace-d8849d70-…/…operator-headshot-suit-cutout.png` |
| CTA link in `content` | `/api/local-blobs/workspace-a39b2977-…/ai-company-operating-checklist.md` |

`src/lib/blogs.js` (`ffbb118c`) normalises `image.url` → `src` **verbatim**, and
markdown image/link targets are rendered as written. So the browser asks the
brand host for `/api/local-blobs/…`.

This repo never owned that route (`src/app/api/local-blobs/[...path]/route.js`
returned 404 before this change). Consequence: deploying the blog surface
correctly still ships a broken hero, a broken inline image and a dead lead
magnet. Deploy alone was necessary but not sufficient.

The asset paths also cross workspace boundaries — `workspace-d8849d70` (creative
studio output) and `workspace-a39b2977` (the publishing workspace) both appear
in one document — so no single-workspace route could ever have served them.

## The shim

`GET /api/local-blobs/<container>/<blob…>` on the brand host now returns a
validated `307` to the same path on `BLOG_ASSET_ORIGIN`.

- The target host comes **only** from the env var. Nothing from the request
  influences the destination, so this is not an open redirect.
- Segments are rejected if they are empty, `.`, `..`, or contain `/`, `\` or a
  NUL after percent-decoding.
- Response is `Cache-Control: public, max-age=600`. Deliberately 307 and not
  308: a permanent redirect would be cached in browsers and would survive a
  correction of the origin.
- `dynamic = 'force-dynamic'` so `next build` never tries to prerender it and
  never needs the env var at build time.

## Arming it

| Where | Variable | Value |
|---|---|---|
| Vercel project → Settings → Environment Variables → **Production** | `BLOG_ASSET_ORIGIN` | origin of the platform API that serves `/api/local-blobs/`, scheme + host only, e.g. `https://api.<platform-host>` |

It belongs in the **Vercel project**, not in repo secrets: the deploy workflow
runs `vercel pull --environment=production` and then `vercel build --prod`, so
project env vars are what the built artifact sees.

Unset behaviour is a `404` with `{"error":"asset_origin_not_configured"}` — the
same outcome the surface had before this route existed, so landing this cannot
regress anything.

## Verifying

```bash
# 1. Which published docs still carry relative asset paths?
MONGODB_DATABASE_URL='<uri>' node scripts/audit-published-assets.mjs

# 2. After deploy, does the shim resolve? (replace host + a real blob path)
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  'https://princepspolycap.com/api/local-blobs/workspace-d8849d70-EXAMPLE/x.jpg'
```

`307` with a `redirect_url` on `BLOG_ASSET_ORIGIN` = armed.
`404` with `asset_origin_not_configured` = env var missing.
`400` with `invalid_asset_path` = the path was rejected by the sanitiser.

## The durable fix (not in this PR)

The shim is a compatibility layer, not the end state. The publisher should stop
emitting root-relative asset paths at all. That change lives in the platform
repo — `backend/src/digital_workers/tools/adk/blog_publishing_tool.py` — and is
tracked there, not here. Until it lands, keep this route.
