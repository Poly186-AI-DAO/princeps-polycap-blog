#!/usr/bin/env node
/**
 * backfill_published_at.mjs
 *
 * REPAIR, not a diagnosis. Idempotent.
 *
 * WHY THIS EXISTS
 *   BlogSchema (src/models/Blog.js) declares:
 *       publishedAt: { type: Date }        // no required, no default
 *   so a blog can be status='published' with publishedAt absent. Mongoose
 *   does not reject it, the writer does not set it, and the read path that
 *   sorts by publishedAt either drops the row or renders a null date.
 *   Restarting the publishing service does not fix a row that was written
 *   without the field.
 *
 * WHAT IT DOES
 *   For every doc in <db>.blogs where status === 'published' AND
 *   (publishedAt is null OR absent), set publishedAt to a deterministic
 *   timestamp derived from updatedAt -> createdAt -> now.
 *
 * WHAT IT REFUSES TO DO
 *   - never sets status. A draft stays a draft. Publishing is a human /
 *     publisher decision, not a migration's.
 *   - never inserts or deletes.
 *   - never touches docs that already have a publishedAt.
 *
 * USAGE
 *   node scripts/repair/backfill_published_at.mjs \
 *     --uri "$MONGO_URI" --db PrincepsBlog            # dry run, prints plan
 *   node scripts/repair/backfill_published_at.mjs \
 *     --uri "$MONGO_URI" --db PrincepsBlog --apply    # writes
 *
 * VERIFICATION (run after --apply, expect 0):
 *   db.blogs.countDocuments({
 *     status: 'published',
 *     $or: [{ publishedAt: null }, { publishedAt: { $exists: false } }]
 *   })
 *
 *   And confirm nothing else moved:
 *   db.blogs.countDocuments({ status: 'draft' })   // unchanged before/after
 */

import mongoose from 'mongoose';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const URI = arg('--uri', process.env.MONGO_URI);
const DB = arg('--db', process.env.BLOG_DB_NAME || 'PrincepsBlog');
const APPLY = argv.includes('--apply');
const LIMIT = parseInt(arg('--limit', '0'), 10);

if (!URI) {
  console.error('FATAL: no --uri and no MONGO_URI in env. Refusing to guess a database.');
  process.exit(2);
}

// Absent OR explicitly null. A real Date is never in this predicate.
const PREDICATE = {
  status: 'published',
  $or: [{ publishedAt: null }, { publishedAt: { $exists: false } }],
};

const pickTimestamp = (doc) => doc.updatedAt || doc.createdAt || new Date();

const main = async () => {
  await mongoose.connect(URI, { dbName: DB, serverSelectionTimeoutMS: 15000 });
  // Raw collection: a migration must not run through Mongoose casting, or the
  // schema default could mask exactly the drift we are repairing.
  const coll = mongoose.connection.db.collection('blogs');

  const total = await coll.countDocuments({});
  const published = await coll.countDocuments({ status: 'published' });
  const defective = await coll.countDocuments(PREDICATE);

  console.log(`db=${DB} collection=blogs`);
  console.log(`  total documents      : ${total}`);
  console.log(`  status='published'   : ${published}`);
  console.log(`  DEFECTIVE (pub+null) : ${defective}`);
  console.log(`  mode                 : ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}`);

  if (total === 0) {
    console.log('\n  collection is EMPTY. This database is not the publish surface.');
    console.log('  An empty blogs collection here means the publisher is writing to a');
    console.log('  different database, or not writing at all. That is the finding.');
    await mongoose.disconnect();
    return;
  }

  let cursor = coll.find(PREDICATE, {
    projection: { _id: 1, slug: 1, title: 1, updatedAt: 1, createdAt: 1 },
  });
  if (LIMIT > 0) cursor = cursor.limit(LIMIT);

  const rows = await cursor.toArray();
  let written = 0;
  let failed = 0;

  for (const doc of rows) {
    const ts = pickTimestamp(doc);
    const label = doc.slug || doc.title || String(doc._id);
    if (!APPLY) {
      console.log(`  would set publishedAt=${ts.toISOString()}  ${label}`);
      continue;
    }
    // Guarded update: re-assert the predicate so a concurrent publisher that
    // set publishedAt between the read and the write is never overwritten.
    const res = await coll.updateOne(
      { _id: doc._id, $or: [{ publishedAt: null }, { publishedAt: { $exists: false } }] },
      { $set: { publishedAt: ts } }
    );
    if (res.modifiedCount === 1) {
      written += 1;
      console.log(`  set publishedAt=${ts.toISOString()}  ${label}`);
    } else {
      failed += 1;
      console.log(`  SKIP (already set concurrently)      ${label}`);
    }
  }

  const residual = await coll.countDocuments(PREDICATE);
  console.log('\n  ---');
  console.log(`  matched            : ${rows.length}`);
  console.log(`  written            : ${written}`);
  console.log(`  skipped/failed     : ${failed}`);
  console.log(`  residual after run : ${residual}   ${residual === 0 ? 'OK' : 'INCOMPLETE'}`);
  if (!APPLY && rows.length > 0) console.log('  re-run with --apply to write.');

  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error('FATAL:', err.message);
  try { await mongoose.disconnect(); } catch { /* already down */ }
  process.exit(1);
});
