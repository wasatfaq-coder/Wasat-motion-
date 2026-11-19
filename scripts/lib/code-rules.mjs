// Code rules the audit applies to topic and sample code, with their own selftest (scripts/regress-checks.mjs).
//
// rawOverlay: markup glued to an Assembly's picture as a string (`A.svg() + '<path…'`, `A.svg() + fn()`,
// `x + A.svgFaded(…)`) is painted after (or before) every part of the object, outside its depth order. Root cause
// (docs/root-causes.md, gate round 1 of the showcase): a plan line on a table top was drawn over raised land and posts,
// flow dots over the coin stacks, because nothing ordered them. Pass such marks as `extra` (they then take their place
// by depth, src/lib/depth.ts) or put text on a frontal layer.
const CALL = String.raw`\.svg(?:Faded)?\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)`;
const AFTER = new RegExp(`${CALL}\\s*\\+`);
const BEFORE = new RegExp(String.raw`\+\s*[\w.]+${CALL}`);

/** The offending snippets of `code` (comments already stripped), or [] when it is clean. */
export const rawOverlay = (code) => {
  const hits = [];
  for (const re of [AFTER, BEFORE]) {
    const g = new RegExp(re.source, 'g');
    for (const m of code.matchAll(g)) hits.push(m[0].slice(0, 60));
  }
  return hits;
};

export const selftest = () => {
  const fails = [];
  const bad = [
    "svg: () => MAP.svg() + K.lineSvg(pts, {tone: 'lo'})",
    'svg: () => PHONE.svg() + UI',
    "svg: () => CASH.svg({}, {hide: (n) => n === 'x'}) + dots",
    "svg: () => '<g/>' + LAB.svgFaded(parts)",
  ];
  const good = ["svg: () => MAP.svg({}, {extra: [plan]})", 'svg: () => LAB.svgFaded([...fire, ...steam])', 'const s = a + b'];
  for (const c of bad) if (!rawOverlay(c).length) fails.push(`code-rules: rawOverlay missed «${c}»`);
  for (const c of good) if (rawOverlay(c).length) fails.push(`code-rules: rawOverlay flagged clean code «${c}»`);
  return fails;
};
