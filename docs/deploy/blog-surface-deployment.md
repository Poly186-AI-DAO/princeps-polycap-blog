# Blog surface: why no URL is live, and the deploy path out

Status: measured 2026-11-18T12:26Z. Supersedes the "restart the service" remedy in escalation `506d4e80`.
Owner: DevOps. Read this before touching the publish valve again.

## 1. What is actually true

The publish valve works. The surface is not deployed.

| Fact | Evidence |
|---|---|
| Two posts are persisted in `PrincepsBlog` | `running-an-ai-company-on-a-clock` (3003 words, 12:04:36Z), `an-attempt-produces-the-specification` (3610 words, 12:10:04Z), both `status: published`, `portfolio_id: 53fb2b9b-...::1.0` |
| The site would render them if deployed | `src/lib/blogs.js` queries at request time; `src/app/blogs/[slug]/page.js` sets `revalidate = 60` |
| No deployment is serving the app | apex `/`, `www`, and every `/blogs/*` path return **200 with an identical 114-byte body**; `princepspolycap.vercel.app` returns **404 DEPLOYMENT_NOT_FOUND** |
| A fabricated slug renders identically to a real post | `/blogs/slug-that-does-not-exist-zzz999` → 200, 114 bytes |

A 114-byte catch-all that answers a nonexistent slug is not a Next.js app. It is a stub. Rows are real (L2); URLs are not (L3 false).

## 2. Why the existing pipeline cannot produce a live URL

| Workflow | Trigger | Effect on this repo |
|---|---|---|
| `production.yml` | `push` to `release` only | this repo's default branch is `main`; no `release` branch exists |
| `build-and-push-*.yml` | `workflow_call` only | never fires standalone |
| `ci-quality-checks.yml` | PRs + master pushes filtered to `k8s/**` | no application test runs here |

Consequence: **committing to `main` in this repo deploys nothing.** The repo holds the app source; the deployable artifact is a Vercel deployment, and nothing in this repo creates one.

This is why the 06:17Z escalation was unexecutable as written. A restart reloads a map in a process that is not running the app being described.

## 3. Required secrets

Two-step pattern: the secret must exist in the hosting environment **and** be referenced by the workflow. One without the other fails silently.

| Secret | Where it comes from | Required by |
|---|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens (scoped to the Poly186 team) | deploy workflow |
| `VERCEL_ORG_ID` | Vercel → Project → Settings → General | deploy workflow |
| `VERCEL_PROJECT_ID` | Vercel → Project → Settings → General | deploy workflow |
| `MONGODB_DATABASE_URL` | existing; must point at the `PrincepsBlog` database | Vercel **runtime** env, not the build |

`MONGODB_DATABASE_URL` is the one that bites: it is a *runtime* dependency of `src/lib/mongodb.js`. If it is set as a Build env var only, the deployment succeeds and every page 500s at request time. Verify it is present under the project's **Production** environment, not just Preview.

## 4. The workflow to add

Deliberately **not** committed to `main` yet. Installed today it would fail preflight on every push and turn `main` red before the secrets exist. Add it once §3 is satisfied.

```yaml
name: Deploy blog surface

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-blog-${{ github.ref }}
  cancel-in-progress: true

jobs:
  preflight:
    runs-on: ubuntu-latest
    steps:
      - name: Require deploy credentials
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          missing=""
          for v in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID; do
            eval "val=\$$v"
            [ -z "$val" ] && missing="$missing $v"
          done
          if [ -n "$missing" ]; then
            echo "::error::Missing deploy credentials:$missing"
            echo "See docs/deploy/blog-surface-deployment.md section 3."
            exit 1
          fi

  deploy:
    needs: preflight
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Pull Vercel environment
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: npx --yes vercel@latest pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: npx --yes vercel@latest build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy
        id: deploy
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          url=$(npx --yes vercel@latest deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> "$GITHUB_OUTPUT"

      - name: Verify the surface actually serves a post
        run: |
          chmod +x scripts/deploy/verify_blog_surface.sh
          scripts/deploy/verify_blog_surface.sh "${{ steps.deploy.outputs.url }}"

      - name: Smoke-test the apex host
        run: |
          chmod +x scripts/deploy/verify_blog_surface.sh
          scripts/deploy/verify_blog_surface.sh "https://princepspolycap.com"
```

## 5. Verification gate

`scripts/deploy/verify_blog_surface.sh <base-url> [slug]` exits:

| exit | meaning | action |
|---|---|---|
| 0 | real post served, fabricated slug did not match it | done |
| 1 | catch-all stub, or body under `MIN_REAL_BYTES` | nothing is deployed; do not report a live URL |
| 2 | real post path not 200 | rows exist but the surface is not rendering them |
| 3 | host did not answer | DNS / hostname problem |

Run it against the deployment URL **and** the apex. A green deployment URL with a stubbed apex means DNS still points at the old host.

## 6. Rollback

`vercel rollback <deployment-url>` (or `vercel promote <previous>`). This is a static-ish Next.js site reading Mongo at request time, so a rollback does not risk data: no migrations, no schema changes, no writes on deploy.

## 7. What not to do

- Do not answer a publish failure with "wait for the deploy" or "restart the service." Neither has ever been the cause. Verify with: publish → non-null `blog_id` → row in `list_recent_blogs` → HTTP 200 with a body over `MIN_REAL_BYTES`.
- Do not treat a green workflow as a live URL. The verification step above is the only evidence that counts.
- Do not map a portfolio to a database name and call the surface "reachable." A string is not a deployment.
