#!/usr/bin/env node
/**
 * Post-build gate: prove the build actually produced /blogs/<slug> pages.
 *
 * generateStaticParams() -> getAllBlogs() -> getDbBlogs() -> catch { return [] }
 *
 * When that catch fires the build exits 0 and prerenders nothing. Nothing downstream
 * notices: Vercel deploys, the domain returns 200, and every article URL is a 404.
 * That is "green and empty", the failure mode of task d721bc20.
 *
 * This assertion lives at the WORKFLOW boundary on purpose. Putting a throw inside
 * the app would also work, but a boundary assertion cannot be defeated by a silent
 * catch added later, and it does not require an app-code change to keep it honest.
 *
 * Works against both build outputs:
 *   .next/server/app/blogs/<slug>.html        (plain `next build`)
 *   .vercel/output/static/blogs/<slug>.html   (`vercel build --prebuilt`)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['.next/server/app/blogs', '.vercel/output/static/blogs'];
const MANIFESTS = ['.next/prerender-manifest.json', '.next/app-path-routes-manifest.json'];

const found = new Set();

const addRoute = (route) => {
  if (typeof route !== 'string' || !route.startsWith('/blogs/')) return;
  const slug = route.replace(/^\/blogs\//, '').replace(/\/$/, '');
  if (!slug || slug.includes('[') || slug.includes('/')) return; // skip the dynamic template
  found.add(slug);
};

for (const manifest of MANIFESTS) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  } catch {
    continue;
  }
  for (const [key, value] of Object.entries(json)) {
    if (key === 'routes' || key === 'dynamicRoutes') {
      Object.keys(value || {}).forEach(addRoute);
    } else if (typeof value === 'string') {
      addRoute(value);
    } else if (value && typeof value === 'object') {
      Object.keys(value).forEach(addRoute);
    }
  }
}

const walkHtml = (dir, base) => {
  let out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out = out.concat(walkHtml(full, base));
    } else if (entry.name.endsWith('.html')) {
      const rel = '/' + path.relative(base, full).split(path.sep).join('/');
      out.push(rel.replace(/\.html$/, '').replace(/\/index$/, ''));
    }
  }
  return out;
};

for (const root of ROOTS) {
  const dir = path.resolve(root);
  if (!fs.existsSync(dir)) continue;
  walkHtml(dir, path.dirname(dir)).forEach(addRoute);
}

const slugs = [...found].sort();

// Expected set: the probe's DB read if we ran one, else the configured list.
let expected = [];
try {
  const parsed = JSON.parse(fs.readFileSync('.blog-slugs.json', 'utf8'));
  if (Array.isArray(parsed.slugs) && parsed.slugs.length) expected = parsed.slugs;
} catch {
  /* no probe output in this job */
}
if (!expected.length) {
  expected = (process.env.EXPECTED_BLOG_SLUGS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const missing = expected.filter((s) => !slugs.includes(s));

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      '### Prerendered blog routes',
      '',
      `Found **${slugs.length}** static \`/blogs/*\` route(s).`,
      '',
      slugs.length
        ? slugs.slice(0, 40).map((s) => `- \`/blogs/${s}\``).join('\n')
        : '_none_',
      '',
      expected.length ? `Expected (${expected.length}): ${expected.map((s) => `\`${s}\``).join(', ')}` : '',
      missing.length ? `**Missing:** ${missing.map((s) => `\`${s}\``).join(', ')}` : '',
      '',
    ].join('\n')
  );
}

console.log(`prerendered /blogs/* routes: ${slugs.length}`);
if (slugs.length) console.log(slugs.slice(0, 40).join('\n'));

if (!slugs.length) {
  console.error(
    '::error title=green and empty::Build produced 0 prerendered /blogs/* routes. ' +
      'getDbBlogs() returned an empty list, so the site would deploy and serve a 404 at ' +
      'every article URL. Check the probe-blog-db step above and MONGODB_DATABASE_URL in ' +
      'the Vercel project Production env.'
  );
  process.exit(1);
}

if (missing.length) {
  console.error(
    `::error title=published posts missing from build::Build prerendered ${slugs.length} ` +
      `blog route(s) but not [${missing.join(', ')}]. Those posts exist in the database and ` +
      'would be unreachable on the live site.'
  );
  process.exit(1);
}

console.log('blog route assertion: OK');
