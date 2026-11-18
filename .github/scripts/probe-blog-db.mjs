#!/usr/bin/env node
/**
 * Pre-build gate: prove the blog database is reachable AND holds the published posts.
 *
 * Why this exists (finding B1, task d721bc20):
 *   src/lib/blogs.js -> getDbBlogs() wraps connectDB() in try/catch and returns [].
 *   src/app/blogs/[slug]/page.js -> generateStaticParams() calls getAllBlogs().
 *   Net effect: with no MONGODB_DATABASE_URL, or an unreachable host, or a database
 *   where nothing is published, `next build` exits 0 having prerendered zero
 *   /blogs/* routes. Green CI, green deploy, every article URL a 404.
 *
 * That silent catch is why a green build and a 404 site were the same colour for a
 * full day. This probe turns it into a named, early, actionable failure, before the
 * build burns five minutes to produce nothing.
 */
import fs from 'node:fs';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_DATABASE_URL;
const dbName =
  process.env.MONGODB_DB_NAME || process.env.COSMOS_DB_DATABASE_NAME || 'PrincepsBlog';
const minPosts = Number(process.env.EXPECTED_MIN_POSTS || 1);
const expected = (process.env.EXPECTED_BLOG_SLUGS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function die(title, detail) {
  console.error(`::error title=${title}::${String(detail).replace(/\s+/g, ' ')}`);
  process.exit(1);
}

if (!uri) {
  die(
    'blog db probe: MONGODB_DATABASE_URL is empty',
    'Without it the site builds green and serves 404s. It must exist in TWO places: ' +
      'repository secret (build gate) and Vercel project Production env (deploy). ' +
      'See .github/workflows/ci.yml header.'
  );
}

let docs = [];
let connErr = null;

try {
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 15000,
    bufferCommands: false,
  });
  docs = await mongoose.connection
    .collection('blogs')
    .find(
      { status: 'published' },
      { projection: { slug: 1, title: 1, publishedAt: 1, target_database: 1 } }
    )
    .sort({ publishedAt: -1 })
    .toArray();
} catch (err) {
  connErr = err;
}

try {
  await mongoose.disconnect();
} catch {
  /* already gone */
}

if (connErr) {
  die(
    'blog db probe: database unreachable',
    `Could not read ${dbName}.blogs: ${connErr.message}. This is precisely the error ` +
      'src/lib/blogs.js swallows, so the build would have gone green.'
  );
}

const slugs = docs.map((d) => d.slug).filter(Boolean);

// Machine-readable handoff for the post-build assertion and the smoke test.
fs.writeFileSync(
  '.blog-slugs.json',
  JSON.stringify({ dbName, count: slugs.length, slugs }, null, 2)
);

const rows = docs
  .slice(0, 25)
  .map((d) => `| \`${d.slug}\` | ${d.title || ''} | ${d.publishedAt ? new Date(d.publishedAt).toISOString() : '—'} | \`${d.target_database || dbName}\` |`)
  .join('\n');

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      '### Blog DB probe',
      '',
      `Database \`${dbName}\` · collection \`blogs\` · status \`published\` · **${slugs.length} row(s)**`,
      '',
      '| slug | title | publishedAt | target_database |',
      '| --- | --- | --- | --- |',
      rows || '| — | — | — | — |',
      '',
    ].join('\n')
  );
}

console.log(`blog db probe: ${dbName}.blogs published = ${slugs.length}`);
console.log(`slugs: ${slugs.join(', ') || '(none)'}`);

if (slugs.length < minPosts) {
  die(
    'blog db probe: database has no published posts',
    `${dbName}.blogs returned ${slugs.length} published row(s), minimum is ${minPosts}. ` +
      'The build would have succeeded and shipped a site with zero article routes.'
  );
}

const missing = expected.filter((s) => !slugs.includes(s));
if (missing.length) {
  die(
    'blog db probe: expected slugs absent',
    `${dbName}.blogs is missing [${missing.join(', ')}]. The DB resolved but it is not the ` +
      'database those posts were written to — check the portfolio -> blog DB mapping and ' +
      'MONGODB_DB_NAME before deploying.'
  );
}

console.log('blog db probe: OK');
