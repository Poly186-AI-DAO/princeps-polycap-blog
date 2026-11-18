// GET /api/local-blobs/<container>/<blob...>
//
// Why this route exists
// ---------------------
// Every published document in PrincepsBlog stores its assets as ROOT-RELATIVE
// platform paths, e.g.
//
//   image.url = "/api/local-blobs/workspace-d8849d70-.../creative_studio_2k.jpg"
//   content   = "... ![portrait](/api/local-blobs/workspace-d8849d70-.../x.png) ..."
//
// src/lib/blogs.js (ffbb118c) assigns `image.url` to `src` verbatim, so the
// browser requests that path from the BRAND host. This app owns no such route
// (`src/app/api/local-blobs/[...path]/route.js` returned 404 before this file),
// so a correctly deployed post shipped a broken hero image, a broken inline
// portrait and a dead lead-magnet link. Deploying the surface was necessary but
// not sufficient.
//
// This route is the shim: it forwards those legacy relative paths to the
// platform origin that actually owns /api/local-blobs/. It fixes the rows that
// are already published without rewriting any document, and it keeps working
// for publishes that still emit relative paths.
//
// Configuration: BLOG_ASSET_ORIGIN — the origin of the platform API that owns
// /api/local-blobs/ (scheme + host, e.g. https://api.example.com). Set it in the
// Vercel PROJECT environment (the deploy workflow pulls project env into the
// build), not in repo secrets. Unset => this route answers 404 with the reason,
// which is exactly what the surface did before, so it cannot regress.
//
// Security: only a validated path is forwarded, and the target host is taken
// from the env var only — never from the request. No open redirect.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ORIGIN_ENV = 'BLOG_ASSET_ORIGIN';
const CACHE_CONTROL = 'public, max-age=600';

function resolveOrigin() {
  const raw = process.env[ORIGIN_ENV];
  if (!raw) return null;
  let parsed;
  try {
    parsed = new URL(String(raw).trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  return parsed.origin; // path/query from the env value are discarded
}

function safeSegments(input) {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out = [];
  for (const segment of input) {
    if (typeof segment !== 'string' || segment.length === 0) return null;
    let decoded;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return null;
    }
    if (decoded.length === 0) return null;
    if (decoded === '.' || decoded === '..') return null;
    if (decoded.includes('/') || decoded.includes('\\') || decoded.includes('\u0000')) return null;
    out.push(encodeURIComponent(decoded));
  }
  return out;
}

export async function GET(request, context) {
  // Next 14 passes params as an object, Next 15 passes a Promise. `await` on a
  // non-thenable resolves to itself, so this works on both.
  const params = await (context && context.params);
  const segments = safeSegments(params && params.path);

  if (!segments) {
    return NextResponse.json(
      { error: 'invalid_asset_path', detail: 'Expected /api/local-blobs/<container>/<blob>' },
      { status: 400 }
    );
  }

  const origin = resolveOrigin();
  if (!origin) {
    return NextResponse.json(
      {
        error: 'asset_origin_not_configured',
        detail:
          `Published posts reference root-relative /api/local-blobs/ paths. ` +
          `Set ${ORIGIN_ENV} to the platform origin that serves /api/local-blobs/ ` +
          `(Vercel project env, production scope).`,
      },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const target = new URL(`/api/local-blobs/${segments.join('/')}`, origin);
  const incoming = new URL(request.url);
  target.search = incoming.search;

  return NextResponse.redirect(target, {
    status: 307,
    headers: { 'Cache-Control': CACHE_CONTROL },
  });
}
