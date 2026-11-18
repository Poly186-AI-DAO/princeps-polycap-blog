#!/usr/bin/env bash
# verify_blog_surface.sh - assert the blog surface is actually SERVING posts.
#
# Why this exists: the publish valve reported success while the public site
# answered every path with an identical 114-byte stub, including a slug that
# does not exist. A publish counter can climb while zero URLs are live.
# "The deploy step exited 0" is not evidence that a URL works. This script is.
#
# Read-only. Makes no writes, needs no credentials.
#
# Usage:
#   scripts/deploy/verify_blog_surface.sh <base-url> [real-slug]
#
# Exit codes:
#   0  surface serves a real post and a fabricated slug does not match it
#   1  catch-all stub (real and fabricated paths are byte-identical / tiny body)
#   2  real post path did not return 200
#   3  bad usage or the host did not answer at all

set -uo pipefail

BASE="${1:-}"
SLUG="${2:-running-an-ai-company-on-a-clock}"
MIN_REAL_BYTES="${MIN_REAL_BYTES:-2000}"
PROBE="__deploy_probe_does_not_exist_$$"

if [ -z "$BASE" ]; then
  echo "usage: $0 <base-url> [real-slug]" >&2
  exit 3
fi
BASE="${BASE%/}"

fetch() {
  local url="$1" out="$2"
  local code
  code=$(curl -sS -L --max-time 25 -o "$out" -w '%{http_code}' "$url" 2>/dev/null) || code="000"
  [ -n "$code" ] || code="000"
  printf '%s' "$code"
}

tmp=$(mktemp -d) || exit 3
trap 'rm -rf "$tmp"' EXIT

code_real=$(fetch "$BASE/blogs/$SLUG" "$tmp/real.html")
code_fake=$(fetch "$BASE/blogs/$PROBE" "$tmp/fake.html")
code_root=$(fetch "$BASE/" "$tmp/root.html")

size_real=$(wc -c < "$tmp/real.html" | tr -d ' ')
size_fake=$(wc -c < "$tmp/fake.html" | tr -d ' ')
size_root=$(wc -c < "$tmp/root.html" | tr -d ' ')

echo "base: $BASE"
printf '  %-44s %s  %s bytes\n' "/blogs/$SLUG" "$code_real" "$size_real"
printf '  %-44s %s  %s bytes\n' "/blogs/$PROBE" "$code_fake" "$size_fake"
printf '  %-44s %s  %s bytes\n' "/" "$code_root" "$size_root"

if [ "$code_real" = "000" ]; then
  echo "VERDICT: UNREACHABLE - no HTTP response from $BASE" >&2
  exit 3
fi

if [ "$code_real" != "200" ]; then
  echo "VERDICT: NOT SERVING - /blogs/$SLUG returned $code_real." >&2
  echo "Rows may exist in Mongo; the surface is not rendering them." >&2
  exit 2
fi

if cmp -s "$tmp/real.html" "$tmp/fake.html"; then
  echo "VERDICT: CATCH-ALL STUB - a fabricated slug is byte-identical to a real post." >&2
  echo "Nothing is deployed behind this hostname. Publishing to the DB cannot fix this." >&2
  exit 1
fi

if [ "$size_real" -lt "$MIN_REAL_BYTES" ]; then
  echo "VERDICT: SUSPECT - real post body is only $size_real bytes (< $MIN_REAL_BYTES)." >&2
  echo "Treat as a stub until a full article body is confirmed." >&2
  exit 1
fi

echo "VERDICT: LIVE - $BASE/blogs/$SLUG served $size_real bytes; a fabricated slug did not match it."
exit 0
