// Pixel checks of one rendered frame (1080×1920), plain Node, shared by scripts/style-check.mjs (the showcase, in CI)
// and scripts/still-check.mjs (a topic's style frames). Root causes (docs/root-causes.md, gate round 1 of the
// AnatomyUniversal showcase, 19.11.2026): the frames were checked only against references taken from the same frames,
// so a hero framed by a too wide box (small on the phone), things added outside that box (cut by the frame edge or
// under the button column), the graphics band's fade cutting a body, and two or zero coral meanings all passed.
//   fill    the drawn content's box fills ≥ `minFill` of the safe rect on its tighter side (§19.2)
//   bounds  no content outside the safe rect (side columns, the band's fades): the hero is cut or under the buttons
//   coral   exactly one connected coral region of ≥ `coralMin` (0.2 %, the still-check floor) of the frame (one meaning, visible on a phone), unless
//           the frame declares `coral: 'none'` with a reason
// `bleed` (a reason) lets environment run past the safe rect (a zoom into part of a bigger object); fill still holds.

/** The safe rect of src/lib/camera.tsx safeRect() with captions (x 64–904, y 300–1170). */
export const SAFE_RECT = {x0: 64, x1: 904, y0: 300, y1: 1170};

const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return {h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx / 255};
};
export const isCoral = (r, g, b) => {
  const c = hsv(r, g, b);
  return c.s > 0.45 && c.v > 0.55 && (c.h < 22 || c.h > 350);
};

/** Connected regions of a boolean grid, joining cells closer than `gap` cells (a dark outline splits one coral part
 *  into faces; the gap keeps them one region). Returns the cell count of each region. */
const regions = (grid, w, h, gap) => {
  const seen = new Uint8Array(w * h);
  const out = [];
  for (let i = 0; i < w * h; i++) {
    if (!grid[i] || seen[i]) continue;
    let n = 0;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const c = stack.pop();
      n++;
      const cx = c % w;
      const cy = (c - cx) / w;
      for (let dy = -gap; dy <= gap; dy++)
        for (let dx = -gap; dx <= gap; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const j = y * w + x;
          if (grid[j] && !seen[j]) {
            seen[j] = 1;
            stack.push(j);
          }
        }
    }
    out.push(n);
  }
  return out.sort((a, b) => b - a);
};

/** Check one frame. img: {width, height, rgb}. Returns {errors: string[], stats}. */
export const checkFrame = (img, {rect = SAFE_RECT, minFill = 0.7, coral = true, bleed = null, coralMin = 0.002} = {}) => {
  const {width: W, height: H, rgb} = img;
  const at = (x, y) => (y * W + x) * 3;
  const bi = at(4, 4);
  const bg = [rgb[bi], rgb[bi + 1], rgb[bi + 2]];
  const content = (i) => Math.abs(rgb[i] - bg[0]) + Math.abs(rgb[i + 1] - bg[1]) + Math.abs(rgb[i + 2] - bg[2]) > 26;
  const S = 2;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let out = 0;
  const G = 4;
  const gw = Math.ceil(W / G);
  const gh = Math.ceil(H / G);
  const cor = new Uint8Array(gw * gh);
  for (let y = 0; y < H; y += S)
    for (let x = 0; x < W; x += S) {
      const i = at(x, y);
      if (!content(i)) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      if (x < rect.x0 - 4 || x > rect.x1 + 4 || y < rect.y0 - 4 || y > rect.y1 + 4) out++;
      if (x % G === 0 && y % G === 0 && isCoral(rgb[i], rgb[i + 1], rgb[i + 2])) cor[(y / G) * gw + x / G] = 1;
    }
  const errors = [];
  const rw = rect.x1 - rect.x0;
  const rh = rect.y1 - rect.y0;
  const fill = x0 === Infinity ? 0 : Math.max((x1 - x0) / rw, (y1 - y0) / rh);
  if (fill < minFill) errors.push(`fill: the drawn content is ${(fill * 100).toFixed(0)} % of the safe rect on its tighter side (< ${minFill * 100} %): the object is too small on a phone; frame it by what is drawn (camFitSvg), not by a wider box`);
  // 20 sampled pixels (≈ 80 px²) is anti-aliasing; more is a part outside
  if (!bleed && out > 20) errors.push(`bounds: ${out * S * S} px of content outside the safe rect (x ${rect.x0}–${rect.x1}, y ${rect.y0}–${rect.y1}): cut by the frame edge or the band's fade, or under the button column; frame everything the page draws (camFitSvg)`);
  const regs = regions(cor, gw, gh, 3).map((n) => (n * G * G) / (W * H));
  const big = regs.filter((a) => a >= coralMin / 6);
  if (coral === true) {
    if (!big.length || big[0] < coralMin) errors.push(`coral: ${big.length ? `the coral region is ${(big[0] * 100).toFixed(2)} % of the frame` : 'no coral'} (< ${(coralMin * 100).toFixed(1)} %): the one meaning is missing or invisible on a phone; or declare coral: 'none' with a reason`);
    if (big.length > 1) errors.push(`coral: ${big.length} separate coral regions (${big.map((a) => (a * 100).toFixed(2) + ' %').join(', ')}): one coral meaning per frame (§22.1)`);
  } else if (big.length) errors.push(`coral: the frame declares no coral («${coral}») but shows ${big.length} coral region(s)`);
  return {errors, stats: {fill, out: out * S * S, coral: regs.slice(0, 3)}};
};

/** Synthetic broken frames: each check must bite, a clean frame must pass. Returns failure messages. */
export const selftest = () => {
  const W = 1080;
  const H = 1920;
  const blank = () => {
    const rgb = new Uint8Array(W * H * 3);
    for (let i = 0; i < W * H; i++) rgb.set([245, 240, 232], i * 3);
    return {width: W, height: H, rgb};
  };
  const box = (img, x0, y0, x1, y1, c) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) img.rgb.set(c, (y * W + x) * 3);
  };
  const tone = [200, 190, 175];
  const red = [232, 96, 76];
  const good = () => {
    const g = blank();
    box(g, 150, 400, 820, 1050, tone);
    box(g, 400, 600, 520, 720, red);
    return g;
  };
  const fails = [];
  const expect = (name, img, opts, re) => {
    const r = checkFrame(img, opts);
    if (re && !r.errors.some((e) => re.test(e))) fails.push(`frame-checks: ${name} was not caught (${r.errors.join('; ') || 'no errors'})`);
    if (!re && r.errors.length) fails.push(`frame-checks: ${name} must pass (${r.errors.join('; ')})`);
  };
  expect('a clean frame', good(), {}, null);
  const small = blank();
  box(small, 400, 600, 600, 800, tone);
  box(small, 470, 650, 550, 730, red);
  expect('a tiny hero', small, {}, /^fill/);
  const cut = good();
  box(cut, 800, 500, 1000, 700, tone);
  expect('content under the button column', cut, {}, /^bounds/);
  const faded = good();
  box(faded, 200, 1150, 700, 1200, tone);
  expect('a body cut by the bottom fade', faded, {}, /^bounds/);
  expect('the same with bleed declared', faded, {bleed: 'zoom'}, null);
  const two = good();
  box(two, 200, 900, 320, 1000, red);
  expect('two coral meanings', two, {}, /separate coral/);
  const thin = good();
  box(thin, 400, 600, 520, 720, tone);
  box(thin, 300, 700, 500, 703, red);
  expect('an invisible coral line', thin, {}, /^coral/);
  const none = good();
  box(none, 400, 600, 520, 720, tone);
  expect('no coral without a reason', none, {}, /^coral/);
  expect('no coral with a reason', none, {coral: 'kit object, no meaning'}, null);
  return fails;
};
