#!/usr/bin/env node
/**
 * Pre-build gate. Fail here, or fail silently later.
 *
 * src/lib/blogs.js getDbBlogs() wraps connectDB() in try/catch and returns [] on any
 * throw. That is reasonable runtime behaviour and terrible CI behaviour: `next build`
 * then exits 0 having prerendered zero /blogs/* routes, and the deploy ships a site
 * whose article URLs are all 404. Green everywhere, nothing live.
 *
 * So: connect, count, assert, and hand the slugs to the build and to the post-deploy
 * smoke test via .blog-slugs.json.
 */
import fs from 'node:fs';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_DATABASE_URL || process.env.MONGODB_URI || '';
const dbName = process.env.MONGODB_DB_NAME || 'PrincepsBlog';
const minPosts = Number(process.env.EXPECTED_MIN_POSTS || 1);

if (!uri) {
  console.error('::error title=MONGODB_DATABASE_URL unset::The probe has nothing to connect to. Set the secret (and the Vercel project env) before arming this gate.');
  process.exit(1);
}

const redact = (u) => {
  try {
    const parsed = new URL(u);
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
  } catch {
    return '<unparseable uri>';
  }
};

console.log(`probe: ${redact(uri)} db=${dbName}`);

let conn;
try {
  conn = await mongoose.createConnection(uri, { dbName, serverSelectionTimeoutMS: 15000 }).asPromise();
  await conn.db.admin().command({ ping: 1 });
} catch (err) {
  console.error(
    `::error title=blog database unreachable::Could not connect to ${redact(uri)} db=${dbName}: ${err.message}. ` +
      'Without this the build prerenders zero posts and the deploy ships 404 article URLs.'
  );
  process.exit(1);
}

let docs = [];
try {
  docs = await conn.db
    .collection('blogs')
    .find({ status: 'published' }, { projection: { slug: 1, title: 1, publishedAt: 1 } })
    .sort({ publishedAt: -1 })
    .toArray();
} catch (err) {
  console.error(`::error title=blogs query failed::db=${dbName} collection=blogs: ${err.message}`);
  await conn.close();
  process.exit(1);
}

const slugs = docs.map((d) => d.slug).filter(Boolean);

console.log(`probe: ${docs.length} published post(s) in ${dbName}.blogs`);
for (const d of docs) console.log(`  - ${d.slug}  (${d.publishedAt ? new Date(d.publishedAt).toISOString() : 'no date'})`);

fs.writeFileSync('.blog-slugs.json', JSON.stringify({ dbName, count: docs.length, slugs }, null, 2));

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      '### Blog database probe',
      '',
      `\`${redact(uri)}\` · db \`${dbName}\` · **${docs.length}** published post(s), floor ${minPosts}`,
      '',
      ...(slugs.length ? slugs.map((s) => `- \`${s}\``) : ['_no published posts_']),
      '',
    ].join('\n')
  );
}

if (docs.length < minPosts) {
  console.error(
    `::error title=no published posts::${dbName}.blogs has ${docs.length} published post(s), floor is ${minPosts}. ` +
      'Building now would prerender zero article routes and deploy a site with no articles. ' +
      'Either publish a post or lower EXPECTED_MIN_POSTS deliberately.'
  );
  await conn.close();
  process.exit(1);
}

await conn.close();
console.log('probe: ok');
