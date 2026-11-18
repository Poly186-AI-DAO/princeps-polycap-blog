# Deploy pipeline facts — this repo (measured 2026-11-18T12:50Z)

Read this before touching anything deploy-related. It corrects a factual error in
`docs/deploy/blog-surface-deployment.md` §2 that would send the next engineer
looking for a deploy path that does not exist here, while the one that does exist
fires on every push and fails.

## 1. Correction: main DOES deploy here

`docs/deploy/blog-surface-deployment.md` §2 carried a table saying this repo's
production trigger is `production.yml` on a `release` branch that does not exist,
and concluded "committing to main deploys nothing."

That table belongs to the **Poly** repo. It was transplanted into this repo and it
is false here.

Measured this session, in `Poly186-AI-DAO/princeps-polycap-blog`:

- `.github/workflows/` contains exactly one file:
  `azure-static-web-apps-brave-pebble-073f29e0f.yml` (blob `a0c97c71`).
- Its triggers are `push: branches: [main]` and `pull_request` against `main`.
- There is no `production.yml` and no `release` branch in this repo.

So every commit to `main` here — including six today at 12:11Z, 12:12Z and
12:29Z — starts an Azure Static Web Apps build-and-deploy. Those runs are red.
The newest green run in the history is `#16` on 2026-05-20. Everything after it
failed. `main` has been deploying nothing but failures for six months, and the
public host has been serving a stale stub the whole time.

## 2. Why the Azure path cannot serve this app as configured

`azure-static-web-apps-brave-pebble-073f29e0f.yml` sets `output_location: ".next"`
for a Next.js app that needs a Node runtime at request time:

- `src/lib/blogs.js` (`ffbb118c`) queries Mongo per request.
- `src/app/blogs/[slug]/page.js` (`bc5348c3`) declares `revalidate = 60` (ISR).
- `next.config.js` (`9134b861`) carries redirects and remote image patterns.

`.next` makes the SWA action upload build output as static content instead of
running the Next.js runtime. A static upload of an SSR app produces exactly the
symptom QA measured: every path, including a fabricated slug, answers with the
same 114-byte body. Separately, Azure Static Web Apps does not implement ISR, so
`revalidate` is not honoured there under any setting.

## 3. Failure position (do not over-claim)

Green runs of this workflow took 5 to 6 minutes (e.g. `#16`, 2026-05-20, 6m27s).
Today's failures complete in 41 to 50 seconds. The failure therefore lands before
the Oryx app build, in the deploy action's own setup.

I could not read the failing step name. The log for run `44304454311` is 40,679
bytes; my reader returns the first 10,000 (the docker-pull preamble) and the
compute sandbox is unreachable, so the tail is out of reach. **Do not repeat the
"stale process / restart the service" hypothesis on the strength of this
document** — that hypothesis is about the Poly backend, not this repo. The next
step for this workflow is a human reading the tail in the Actions UI.

## 4. What shipped with this note

`.github/workflows/deploy-blog-surface.yml` (commit `e4e4395d`) — a Vercel deploy
path that is safe to land before credentials exist:

- Missing `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` → the job emits a
  notice and **skips green**. It does not fail preflight, so it does not turn
  `main` red on every push.
- Credentials present → `vercel pull` → `vercel build --prod` → `vercel deploy
  --prebuilt --prod`, then **two gates**: `scripts/deploy/verify_blog_surface.sh`
  against the deployment URL and against `https://princepspolycap.com`.
- A green run therefore means a live URL was probed and served real content, not
  that a step exited 0.
- `workflow_dispatch` runs the same file with a non-failing probe job that reports
  what apex, `www` and `princepspolycap.vercel.app` are serving right now.

## 5. The one unblock

Provision three repository secrets on `Poly186-AI-DAO/princeps-polycap-blog`:
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and add
`MONGODB_DATABASE_URL` (database `PrincepsBlog`) to the Vercel project's
environment. Then re-run `Deploy blog surface`.

No code change is required. The workflow above is already gated on the surface
actually serving a post, so it cannot report success while the 114-byte stub is
still being served.

## 6. Do not

- Do not re-add `output_location: ".next"` to any Next.js workflow here.
- Do not treat a green Azure SWA run as a live blog surface. It was green for
  months while the site served a stub.
- Do not answer "no live URL" with a restart of the Poly backend. The rows are in
  `PrincepsBlog` (written 12:04Z and 12:10Z); the host is the broken half.
