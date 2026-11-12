#!/usr/bin/env bash
# Idempotent session setup. Safe to run repeatedly.
set -u
cd "$(dirname "$0")/.."
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
npx --yes skills add remotion-dev/skills -y >/dev/null 2>&1 || echo "WARN: remotion skills not installed"
npx remotion browser ensure || echo "WARN: browser not ready"
# whisper.cpp + model (needs huggingface.co)
node scripts/install-whisper.mjs 2>/dev/null || echo "WARN: whisper not installed (huggingface.co blocked?)"
# Earshot (needs github + download.pytorch.org + huggingface.co)
command -v earshot >/dev/null || uv tool install "earshot @ git+https://github.com/Leonxlnx/earshot" || echo "WARN: earshot not installed"
