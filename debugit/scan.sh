#!/bin/bash
# NanoClaw Directory Scanner
# Scans the workspace (groups/) and all subdirectories
# Outputs a timestamped markdown report
# Usage: ./debugit/scan.sh [target_dir]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TARGET="${1:-$PROJECT_DIR/groups}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DATE_HUMAN=$(date +"%B %d, %Y at %I:%M %p")
REPORT_DIR="$PROJECT_DIR/debugit/reports"
REPORT="$REPORT_DIR/scan-$TIMESTAMP.md"

mkdir -p "$REPORT_DIR"

# ── Build the report ──

cat > "$REPORT" << EOF
# NanoClaw Directory Scan Report

**Date:** $DATE_HUMAN
**Target:** \`$TARGET\`
**Host:** $(hostname)

---

## Overview

EOF

# Count totals
TOTAL_FILES=$(find "$TARGET" -type f -not -path '*/.git/*' -not -path '*/__pycache__/*' -not -path '*/.DS_Store' -not -path '*/node_modules/*' 2>/dev/null | wc -l | xargs)
TOTAL_DIRS=$(find "$TARGET" -type d -not -path '*/.git/*' -not -path '*/__pycache__/*' -not -path '*/node_modules/*' 2>/dev/null | wc -l | xargs)
TOTAL_SIZE=$(du -sh "$TARGET" 2>/dev/null | cut -f1)

cat >> "$REPORT" << EOF
| Metric | Value |
|--------|-------|
| Total Files | $TOTAL_FILES |
| Total Directories | $TOTAL_DIRS |
| Total Size | $TOTAL_SIZE |

---

## Directory Tree

\`\`\`
EOF

# Tree view (excluding .git, __pycache__, node_modules, .DS_Store)
if command -v tree &>/dev/null; then
  tree -a -I '.git|__pycache__|node_modules|.DS_Store' --dirsfirst "$TARGET" >> "$REPORT" 2>/dev/null
else
  # Fallback: use find to build a tree-like listing
  find "$TARGET" -not -path '*/.git/*' -not -path '*/.git' \
    -not -path '*/__pycache__/*' -not -path '*/__pycache__' \
    -not -path '*/node_modules/*' -not -path '*/node_modules' \
    -not -name '.DS_Store' \
    | sort | while read -r entry; do
      # Calculate depth relative to target
      rel="${entry#$TARGET}"
      depth=$(echo "$rel" | tr -cd '/' | wc -c)
      indent=$(printf '%*s' $((depth * 2)) '')
      name=$(basename "$entry")
      if [[ -d "$entry" ]]; then
        echo "${indent}${name}/"
      else
        echo "${indent}${name}"
      fi
    done >> "$REPORT" 2>/dev/null
fi

echo '```' >> "$REPORT"
echo "" >> "$REPORT"

# ── Per-group breakdown ──
echo "## Group Breakdown" >> "$REPORT"
echo "" >> "$REPORT"

for group_dir in "$TARGET"/*/; do
  [[ ! -d "$group_dir" ]] && continue
  group_name=$(basename "$group_dir")

  group_files=$(find "$group_dir" -type f -not -path '*/.git/*' -not -path '*/__pycache__/*' -not -name '.DS_Store' -not -path '*/node_modules/*' 2>/dev/null | wc -l | xargs)
  group_size=$(du -sh "$group_dir" 2>/dev/null | cut -f1)

  cat >> "$REPORT" << EOF
### Group: \`$group_name\`

- **Files:** $group_files
- **Size:** $group_size

EOF

  # Top-level contents
  echo "| Name | Type | Size |" >> "$REPORT"
  echo "|------|------|------|" >> "$REPORT"

  for entry in "$group_dir"*; do
    [[ ! -e "$entry" ]] && continue
    name=$(basename "$entry")
    [[ "$name" == ".DS_Store" ]] && continue
    [[ "$name" == ".git" ]] && continue

    if [[ -d "$entry" ]]; then
      entry_size=$(du -sh "$entry" 2>/dev/null | cut -f1)
      sub_count=$(find "$entry" -type f -not -path '*/.git/*' -not -name '.DS_Store' 2>/dev/null | wc -l | xargs)
      echo "| \`$name/\` | dir ($sub_count files) | $entry_size |" >> "$REPORT"
    else
      entry_size=$(ls -lh "$entry" 2>/dev/null | awk '{print $5}')
      echo "| \`$name\` | file | $entry_size |" >> "$REPORT"
    fi
  done

  echo "" >> "$REPORT"
done

# ── File type summary ──
cat >> "$REPORT" << 'SECTION_HEADER'
## File Types

SECTION_HEADER

echo "| Extension | Count |" >> "$REPORT"
echo "|-----------|-------|" >> "$REPORT"

find "$TARGET" -type f -not -path '*/.git/*' -not -path '*/__pycache__/*' -not -name '.DS_Store' -not -path '*/node_modules/*' 2>/dev/null \
  | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -20 \
  | while read -r count ext; do
    echo "| \`.$ext\` | $count |" >> "$REPORT"
  done

# ── Large files ──
cat >> "$REPORT" << EOF

---

## Largest Files (top 15)

| Size | Path |
|------|------|
EOF

find "$TARGET" -type f -not -path '*/.git/*' -not -path '*/__pycache__/*' -not -name '.DS_Store' -not -path '*/node_modules/*' 2>/dev/null \
  -exec ls -lhS {} + 2>/dev/null | sort -k5 -hr | head -15 \
  | while read -r _ _ _ _ size _ _ _ filepath; do
    rel="${filepath#$PROJECT_DIR/}"
    echo "| $size | \`$rel\` |"
  done >> "$REPORT"

# ── Recently modified ──
cat >> "$REPORT" << EOF

---

## Recently Modified (last 7 days)

| Modified | Path |
|----------|------|
EOF

find "$TARGET" -type f -not -path '*/.git/*' -not -path '*/__pycache__/*' -not -name '.DS_Store' -not -path '*/node_modules/*' -mtime -7 2>/dev/null \
  | while read -r filepath; do
    mod_date=$(stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$filepath" 2>/dev/null || stat -c '%y' "$filepath" 2>/dev/null | cut -d. -f1)
    rel="${filepath#$PROJECT_DIR/}"
    echo "| $mod_date | \`$rel\` |"
  done | sort -r >> "$REPORT"

# ── Footer ──
cat >> "$REPORT" << EOF

---

*Generated by NanoClaw scan.sh on $DATE_HUMAN*
EOF

# Also keep a symlink to the latest report
ln -sf "$REPORT" "$REPORT_DIR/latest.md"

echo "$REPORT"
