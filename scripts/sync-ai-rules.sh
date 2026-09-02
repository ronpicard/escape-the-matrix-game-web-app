#!/usr/bin/env bash
# Regenerate the per-tool AI rulebook copies from the single source of truth
# in .claude/rules/ai-rules/. Edit rules there, then run this script.
#
#   scripts/sync-ai-rules.sh          # rewrite the derived copies
#   scripts/sync-ai-rules.sh --check  # exit 1 if any derived copy is stale
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=.claude/rules/ai-rules
CHECK=${1:-}
STALE=0

desc_for() {
  case "$1" in
    scope) echo "Task scope and convention constraints" ;;
    tests) echo "Test and verification constraints" ;;
    git) echo "Git mutation constraints" ;;
    docs) echo "Documentation update triggers" ;;
    code) echo "Code quality and safety constraints" ;;
    markdown) echo "Markdown formatting constraints" ;;
    *) echo "AI rulebook: $1" ;;
  esac
}

# body_of <file> — the rule text with any source frontmatter and leading
# blank lines stripped (e.g. the Claude markdown rule carries a paths: block).
body_of() {
  awk 'NR==1 && /^---$/ { fm = 1; next } fm == 1 { if (/^---$/) fm = 2; next } { print }' "$1" |
    sed '/./,$!d'
}

# render <topic> <format> — derived file content on stdout
render() {
  local topic=$1 format=$2 body
  body=$(body_of "$SRC/$topic.md")
  case "$format" in
    plain)
      printf '%s\n' "$body"
      ;;
    frontmatter) # Cursor .mdc and Cline
      printf -- '---\ndescription: %s\nalwaysApply: true\n---\n\n%s\n' "$(desc_for "$topic")" "$body"
      ;;
    windsurf)
      printf -- '---\ntrigger: always_on\n---\n\n\n%s\n' "$body"
      ;;
    github)
      printf -- '---\napplyTo: "**"\n---\n\n\n%s\n' "$body"
      ;;
  esac
}

# sync <topic> <format> <dest>
sync() {
  local topic=$1 format=$2 dest=$3
  if [ "$CHECK" = "--check" ]; then
    if ! render "$topic" "$format" | cmp -s - "$dest"; then
      echo "stale: $dest (source: $SRC/$topic.md)"
      STALE=1
    fi
  else
    mkdir -p "$(dirname "$dest")"
    render "$topic" "$format" > "$dest"
  fi
}

for src_file in "$SRC"/*.md; do
  t=$(basename "$src_file" .md)
  sync "$t" plain ".opencode/rules/ai-rules/$t.md"
  sync "$t" frontmatter ".cursor/rules/ai-rules/$t.mdc"
  sync "$t" frontmatter ".clinerules/ai-rules/ai-rules-$t.md"
  sync "$t" windsurf ".windsurf/rules/ai-rules/$t.md"
  sync "$t" github ".github/instructions/ai-rules/$t.instructions.md"
done

if [ "$CHECK" = "--check" ]; then
  if [ "$STALE" = 1 ]; then
    echo "Run scripts/sync-ai-rules.sh to regenerate." >&2
    exit 1
  fi
  echo "AI rulebook copies are in sync."
fi
