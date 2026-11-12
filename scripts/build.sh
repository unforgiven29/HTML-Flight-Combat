#!/usr/bin/env bash
# Builds the deployable site into ./dist: the same files, with JS comments and whitespace stripped by terser.
# Names are never mangled (other files reach into game.js globals by name, and eval / toString() tricks rely on them).
# Files that rebuild jet models by editing another function's source text (makeF18 -> F-18E, makeSu27 -> Su-33 / Su-27SM,
# MiG-25 -> MiG-31) are copied as they are, so those text replacements keep matching.
# Usage: scripts/build.sh   (needs node; installs terser into a temp dir)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=dist; rm -rf "$OUT"; mkdir -p "$OUT"
cp -r index.html .nojekyll README.md LICENSE css assets vendor "$OUT"/ 2>/dev/null || true
T=$(mktemp -d); (cd "$T" && npm i --silent --no-audit --no-fund terser@5 >/dev/null)
TERSER="$T/node_modules/.bin/terser"
KEEP='js/planes/f18.js js/planes/su27.js js/planes/mig25.js'
for f in $(find js -name "*.js" | sort); do
  mkdir -p "$OUT/$(dirname "$f")"
  if [[ " $KEEP " == *" $f "* ]]; then cp "$f" "$OUT/$f"; continue; fi
  "$TERSER" "$f" --compress passes=1,keep_fnames=true,keep_fargs=true,keep_classnames=true --keep-fnames --comments false -o "$OUT/$f"
done
du -sh "$OUT/js" | sed 's/^/js bundle: /'
