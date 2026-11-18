#!/usr/bin/env node
/**
 * Post-deploy smoke test. This is the only check that answers the question that
 * actually matters: is there a live URL a human can open?
 *
 * Everything upstream can be green while this fails — that is the whole history of
 * this task. A 200 with a 114-byte body is not a page; it is a catch-all stub, and it
 * answered every path including slugs that do not exist. So this asserts four things
 * that a stub cannot fake:
 *
 *   1. A real published slug returns 200, text/html, and a body far larger than a stub.
 *   2. A fabricated slug returns 404. A catch-all returns 200 here and fails.
 *   3. The apex redirects to www (next.config.js declares it; it was never observed).
 *   4. Every image in the published doc returns 200 image/* to an ANONYMOUS request.
 *
 * Exit 1 on any failure. No skip path.
 */
import fs from 'node:fs';

const SITE = (process.env.SITE_URL || 'https://www.princepspolycap.com').replace(/\/+$/, '');
const APEX = process.env.APEX_URL || 'https://princepspolycap.com';
const MIN_BYTES = Number(process.env.MIN_HTML_BYTES || 5000);
const FAKE_SLUG = 'smoke-test-slug-that-does-not-exist-zzz999';
const UA = 'poly186-deploy-smoke/1.0 (+https://github.com/Poly186-AI-DAO/princeps-polycap-blog)';

const failures = [];
const passes = [];

const get = async (url, opts = {}) => {
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': UA, ...(opts.headers || {}) },
      signal: AbortSignal.timeout(30000),
    });
    const body = opts.readBody === false ? '' : await res.text();
    return { ok: true, status: res.status, headers: res.headers, body, bytes: Buffer.byteLength(body) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

const slugs = (() => {
  if (process.env.SMOKE_SLUGS) return process.env.SMOKE_SLUGS.split(',').map((s) => s.trim()).filter(Boolean);
  try {
    const j = JSON.parse(fs.readFileSync('.blog-slugs.json', 'utf8'));
    return Array.isArray(j.slugs) ? j.slugs : [];
  } catch {
    return [];
  }
})();

if (!slugs.length) {
  console.error('::error title=no slugs to smoke test::.blog-slugs.json is absent or empty. Run the probe first; a smoke test with nothing to test is not a pass.');
  process.exit(1);
}

// --- 1. Real slug renders a real page ---------------------------------------------
const slug = slugs[0];
const page = await get(`${SITE}/blogs/${slug}`);
if (!page.ok) {
  failures.push(`GET /blogs/${slug} — request failed: ${page.error}`);
} else {
  const ctype = page.headers.get('content-type') || '';
  if (page.status !== 200) failures.push(`GET /blogs/${slug} — status ${page.status}, expected 200`);
  if (!ctype.includes('text/html')) failures.push(`GET /blogs/${slug} — content-type "${ctype}", expected text/html`);
  if (page.bytes < MIN_BYTES) {
    failures.push(
      `GET /blogs/${slug} — ${page.bytes} bytes, floor ${MIN_BYTES}. A body this small is a catch-all stub, not an article. ` +
        'The stub answers 200 on every path, so size is the only signal that separates them.'
    );
  }
  if (page.body && !page.body.toLowerCase().includes(slug.toLowerCase().slice(0, 20))) {
    failures.push(`GET /blogs/${slug} — 200 but the body does not mention the slug; wrong page served`);
  }
  if (!failures.length) passes.push(`/blogs/${slug} — 200 text/html, ${page.bytes} bytes`);
}

// --- 2. Fabricated slug must 404 ---------------------------------------------------
const fake = await get(`${SITE}/blogs/${FAKE_SLUG}`, { readBody: false });
if (!fake.ok) {
  failures.push(`GET /blogs/${FAKE_SLUG} — request failed: ${fake.error}`);
} else if (fake.status !== 404) {
  failures.push(
    `GET /blogs/${FAKE_SLUG} — status ${fake.status}, expected 404. A slug that does not exist returned ${fake.status}; ` +
      'the host is answering with a catch-all, so no article URL on it can be trusted.'
  );
} else {
  passes.push(`/blogs/${FAKE_SLUG} — 404 as expected (no catch-all)`);
}

// --- 3. Apex redirects to www ------------------------------------------------------
const apex = await get(`${APEX}/`, { readBody: false });
if (!apex.ok) {
  failures.push(`GET ${APEX}/ — request failed: ${apex.error}`);
} else if (apex.status >= 300 && apex.status < 400) {
  const loc = apex.headers.get('location') || '';
  if (!loc.includes('www.')) failures.push(`${APEX}/ — ${apex.status} to "${loc}", expected a redirect to the www host`);
  else passes.push(`${APEX}/ — ${apex.status} -> ${loc}`);
} else if (apex.status === 200) {
  failures.push(
    `${APEX}/ — 200 instead of a redirect. next.config.js declares a permanent apex->www redirect; serving 200 means ` +
      'this app is not answering on the apex and the request landed on something else.'
  );
} else {
  failures.push(`${APEX}/ — status ${apex.status}`);
}

// --- 4. Images must load for an anonymous reader -----------------------------------
if (page.ok && page.status === 200 && page.body) {
  const urls = [...page.body.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]).slice(0, 6);
  if (!urls.length) {
    failures.push('page rendered but contains no <img> tags — the hero and inline art are missing from the article');
  }
  for (const raw of urls) {
    let abs;
    try {
      abs = new URL(raw, SITE).toString();
    } catch {
      failures.push(`unparseable image src: ${raw}`);
      continue;
    }
    const img = await get(abs, { readBody: false });
    if (!img.ok) {
      failures.push(`image ${abs} — request failed: ${img.error}`);
      continue;
    }
    const ctype = img.headers.get('content-type') || '';
    if (img.status !== 200 || !ctype.startsWith('image/')) {
      failures.push(
        `image ${abs} — ${img.status} "${ctype}", expected 200 image/*. ` +
          'Assets stored as root-relative /api/local-blobs paths resolve against a route this app does not own, ' +
          'so they 401 or 404 for an anonymous reader.'
      );
    } else {
      passes.push(`image ${abs} — 200 ${ctype}`);
    }
  }
}

// --- Report ------------------------------------------------------------------------
const lines = ['### Deploy smoke test', '', `Site: \`${SITE}\``, ''];
if (passes.length) {
  lines.push('Passed:', ...passes.map((p) => `- ${p}`), '');
}
if (failures.length) {
  lines.push('Failed:', ...failures.map((f) => `- ${f}`), '');
}
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));

for (const p of passes) console.log(`  PASS  ${p}`);
for (const f of failures) console.error(`  FAIL  ${f}`);

if (failures.length) {
  console.error(`::error title=live site is not serving the blog::${failures.length} check(s) failed against ${SITE}. See step summary.`);
  process.exit(1);
}

console.log(`smoke: ${passes.length} check(s) passed against ${SITE}`);
