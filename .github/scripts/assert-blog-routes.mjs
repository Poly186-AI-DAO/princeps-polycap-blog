#!/usr/bin/env node
/**
 * Post-build gate (review finding B1).
 *
 * `next build` exits 0 even when generateStaticParams() returned [] because the DB
 * was unreachable — the catch in getDbBlogs() hides it. The build log looks fine, the
 * deploy is green, and every article URL 404s. That is precisely how a publication
 * count climbed while zero URLs were live.
 *
 * This asserts that article routes actually exist in the build output. Several
 * detectors, because Next's on-disk layout differs between app-router versions and
 * between `next build` and `vercel build`; one positive is enough to pass, but the
 * absence of a build directory is a hard failure rather than a pass.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const missing = [];
const found = [];

const exists = (p) => {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
};

const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

const walk = (dir, depth = 0, acc = []) => {
  if (depth > 8 || !exists(dir)) return acc;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, depth + 1, acc);
    else acc.push(full);
  }
  return acc;
};

// 1. Build output must exist at all.
const buildDirs = ['.next', '.vercel/output'].filter((d) => exists(path.join(ROOT, d)));
if (buildDirs.length === 0) {
  console.error(
    '::error title=no build output::Neither .next/ nor .vercel/output/ exists. The build did not run, so there is nothing to assert. This is a failure, not a skip.'
  );
  process.exit(1);
}

// 2. Detector: prerender manifest route keys.
for (const rel of ['.next/prerender-manifest.json', '.next/server/app-paths-manifest.json', '.next/app-path-routes-manifest.json']) {
  const manifest = readJson(path.join(ROOT, rel));
  if (!manifest) continue;
  const keys = Object.keys(manifest).concat(Object.keys(manifest.routes || {}), Object.keys(manifest.dynamicRoutes || {}));
  const hits = keys.filter((k) => /(^|\/)blogs\/[^/]+\/?$/.test(k) || k.startsWith('/blogs/'));
  if (hits.length) found.push(`${rel}: ${hits.length} route(s), e.g. ${hits.slice(0, 3).join(', ')}`);
}

// 3. Detector: emitted HTML for prerendered app-router pages.
for (const dir of ['.next/server/app/blogs', '.vercel/output/static/blogs']) {
  const abs = path.join(ROOT, dir);
  if (!exists(abs)) continue;
  const html = fs.readdirSync(abs).filter((f) => f.endsWith('.html'));
  if (html.length) found.push(`${dir}: ${html.length} prerendered page(s), e.g. ${html.slice(0, 3).join(', ')}`);
}

// 4. Detector: ISR cache entries, one per prerendered slug.
const isrCache = path.join(ROOT, '.next/server/app/blogs');
if (exists(isrCache)) {
  const files = walk(isrCache);
  if (files.length) found.push(`.next/server/app/blogs: ${files.length} build artifact(s)`);
}

// 5. Detector: pages-router fallback.
const pagesBlogs = ['.next/server/pages/blogs', '.next/server/pages/blog'];
for (const dir of pagesBlogs) {
  const abs = path.join(ROOT, dir);
  if (!exists(abs)) continue;
  const files = fs.readdirSync(abs).filter((f) => /\.(html|js|json)$/.test(f));
  if (files.length) found.push(`${dir}: ${files.length} page artifact(s)`);
}

// 6. Cross-check against the slugs the probe actually read from the DB.
const probed = readJson(path.join(ROOT, '.blog-slugs.json'));
const probedSlugs = probed && Array.isArray(probed.slugs) ? probed.slugs : [];

if (probedSlugs.length) {
  const allFiles = buildDirs.flatMap((d) => walk(path.join(ROOT, d)));
  const absent = probedSlugs.filter((slug) => !allFiles.some((f) => f.includes(slug)));
  if (absent.length) {
    missing.push(`probe read ${probedSlugs.length} published slug(s) but the build contains no artifact for: ${absent.join(', ')}`);
  } else {
    found.push(`all ${probedSlugs.length} probed slug(s) present in build output`);
  }
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = ['### Build route assertion', ''];
  lines.push(found.length ? 'Detected:' : 'Detected: **nothing**');
  for (const f of found) lines.push(`- ${f}`);
  if (missing.length) {
    lines.push('', 'Missing:');
    for (const m of missing) lines.push(`- ${m}`);
  }
  lines.push('');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
}

if (missing.length) {
  console.error(`::error title=prerender gap::${missing.join(' | ')}`);
  process.exit(1);
}

if (!found.length) {
  console.error(
    '::error title=zero article routes in build::The build succeeded but contains no /blogs/<slug> route. ' +
      'generateStaticParams() almost certainly returned [] because the DB was unreachable or empty. ' +
      'Deploying this ships a site whose article URLs are 404. Fix the DB connection, do not relax this check.'
  );
  process.exit(1);
}

console.log('assert: article routes present');
for (const f of found) console.log(`  - ${f}`);
