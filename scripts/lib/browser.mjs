// The one place that finds the pre-installed headless browser for Remotion stills (root cause in docs/root-causes.md:
// four scripts carried their own copy; two pinned a version path that silently stopped matching, one did not skip the
// `chromium_headless_shell` symlink some images add). scripts/regress-checks.mjs refuses any other script that names
// the browser directory.
import fs from 'node:fs';
import path from 'node:path';

export const findBrowser = () => {
  const base = '/opt/pw-browsers';
  if (!fs.existsSync(base)) return null;
  const d = fs.readdirSync(base).find((n) => n.startsWith('chromium_headless_shell') && fs.statSync(path.join(base, n)).isDirectory());
  if (!d) return null;
  const sub = fs.readdirSync(path.join(base, d)).find((n) => n.startsWith('chrome-'));
  const exe = sub ? path.join(base, d, sub, 'chrome-headless-shell') : null;
  return exe && fs.existsSync(exe) ? exe : null;
};
