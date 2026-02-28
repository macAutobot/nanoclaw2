#!/bin/bash
set -e

BASE="/Users/dizzydevil/nanoclaw"
SRC="$BASE/docs/godot/godot-docs/tutorials"
TUTORIALS_OUT="$BASE/docs/godot/tutorials"
GDSCRIPT_OUT="$BASE/docs/godot/gdscript"
BESTPRAC_OUT="$BASE/docs/godot/best-practices"

mkdir -p "$TUTORIALS_OUT" "$GDSCRIPT_OUT" "$BESTPRAC_OUT"

# 1. All tutorials (flatten with directory prefix)
echo "Converting tutorials..."
find "$SRC" -name "*.rst" -not -path "*/scripting/gdscript/*" -not -path "*/best_practices/*" | while read f; do
  rel="${f#$SRC/}"
  name=$(echo "$rel" | sed 's|/|_|g' | sed 's|\.rst$||')
  pandoc "$f" -f rst -t gfm --wrap=none -o "$TUTORIALS_OUT/${name}.md" 2>/dev/null && echo "  ok $name" || echo "  FAIL $name"
done

# 2. GDScript basics
echo "Converting GDScript..."
find "$SRC/scripting/gdscript" -name "*.rst" | while read f; do
  name=$(basename "$f" .rst)
  pandoc "$f" -f rst -t gfm --wrap=none -o "$GDSCRIPT_OUT/${name}.md" 2>/dev/null && echo "  ok $name" || echo "  FAIL $name"
done

# 3. Best practices
echo "Converting best practices..."
find "$SRC/best_practices" -name "*.rst" | while read f; do
  name=$(basename "$f" .rst)
  pandoc "$f" -f rst -t gfm --wrap=none -o "$BESTPRAC_OUT/${name}.md" 2>/dev/null && echo "  ok $name" || echo "  FAIL $name"
done

echo ""
echo "=== Results ==="
echo "Tutorials:      $(find "$TUTORIALS_OUT" -name '*.md' | wc -l) files"
echo "GDScript:       $(find "$GDSCRIPT_OUT" -name '*.md' | wc -l) files"
echo "Best practices: $(find "$BESTPRAC_OUT" -name '*.md' | wc -l) files"
du -sh "$TUTORIALS_OUT" "$GDSCRIPT_OUT" "$BESTPRAC_OUT"
