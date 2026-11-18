#!/usr/bin/env node
/**
 * Migration: 20261118_blogs_publish_index
 * Owner:     Database Engineer
 * Target:    <MONGODB_DB_NAME || COSMOS_DB_DATABASE_NAME || "PrincepsBlog">.blogs
 *
 * WHY
 *   src/lib/blogs.js (sha ffbb118c) issues exactly one list query:
 *
 *       Blog.find({ status: 'published' }).sort({ publishedAt: -1 }).lean()
 *
 *   src/models/Blog.js (sha bc33a659) declares two single-field indexes:
 *
 *       { slug: 1 }  unique, index   -> serves getBlogBySlug
 *       { status: 1 } index          -> serves the filter, NOT the sort
 *
 *   With { status: 1 } alone, MongoDB matches on status and then performs a
 *   BLOCKING IN-MEMORY SORT on publishedAt (SORT stage, 32MB internal cap).
 *   The compound index below turns filter + sort into a single IXSCAN with
 *   no SORT stage.
 *
 *   { status: 1 } is a strict prefix of { status: 1, publishedAt: -1 }, so it
 *   becomes redundant once the compound exists. It is dropped here unless
 *   --keep-redundant is passed. Net index count is unchanged: one swapped.
 *
 * SAFETY
 *   - Idempotent. createIndex with an identical spec + name is a no-op, so
 *     running this twice changes nothing the second time.
 *   - --dry-run prints the intended plan and the current explain() without
 *     mutating anything.
 *   - status_1 is dropped ONLY after the compound index build is confirmed
 *     present in getIndexes(). If the build throws, the drop never runs.
 *   - Never drops, rewrites, or deletes a document. Data is read-only here.
 *
 * VERIFY AFTER RUN
 *   db.blogs.getIndexes()
 *     -> status_1_publishedAt_-1 present, status_1 absent
 *   db.blogs.find({status:'published'}).sort({publishedAt:-1}).explain()
 *     -> winningPlan contains IXSCAN and does NOT contain SORT
 *
 * USAGE
 *   node scripts/migrations/20261118_blogs_publish_index.mjs --dry-run
 *   node scripts/migrations/20261118_blogs_publish_index.mjs
 *   node scripts/migrations/20261118_blogs_publish_index.mjs --keep-redundant
 */

import mongoose from 'mongoose';

const COLLECTION = 'blogs';
const COMPOUND_KEY = { status: 1, publishedAt: -1 };
const COMPOUND_NAME = 'status_1_publishedAt_-1';
const REDUNDANT_NAME = 'status_1';

const DRY_RUN = process.argv.includes('--dry-run');
const KEEP_REDUNDANT = process.argv.includes('--keep-redundant');

const getDbName = () =>
  process.env.MONGODB_DB_NAME ||
  process.env.COSMOS_DB_DATABASE_NAME ||
  'PrincepsBlog';

/** Walk an explain() winningPlan and collect every stage name in it. */
function collectStages(plan, acc = []) {
  if (!plan || typeof plan !== 'object') return acc;
  if (typeof plan.stage === 'string') acc.push(plan.stage);
  if (Array.isArray(plan.inputStages)) {
    for (const child of plan.inputStages) collectStages(child, acc);
  }
  if (plan.queryPlan) collectStages(plan.queryPlan, acc);
  return acc;
}

async function explainListQuery(col) {
  const raw = await col
    .find({ status: 'published' })
    .sort({ publishedAt: -1 })
    .explain('executionStats');
  const qp = raw.queryPlanner?.winningPlan ?? raw.winningPlan ?? {};
  const stages = collectStages(qp);
  const stats = raw.executionStats ?? {};
  return {
    stages,
    usesIndex: stages.includes('IXSCAN'),
    blockingSort: stages.includes('SORT'),
    docsExamined: stats.totalDocsExamined,
    keysExamined: stats.totalKeysExamined,
    returned: stats.nReturned,
  };
}

function report(label, e) {
  console.log(`\n  ${label}`);
  console.log(`    stages        : ${e.stages.join(' <- ') || '(none)'}`);
  console.log(`    uses index    : ${e.usesIndex ? 'YES' : 'NO'}`);
  console.log(`    blocking SORT : ${e.blockingSort ? 'YES  <-- defect' : 'no'}`);
  console.log(
    `    docs/keys/out : ${e.docsExamined} examined / ${e.keysExamined} keys / ${e.returned} returned`
  );
}

async function main() {
  const uri = process.env.MONGODB_DATABASE_URL;
  if (!uri) {
    console.error('FATAL: MONGODB_DATABASE_URL is not set.');
    process.exit(1);
  }

  const dbName = getDbName();
  console.log('='.repeat(72));
  console.log('Migration 20261118_blogs_publish_index');
  console.log('='.repeat(72));
  console.log(`  mode      : ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}`);
  console.log(`  database  : ${dbName}`);
  console.log(`  collection: ${COLLECTION}`);
  console.log(`  env       : MONGODB_DB_NAME=${process.env.MONGODB_DB_NAME ?? '(unset)'}`);
  console.log(`              COSMOS_DB_DATABASE_NAME=${process.env.COSMOS_DB_DATABASE_NAME ?? '(unset)'}`);

  await mongoose.connect(uri, { dbName, bufferCommands: false });
  const col = mongoose.connection.db.collection(COLLECTION);

  // ---- 1. current state -------------------------------------------------
  const existing = await col.indexes().catch(() => []);
  console.log('\n[1] Existing indexes');
  for (const idx of existing) {
    console.log(`    ${idx.name}  ${JSON.stringify(idx.key)}${idx.unique ? '  UNIQUE' : ''}`);
  }
  const hasCompound = existing.some((i) => i.name === COMPOUND_NAME);
  const hasRedundant = existing.some((i) => i.name === REDUNDANT_NAME);
  console.log(`    compound present : ${hasCompound ? 'YES' : 'no'}`);
  console.log(`    status_1 present : ${hasRedundant ? 'YES' : 'no'}`);

  // ---- 2. baseline plan -------------------------------------------------
  const docCount = await col.estimatedDocumentCount();
  console.log(`\n[2] Baseline query plan  (${docCount} docs in collection)`);
  if (docCount > 0) {
    report('BEFORE  find({status:"published"}).sort({publishedAt:-1})', await explainListQuery(col));
  } else {
    console.log('    collection empty — plan will be trivial until first publish');
  }

  if (DRY_RUN) {
    console.log('\n[3] DRY RUN — would apply:');
    if (!hasCompound) console.log(`    createIndex(${JSON.stringify(COMPOUND_KEY)}, {name:"${COMPOUND_NAME}"})`);
    if (hasRedundant && !KEEP_REDUNDANT) console.log(`    dropIndex("${REDUNDANT_NAME}")   // covered by compound prefix`);
    console.log('\nNo changes made. Re-run without --dry-run to apply.\n');
    await mongoose.disconnect();
    return;
  }

  // ---- 3. create compound ----------------------------------------------
  console.log('\n[3] Create compound index');
  if (hasCompound) {
    console.log(`    ${COMPOUND_NAME} already exists — no-op (idempotent)`);
  } else {
    const name = await col.createIndex(COMPOUND_KEY, { name: COMPOUND_NAME, background: true });
    console.log(`    created: ${name}`);
  }

  // Confirm the build landed BEFORE dropping anything.
  const afterCreate = await col.indexes();
  const confirmed = afterCreate.some((i) => i.name === COMPOUND_NAME);
  if (!confirmed) {
    console.error('    FATAL: compound index not present after createIndex. Aborting before any drop.');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('    confirmed present in getIndexes()');

  // ---- 4. drop redundant ------------------------------------------------
  console.log('\n[4] Drop redundant single-field index');
  if (KEEP_REDUNDANT) {
    console.log(`    skipped (--keep-redundant): ${REDUNDANT_NAME} retained`);
  } else if (!hasRedundant) {
    console.log(`    ${REDUNDANT_NAME} already absent — no-op`);
  } else {
    try {
      await col.dropIndex(REDUNDANT_NAME);
      console.log(`    dropped: ${REDUNDANT_NAME}  (prefix of ${COMPOUND_NAME})`);
    } catch (err) {
      console.warn(`    WARN: could not drop ${REDUNDANT_NAME}: ${err.message}`);
      console.warn('    Compound index is in place; leaving the redundant index is harmless.');
    }
  }

  // ---- 5. post state ----------------------------------------------------
  console.log('\n[5] Final indexes');
  for (const idx of await col.indexes()) {
    console.log(`    ${idx.name}  ${JSON.stringify(idx.key)}${idx.unique ? '  UNIQUE' : ''}`);
  }

  if (docCount > 0) {
    console.log('\n[6] Query plan after migration');
    const after = await explainListQuery(col);
    report('AFTER   find({status:"published"}).sort({publishedAt:-1})', after);
    if (after.blockingSort) {
      console.error('\n    FAIL: SORT stage still present. Index did not satisfy the sort.');
    } else if (!after.usesIndex) {
      console.error('\n    FAIL: no IXSCAN. Query is still a COLLSCAN.');
    } else {
      console.log('\n    PASS: IXSCAN, no blocking sort.');
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.\n');
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  try { await mongoose.disconnect(); } catch { /* noop */ }
  process.exit(1);
});
