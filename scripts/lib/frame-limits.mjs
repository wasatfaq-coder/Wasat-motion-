// Thresholds for the frame the owner rejected on PR #14 and again on PR #38.
// Change a number here; the pixel check, the motion check and the topic audit all read it.
export const FRAME_LIMITS = {
  sampleSec: 0.5,
  // background share allowed in the lower third of the safe rect (y from 67% of the rect to its bottom)
  safeLowerEmptyMax: 0.42,
  // background share allowed in the whole safe rect
  safeEmptyMax: 0.5,
  // the topic's own parts must span at least this share of the safe rect's height
  heroMinHeight: 0.42,
  // a plate or a callout may overlap the hero's screen box by at most this many pixels
  plateOverlapPx: 6,
  // generic room / mannequin parts, as a share of the scene's assembly
  genericMaxShare: 0.4,
  // the scene's declared subject must own at least this many parts
  subjectMinParts: 4,
};

const SAFE = {x0: 64, x1: 904, y0: 560, y1: 1430};

const scale = (v, from, to) => Math.round((v / from) * to);

/** Empty-background share of a gray frame. `bg` is that frame's own border colour. */
export const emptyShare = (frame, w, h, y0, y1, x0, x1, bg, tol = 18) => {
  let n = 0;
  let empty = 0;
  const yA = Math.max(0, Math.min(h, y0));
  const yB = Math.max(0, Math.min(h, y1));
  const xA = Math.max(0, Math.min(w, x0));
  const xB = Math.max(0, Math.min(w, x1));
  for (let y = yA; y < yB; y++)
    for (let x = xA; x < xB; x++) {
      n++;
      if (Math.abs(frame[y * w + x] - bg) <= tol) empty++;
    }
  return n ? empty / n : 1;
};

export const borderBg = (frame, w, h) => {
  const hist = new Array(256).fill(0);
  for (let x = 0; x < w; x++) hist[frame[x]]++, hist[frame[(h - 1) * w + x]]++;
  for (let y = 0; y < h; y++) hist[frame[y * w]]++, hist[frame[y * w + w - 1]]++;
  let bg = 0;
  for (let i = 1; i < 256; i++) if (hist[i] > hist[bg]) bg = i;
  return bg;
};

/** Sampled every `sampleSec`. Returns problems `{kind, frame, text}`. */
export const checkOccupancy = (frames, w, h, {fps = 60, limits = FRAME_LIMITS} = {}) => {
  const step = Math.max(1, Math.round(fps * limits.sampleSec));
  const x0 = scale(SAFE.x0, 1080, w);
  const x1 = scale(SAFE.x1, 1080, w);
  const y0 = scale(SAFE.y0, 1920, h);
  const y1 = scale(SAFE.y1, 1920, h);
  const yL = y0 + Math.round((y1 - y0) * 0.67);
  const problems = [];
  for (let i = 0; i < frames.length; i += step) {
    const bg = borderBg(frames[i], w, h);
    const lower = emptyShare(frames[i], w, h, yL, y1, x0, x1, bg);
    const safe = emptyShare(frames[i], w, h, y0, y1, x0, x1, bg);
    if (lower > limits.safeLowerEmptyMax)
      problems.push({kind: 'lower', frame: i, text: `the lower third of the safe zone is ${(lower * 100).toFixed(0)} % empty at frame ${i} (≤ ${limits.safeLowerEmptyMax * 100} %); the subject must fill the vertical frame`});
    if (safe > limits.safeEmptyMax)
      problems.push({kind: 'lower', frame: i, text: `the safe zone is ${(safe * 100).toFixed(0)} % empty at frame ${i} (≤ ${limits.safeEmptyMax * 100} %)`});
  }
  return problems;
};

const paint = (w, h, bg, block) => {
  const f = new Uint8Array(w * h).fill(bg);
  const [x0, y0, x1, y1, v] = block;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) f[y * w + x] = v;
  return f;
};

export const selftest = () => {
  const w = 270;
  const h = 480;
  const fails = [];
  const full = paint(w, h, 236, [20, 150, 220, 400, 40]);
  const high = paint(w, h, 236, [20, 80, 220, 200, 40]);
  const ok = checkOccupancy([full], w, h, {fps: 2});
  const bad = checkOccupancy([high], w, h, {fps: 2});
  if (ok.length) fails.push(`frame-limits: a filled frame was refused (${ok[0].text})`);
  if (!bad.some((p) => p.kind === 'lower')) fails.push('frame-limits: an empty lower third was not caught');
  return fails;
};
