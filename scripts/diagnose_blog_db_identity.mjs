#!/usr/bin/env node
/**
 * Diagnostic: blog DB identity + write contract
 * Owner: Database Engineer.   READ-ONLY — writes nothing, creates nothing.
 *
 * THE QUESTION THIS ANSWERS
 *   Does the application that PUBLISHES and the application that READS agree
 *   on a database, and does a published document satisfy the reader's filter?
 *
 * THE SEAM
 *   Writer (Poly platform Python): PORTFOLIO_BLOG_DB_MAP -> literal "PrincepsBlog"
 *   Reader (this repo, src/lib/mongodb.js @ e7628bcb):
 *       getDbName() = MONGODB_DB_NAME || COSMOS_DB_DATABASE_NAME || 'PrincepsBlog'
 *
 *   Two applications, two independent derivations, no assertion anywhere that
 *   they resolve to the same database. src/lib/blogs.js catches every read
 *   error and returns [], so a wrong-database read is indistinguishable from
 *   an empty collection.
 *
 * READER CONTRACT (src/lib/blogs.js @ ffbb118c, src/models/Blog.js @ bc33a659)
 *   Visible on the site  <=>  status === 'published'      (the only gate)
 *   Sorted by            <=>  publishedAt desc            (null sorts last)
 *   Routable at          <=>  slug unique + non-empty
 *   Rendered from        <=>  title, description, content, author all present
 *                            (all four are required:true in the schema)
 *
 * USAGE
 *   node scripts/diagnose_blog_db_identity.mjs
 */

import mongoose from 'mongoose';

const COLLECTION = 'blogs';
const WRITER_LITERAL = 'PrincepsBlog'; // value in PORTFOLIO_BLOG_DB_MAP

const getDbName = () =>
  process.env.MONGODB_DB_NAME ||
  process.env.COSMOS_DB_DATABASE_NAME ||
  'PrincepsBlog';

const line = (c = '=') => c.repeat(72);

function verdict(name, detail) {
  return { name, detail };
}

/** Count documents in one database's blogs collection, or null if absent. */
async function inspectDb(client, dbName) {
  const db = client.db(dbName);
  const names = (await db.listCollections({ name: COLLECTION }).toArray()).map((c) => c.name);
  if (names.length === 0) return null;

  const col = db.collection(COLLECTION);
  const total = await col.countDocuments();
  const published = await col.countDocuments({ status: 'published' });
  const draft = await col.countDocuments({ status: 'draft' });
  const archived = await col.countDocuments({ status: 'archived' });
  const missingStatus = await col.countDocuments({ status: { $exists: false } });
  const nullPublishedAt = await col.countDocuments({
    status: 'published',
    $or: [{ publishedAt: null }, { publishedAt: { $exists: false } }],
  });
  // Documents that look like platform writes (carry Poly-side fields).
  const platformWritten = await col.countDocuments({
    $or: [{ portfolio_id: { $exists: true } }, { user_id: { $exists: true } }],
  });

  const newest = await col
    .find({ status: 'published' })
    .sort({ publishedAt: -1 })
    .limit(1)
    .toArray();

  const indexes = (await col.indexes().catch(() => [])).map((i) => i.name);

  return {
    dbName,
    total, published, draft, archived, missingStatus,
    nullPublishedAt, platformWritten, newest, indexes,
  };
}

async function main() {
  const uri = process.env.MONGODB_DATABASE_URL;
  if (!uri) {
    console.error('FATAL: MONGODB_DATABASE_URL is not set.');
    process.exit(1);
  }

  const readerDb = getDbName();

  console.log(line());
  console.log('Blog DB identity + write contract diagnostic');
  console.log(line());
  console.log('\n[1] Name resolution');
  console.log(`    MONGODB_DB_NAME            = ${process.env.MONGODB_DB_NAME ?? '(unset)'}`);
  console.log(`    COSMOS_DB_DATABASE_NAME    = ${process.env.COSMOS_DB_DATABASE_NAME ?? '(unset)'}`);
  console.log(`    reader resolved getDbName()= ${readerDb}`);
  console.log(`    writer literal (map value) = ${WRITER_LITERAL}`);
  console.log(`    agreement                  = ${readerDb === WRITER_LITERAL ? 'YES' : 'NO  <-- SPLIT'}`);

  // Connect without forcing dbName so we can enumerate.
  await mongoose.connect(uri, { bufferCommands: false });
  const client = mongoose.connection.getClient();

  console.log('\n[2] Cluster inventory');
  const all = (await client.db('admin').admin().listDatabases()).databases
    .map((d) => d.name)
    .filter((n) => !['admin', 'local', 'config'].includes(n));
  console.log(`    databases: ${all.join(', ') || '(none)'}`);

  const found = [];
  for (const dbName of all) {
    const info = await inspectDb(client, dbName);
    if (info) found.push(info);
  }

  if (found.length === 0) {
    console.log('\n    No database on this cluster holds a `blogs` collection.');
    console.log('    => the writer has never landed a document on THIS cluster.');
    console.log('    => check MONGODB_DATABASE_URL points at the cluster the publisher writes to.');
    await mongoose.disconnect();
    return;
  }

  console.log('\n[3] blogs collection, per database');
  for (const info of found) {
    const marker = info.dbName === WRITER_LITERAL ? '  <- writer literal'
      : info.dbName === readerDb ? '  <- reader target' : '';
    console.log(line('-'));
    console.log(`  ${info.dbName}${marker}`);
    console.log(`    total=${info.total}  published=${info.published}  draft=${info.draft}  archived=${info.archived}`);
    console.log(`    status absent=${info.missingStatus}   platform-written(portfolio_id/user_id)=${info.platformWritten}`);
    console.log(`    published with null publishedAt=${info.nullPublishedAt}`);
    console.log(`    indexes: ${info.indexes.join(', ') || '(none)'}`);
    if (info.newest.length > 0) {
      const d = info.newest[0];
      console.log(`    newest published: slug=${d.slug}  publishedAt=${d.publishedAt ?? 'NULL'}`);
      console.log(`    expected live URL: https://princepspolycap.com/blogs/${d.slug}`);
    } else {
      console.log('    newest published: (none)');
    }
  }

  // ---- 4. verdict -------------------------------------------------------
  const target = found.find((f) => f.dbName === readerDb) ?? null;
  const populated = found.filter((f) => f.total > 0);

  const verdicts = [];

  if (readerDb !== WRITER_LITERAL) {
    verdicts.push(verdict('SPLIT_DB',
      `reader resolves "${readerDb}", writer literal is "${WRITER_LITERAL}". ` +
      'Published docs land in one database and are read from another. Survives every deploy and restart.'));
  }

  if (populated.length > 0 && !populated.some((f) => f.dbName === readerDb)) {
    verdicts.push(verdict('SPLIT_DB',
      `docs exist in ${populated.map((f) => f.dbName).join(', ')} but reader targets "${readerDb}". ` +
      'Set MONGODB_DB_NAME explicitly or correct the map value.'));
  }

  if (!target || target.total === 0) {
    verdicts.push(verdict('NO_WRITE',
      `no documents in "${readerDb}".${COLLECTION} — the publisher has not landed here. ` +
      'A publish "success" that leaves this empty is a write to a different database or a swallowed write error.'));
  } else {
    if (target.missingStatus > 0) {
      verdicts.push(verdict('MISSING_STATUS',
        `${target.missingStatus} doc(s) have no status field. A direct pymongo insert bypasses the Mongoose ` +
        'default:"draft"; an absent status never matches status:"published" and is invisible forever. ' +
        'The writer must set status:"published" explicitly.'));
    }
    if (target.published === 0 && target.total > 0) {
      verdicts.push(verdict('DRAFT_ONLY',
        `${target.total} doc(s) present, 0 published. The reader gate is status==="published"; ` +
        'nothing else makes a post visible.'));
    }
    if (target.nullPublishedAt > 0) {
      verdicts.push(verdict('NULL_PUBLISHEDAT',
        `${target.nullPublishedAt} published doc(s) have null/missing publishedAt. They sort last and ` +
        'render with a broken date. The writer must set publishedAt on publish.'));
    }
    if (target.published > 0 && target.nullPublishedAt === 0) {
      verdicts.push(verdict('HEALTHY',
        `${target.published} published doc(s) with non-null publishedAt in "${readerDb}". ` +
        'The read path should surface these. If the live site shows none, the failure is not in the data layer.'));
    }
    if (!target.indexes.includes('status_1_publishedAt_-1')) {
      verdicts.push(verdict('INDEX_GAP',
        'compound {status,publishedAt} index missing — list query does a blocking in-memory sort. ' +
        'Run scripts/migrations/20261118_blogs_publish_index.mjs.'));
    }
  }

  console.log('\n[4] Verdict');
  if (verdicts.length === 0) {
    console.log('    INCONCLUSIVE — no branch matched. Inspect section [3] manually.');
  }
  for (const v of verdicts) {
    console.log(`\n    ${v.name}`);
    console.log(`      ${v.detail}`);
  }
  console.log('');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Diagnostic failed:', err);
  try { await mongoose.disconnect(); } catch { /* noop */ }
  process.exit(1);
});
