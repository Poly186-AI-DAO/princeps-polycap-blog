/**
 * Proxy: /api/local-blobs/<workspace-scoped path> -> platform blob API.
 *
 * Why this exists
 * ---------------
 * Published blog documents store every asset as a ROOT-RELATIVE platform path:
 *
 *   hero        /api/local-blobs/workspace-d8849d70-.../creative_studio_2k.jpg
 *   portrait    /api/local-blobs/workspace-d8849d70-.../operator-headshot-suit-cutout.png
 *   lead magnet /api/local-blobs/workspace-a39b2977-.../ai-company-operating-checklist.md
 *
 * On princepspolycap.com those paths resolve against THIS app, which owns no
 * blob storage, so every hero image and every lead-magnet link in a published
 * post 404s. The Mongo rows are correct; the path is missing a host.
 * (Poly#1837 — Code Review turn 12 raised it, DevOps turn 14 confirmed
 * `src/app/api/local-blobs/[...path]/route.js` did not exist.)
 *
 * Fixing this here instead of at publish time means already-published posts
 * heal on deploy — no data migration, no re-publish, no content rewrite.
 *
 * Configuration (Vercel project environment, not repo secrets)
 * ------------------------------------------------------------
 *   POLY_PLATFORM_API_URL   required. Platform host that serves /api/local-blobs,
 *                           no trailing slash, e.g. https://poly186.com
 *   POLY_PLATFORM_API_TOKEN optional bearer, only if that blob route is gated.
 *
 * With POLY_PLATFORM_API_URL unset the route answers 503 with a JSON reason
 * instead of failing silently — a missing env var must be visible, not a 404
 * that looks like a missing file.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = (process.env.POLY_PLATFORM_API_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.POLY_PLATFORM_API_TOKEN || "";

// Blob paths are workspace-scoped filenames. Anything else is not an asset.
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

function buildUpstreamPath(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }
  for (const segment of segments) {
    if (
      !segment ||
      segment === "." ||
      segment === ".." ||
      !SAFE_SEGMENT.test(segment)
    ) {
      return null;
    }
  }
  return `/api/local-blobs/${segments.join("/")}`;
}

async function proxy(request, context) {
  if (!UPSTREAM) {
    console.error("[blob-proxy] POLY_PLATFORM_API_URL is not set; cannot serve blog assets");
    return new Response(
      JSON.stringify({
        error: "POLY_PLATFORM_API_URL is not configured",
        hint:
          "Set POLY_PLATFORM_API_URL in the Vercel project environment to the " +
          "platform host that serves /api/local-blobs.",
      }),
      { status: 503, headers: { "content-type": "application/json" } }
    );
  }

  const segments = (context && context.params && context.params.path) || [];
  const upstreamPath = buildUpstreamPath(segments);
  if (!upstreamPath) {
    return new Response("Not found", { status: 404 });
  }

  const search = new URL(request.url).search || "";
  const method = request.method === "HEAD" ? "HEAD" : "GET";

  const headers = { "user-agent": "princeps-polycap-blog/blob-proxy" };
  const accept = request.headers.get("accept");
  if (accept) {
    headers.accept = accept;
  }
  if (TOKEN) {
    headers.authorization = `Bearer ${TOKEN}`;
  }

  let upstream;
  try {
    upstream = await fetch(`${UPSTREAM}${upstreamPath}${search}`, {
      method,
      headers,
      redirect: "follow",
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      `[blob-proxy] upstream fetch failed for ${upstreamPath}: ${error.message}`
    );
    return new Response("Bad gateway", { status: 502 });
  }

  if (upstream.status === 404) {
    // Pass 404 through unchanged — a genuinely missing asset must look missing.
    // Log it so a wrong POLY_PLATFORM_API_URL is distinguishable from a bad path.
    console.warn(`[blob-proxy] 404 from ${UPSTREAM}${upstreamPath}`);
  } else if (!upstream.ok) {
    console.error(`[blob-proxy] ${upstream.status} from ${UPSTREAM}${upstreamPath}`);
  }

  const responseHeaders = new Headers();
  for (const header of ["content-type", "content-length", "etag", "last-modified"]) {
    const value = upstream.headers.get(header);
    if (value) {
      responseHeaders.set(header, value);
    }
  }
  if (upstream.ok) {
    responseHeaders.set(
      "cache-control",
      "public, max-age=300, stale-while-revalidate=86400"
    );
  }

  if (method === "HEAD" || !upstream.body) {
    return new Response(null, { status: upstream.status, headers: responseHeaders });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request, context) {
  return proxy(request, context);
}

export async function HEAD(request, context) {
  return proxy(request, context);
}
