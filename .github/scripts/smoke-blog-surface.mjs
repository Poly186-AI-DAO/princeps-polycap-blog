#!/usr/bin/env node
/**
 * Post-deploy gate: the L3 check. Does a human, anonymous, get the article?
 *
 * Everything upstream of this can be green while the URL is a stub. Measured on
 * 2026-11-18 (task d721bc20): apex, www, two real slugs and one fabricated slug all
 * returned 200 with an identical 114-byte body, and princeps-polycap-blog.vercel.app
 * returned DEPLOYMENT_NOT_FOUND. A slug that does not exist answering 200 is the
 * tell: it is a catch-all, not a Next.js app.
 *
 * Four assertions, all four were named as the goal's own verification gate:
 *   1. real slug            -> 200, text/html, body >= MIN_HTML_BYTES
 *   2. fabricated slug      -> 404
 *   3. apex                  -> redirects to www
 *   4. hero asset            -> 200 image/* for an ANONYMOUS request
 *
 * (4) is not decoration. Every asset in the published documents is a root-relative
 * /api/local-blobs/... path owned by a different workspace; that route does not exist
 * in this app (404), so a correct deploy still ships a broken hero. Tracked as
 * Poly186-AI-DAO/Poly#1837.
 */
import fs from 'node:fs';

const BASE = (process.env.BLOG_PUBLIC_BASE_URL || 'https://www.princepspolycap.com').replace(/\/+$/, '');
const APEX = (process.env.BLOG_APEX_URL || 'https://princepspolycap.com').replace(/\/+$/, '');
const MIN_HTML_BYTES = Number(process.env.MIN_HTML_BYTES || 5000);
const UA = 'poly-ci-smoke/1.0 (+https://github.com/Poly186-AI-DAO)';

let slugs = [];
try {
  const parsed = JSON.parse(fs.readFileSync('.blog-slugs.json', 'utf8'));
  if (Array.isArray(parsed.slugs) && parsed.slugs.length) slugs = parsed.slugs;
} catch {
  /* no probe output in this job */
}
if (!slugs.length) {
  slugs = (process.env.EXPECTED_BLOG_SLUGS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
if (!slugs.length) {
  console.error('::error title=smoke: nothing to check::No slugs supplied and no .blog-slugs.json.');
  process.exit(1);
}

const results = [];
const record = (check, ok, detail) => {
  results.push({ check, ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${check}  —  ${detail}`;
  ok ? console.log(line) : console.error(line);
};

const request = async (url, { manual = false } = {}) => {
  const res = await fetch(url, {
    redirect: manual ? 'manual' : 'follow',
    headers: { 'user-agent': UA, accept: 'text/html,image/*,*/*' },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    type: (res.headers.get('content-type') || '').toLowerCase(),
    location: res.headers.get('location') || '',
    bytes: buf.length,
    body: buf.toString('utf8'),
  };
};

const safe = async (fn) => {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    return { ok: false, error: err };
  }
};

// ---- 1, 2 per slug: article renders, assets resolve -------------------------
for (const slug of slugs) {
  const url = `${BASE}/blogs/${slug}`;
  const res = await safe(() => request(url));
  if (!res.ok) {
    record(`GET /blogs/${slug}`, false, `request failed: ${res.error.message}`);
    continue;
  }
  const r = res.value;

  record(`GET /blogs/${slug} -> 200`, r.status === 200, `status ${r.status}`);
  record(`/blogs/${slug} content-type html`, r.type.includes('text/html'), `"${r.type || 'none'}"`);
  record(
    `/blogs/${slug} body >= ${MIN_HTML_BYTES}B`,
    r.bytes >= MIN_HTML_BYTES,
    `${r.bytes} bytes${r.bytes < MIN_HTML_BYTES ? ' (a catch-all stub answers ~114B)' : ''}`
  );

  // Hero asset: prefer the next/image optimizer URL, else any absolute image src.
  const optimized = [...r.body.matchAll(/\/_next\/image\?url=([^"'&]+)/g)].map((m) => {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  });
  const absolute = [...r.body.matchAll(/src="(https?:\/\/[^"]+\.(?:png|jpe?g|webp|avif|svg)[^"]*)"/gi)].map(
    (m) => m[1]
  );
  const hero = optimized[0] || absolute[0];

  if (!hero) {
    record(`/blogs/${slug} hero asset present`, false, 'no image src in rendered HTML');
  } else {
    const heroUrl = hero.startsWith('http') ? hero : `${BASE}${hero}`;
    const heroRes = await safe(() => request(heroUrl));
    if (!heroRes.ok) {
      record(`/blogs/${slug} hero asset`, false, `request failed: ${heroRes.error.message}`);
    } else {
      const h = heroRes.value;
      record(
        `/blogs/${slug} hero asset 200 image/* (anonymous)`,
        h.status === 200 && h.type.startsWith('image/'),
        `${h.status} "${h.type || 'none'}" ${h.bytes}B <- ${heroUrl.slice(0, 140)}`
      );
    }
  }
}

// ---- 3: fabricated slug must 404 -------------------------------------------
{
  const fake = `ci-nonexistent-${Date.now().toString(36)}`;
  const res = await safe(() => request(`${BASE}/blogs/${fake}`));
  if (!res.ok) {
    record('fabricated slug -> 404', false, `request failed: ${res.error.message}`);
  } else {
    record(
      'fabricated slug -> 404',
      res.value.status === 404,
      `status ${res.value.status}, ${res.value.bytes}B (200 here means a catch-all, not the app)`
    );
  }
}

// ---- 4: apex redirects to www ---------------------------------------------
{
  const res = await safe(() => request(`${APEX}/blogs/${slugs[0]}`, { manual: true }));
  if (!res.ok) {
    record('apex redirects to www', false, `request failed: ${res.error.message}`);
  } else {
    const r = res.value;
    const redirected = [301, 302, 307, 308].includes(r.status);
    const toWww = /^https?:\/\/www\./i.test(r.location);
    record(
      'apex redirects to www',
      redirected && toWww,
      `${r.status} -> ${r.location || '(no location)'}` +
        (redirected && !toWww ? ' (next.config.js declares this redirect; not observed means the domain is served by something else)' : '')
    );
  }
}

// ---- summary --------------------------------------------------------------
const failed = results.filter((r) => !r.ok);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      '### Live surface smoke test',
      '',
      `Base \`${BASE}\` · apex \`${APEX}\` · ${results.length} check(s), **${failed.length} failed**`,
      '',
      '| result | check | detail |',
      '| --- | --- | --- |',
      ...results.map((r) => `| ${r.ok ? '✅' : '❌'} | ${r.check} | ${r.detail.replace(/\|/g, '\\|')} |`),
      '',
    ].join('\n')
  );
}

console.log(`\nsmoke: ${results.length - failed.length}/${results.length} passed`);

if (failed.length) {
  console.error(
    `::error title=live surface not verified::${failed.length} of ${results.length} checks failed on ${BASE}. ` +
      'The deploy job completed but the article is not reachable by a human, so this is not a live URL. ' +
      failed.map((f) => `${f.check} (${f.detail})`).join('; ')
  );
  process.exit(1);
}

console.log('smoke: live surface verified');
