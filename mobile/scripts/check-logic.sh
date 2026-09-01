#!/usr/bin/env bash
# Compiles and runs the pure-logic checks (generator, stats). These modules have
# no React Native imports, so they can be exercised on any machine — useful when
# you cannot run the UI, e.g. in CI on Linux.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
npx tsc --ignoreConfig scripts/check-logic.ts src/data/*.ts \
  --outDir "$OUT" --module commonjs --target es2020 \
  --moduleResolution bundler --skipLibCheck
node "$OUT/scripts/check-logic.js"
