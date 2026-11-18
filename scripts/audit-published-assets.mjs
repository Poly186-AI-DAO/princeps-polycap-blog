#!/usr/bin/env node
// audit-published-assets.mjs — READ-ONLY. Writes nothing, ever.
//
// Reports which blog documents still carry ROOT-RELATIVE platform asset paths
// (`/api/local-blobs/...`) instead of absolute URLs. Those documents render with
// a broken hero, broken inline images and dead lead-magnet links on the brand
// host, because the brand host owns no such route. See
// docs/deploy/blog-asset-origin.md.
//
// Usage:
//   MONGODB_DATABASE_URL='<uri>' node scripts/audit-published-assets.mjs
//   MONGODB_DATABASE_URL='<uri>' node scripts/audit-published-assets.mjs --db PrincepsBlog
//   MONGODB_DATABASE_URL='<uri>' node scripts/audit-published-assets.mjs --status published
//
// Exit codes:
//   0 — audit ran (regardless of how many documents are affected)
//   2 — no connection string, or the database could not be reached
//
// It deliberately does NOT fail the build on affected documents: an audit that
// goes red on known-bad data gets ignored, and this one exists to produce a
// count a human can act on.

import mongodb from 'mongodb';

const { MongoClient } = mongodb;

// Matches `/api/local-blobs/` only when it is NOT already part of a URL
// (i.e. not preceded by a scheme/host character). Absolute asset URLs are fine.
const RELATIVE_REF = /(?<![\w.:/])\/api\/local-blobs\//g;

const USAGE = [
  'usage: node scripts/audit-published-assets.mjs [--db <name>] [--status <status>] [--limit <n>]',
  '',
  'env:   MONGODB_DATABASE_URL (or MONGODB_URI)',
].join('\n');

function parseArgs(argv) {
  const opts = { db: null, status: null, limit: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--db' && next) { opts.db = next; i += 1; }
    else if (arg.startsWith('--db=')) { opts.db = arg.slice('--db='.length); }
    else if (arg === '--status' && next) { opts.status = next; i += 1; }
    else if (arg.startsWith('--status=')) { opts.status = arg.slice('--status='.length); }
    else if (arg === '--limit' && next) { opts.limit = Number.parseInt(next, 10) || 0; i += 1; }
    else if (arg.startsWith('--limit=')) { opts.limit = Number.parseInt(arg.slice('--limit='.length), 10) || 0; }
    else if (arg === '--help' || arg === '-h') { console.log(USAGE); process.exit(0); }
  }
  return opts;
}

function dbNameFromUri(uri) {
  try {
    const parsed = new URL(uri);
    const name = parsed.pathname.replace(/^\//, '');
    return name || null;
  } catch {
    return null;
  }
}

function countRefs(value) {
  if (typeof value !== 'string' || value.length === 0) return 0;
  const hits = value.match(RELATIVE_REF);
  return hits ? hits.length : 0;
}

function inspect(doc) {
  const findings = [];
  const hero = countRefs(doc?.image?.url);
  if (hero > 0) findings.push(`image.url x${hero}`);
  const og = countRefs(doc?.seo?.ogImage) + countRefs(doc?.ogImage);
  if (og > 0) findings.push(`ogImage x${og}`);
  const body = countRefs(doc?.content);
  if (body > 0) findings.push(`content x${body}`);
  return findings;
}

function truncate(value, width) {
  const text = String(value ?? '');
  return text.length > width ? `${text.slice(0, width - 1)}…` : text;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const uri = process.env.MONGODB_DATABASE_URL || process.env.MONGODB_URI;

  if (!uri) {
    console.error('No connection string. Set MONGODB_DATABASE_URL (or MONGODB_URI).');
    console.error(USAGE);
    process.exit(2);
  }

  const dbName = opts.db || dbNameFromUri(uri) || 'PrincepsBlog';
  const query = opts.status ? { status: opts.status } : {};

  let client;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('blogs');

    let cursor = collection.find(query, {
      projection: { slug: 1, title: 1, status: 1, image: 1, seo: 1, ogImage: 1, content: 1 },
      sort: { publishedAt: -1 },
    });
    if (opts.limit > 0) cursor = cursor.limit(opts.limit);

    const docs = await cursor.toArray();
    const rows = docs.map((doc) => ({ doc, findings: inspect(doc) }));
    const affected = rows.filter((row) => row.findings.length > 0);

    console.log(`database: ${dbName}   documents: ${docs.length}   filter: ${JSON.stringify(query)}`);
    console.log('');

    if (docs.length === 0) {
      console.log('No documents matched. Either the DB name is wrong or nothing is published here.');
    } else {
      console.log('slug'.padEnd(52) + 'status'.padEnd(12) + 'relative asset refs');
      console.log('-'.repeat(96));
      for (const { doc, findings } of rows) {
        console.log(
          truncate(doc.slug, 50).padEnd(52) +
          truncate(doc.status, 10).padEnd(12) +
          (findings.length === 0 ? 'none' : findings.join(', '))
        );
      }
      console.log('-'.repeat(96));
      console.log(`affected: ${affected.length} of ${docs.length}`);
    }

    console.log('');
    if (affected.length > 0) {
      console.log('These documents will render with broken images/links on the brand host.');
      console.log('Interim: BLOG_ASSET_ORIGIN arms the /api/local-blobs shim (docs/deploy/blog-asset-origin.md).');
      console.log('Durable: the publisher must emit absolute asset URLs — platform repo, not this one.');
    } else {
      console.log('No root-relative asset paths found.');
    }
  } catch (error) {
    console.error(`Audit failed: ${error && error.message ? error.message : error}`);
    process.exit(2);
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}

main();
