#!/usr/bin/env node
/**
 * DEPRECATED — forwarding shim. Do not add logic to this file.
 *
 * There were two post-deploy smoke scripts in this repo:
 *
 *   .github/scripts/smoke-blog-surface.mjs   <- the one ci.yml runs (canonical)
 *   .github/scripts/smoke-live-blog.mjs      <- this file (orphan)
 *
 * Same four checks, different env-var contracts, neither aware of the other. ci.yml
 * only ever referenced the canonical one, so any edit made here was silently dead:
 * a gate you can tune without changing what the gate does is a trap, and the next
 * person to touch the smoke would have found the wrong file first.
 *
 * Rather than delete it (external docs or a human's shell history may still call
 * it), it now forwards to the canonical script with the environment untouched.
 * Same process, same exit code, one implementation.
 *
 * If you are here to change the smoke: edit smoke-blog-surface.mjs.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const canonical = join(here, 'smoke-blog-surface.mjs');

console.error(
  '[deprecated] smoke-live-blog.mjs forwards to smoke-blog-surface.mjs. ' +
    'Edit the canonical script; this shim carries no logic.'
);

const result = spawnSync(process.execPath, [canonical, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(`[deprecated] failed to exec ${canonical}: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
