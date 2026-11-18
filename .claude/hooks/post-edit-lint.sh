#!/bin/bash
# PostToolUse: после каждой правки файла в src/ гоняет eslint по этому файлу.
# Ошибки возвращаются Claude (exit 2), чтобы он исправил их сразу, а не на pregate.
# Для *.parts.ts напоминает про object-audit --settle (CLAUDE.md).
set -uo pipefail

file=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch{}})')
[ -n "$file" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
rel=${file#"$PWD"/}

case "$rel" in
  src/*.ts|src/*.tsx) ;;
  *) exit 0 ;;
esac
[ -f "$rel" ] || exit 0
[ -x node_modules/.bin/eslint ] || exit 0

if ! out=$(node_modules/.bin/eslint --no-warn-ignored "$rel" 2>&1); then
  echo "eslint: ошибки в $rel — исправь:" >&2
  echo "$out" >&2
  exit 2
fi

case "$rel" in
  *.parts.ts) echo "Напоминание: изменён $rel — запусти node scripts/object-audit.mjs --settle $rel" >&2; exit 2 ;;
esac
exit 0
