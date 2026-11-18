// Result cache for slow checks (object-audit ≈ 25 s per object, rig-check ≈ 10 s): a check is skipped when none of its
// input files changed since it last PASSED. Stored in .cache/checks.json (ignored by git; CI starts clean and runs all).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join('.cache', 'checks.json');
const walk = (p) => (fs.existsSync(p) ? (fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((n) => walk(path.join(p, n))) : [p]) : []);

/** hash of the contents of the given files or folders (sorted, so order does not matter) */
export const hashInputs = (inputs) => {
  const h = crypto.createHash('sha256');
  for (const f of inputs.flatMap(walk).sort()) h.update(f).update(fs.readFileSync(f));
  return h.digest('hex').slice(0, 16);
};
const load = () => {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
};
/** true when `name` already passed on exactly these inputs */
export const passedBefore = (name, inputs) => load()[name] === hashInputs(inputs);
export const markPassed = (name, inputs) => {
  const c = load();
  c[name] = hashInputs(inputs);
  fs.mkdirSync(path.dirname(FILE), {recursive: true});
  fs.writeFileSync(FILE, JSON.stringify(c, null, 1) + '\n');
};
