// Shared camera for every topic : room projection, RoomSvg, camOn, lerpCam.
import React from 'react';
import {COLORS} from '../theme/tokens';
import {iso, P3} from './iso';
import {SAFE, ZONES} from '../theme/layout';

/** Top of the illustration band: under the captions and the chapter mark (regulation v3.0, section 10). */
export const GRAPHICS_TOP = ZONES.graphicsTop;

export const ROOM_S = 54; // px per room unit at camera scale 1
export const ROOM_ORIGIN: [number, number] = [540, 880]; // screen point of the back floor corner

/** Screen position of a room point at camera scale 1. */
export const roomPoint = (p: P3): [number, number] => {
  const [x, y] = iso(ROOM_S)(p);
  return [ROOM_ORIGIN[0] + x, ROOM_ORIGIN[1] + y];
};

export type Cam = {focus: [number, number]; zoom: number; screen?: [number, number]};

/** Full-frame SVG with a camera: the focus point is shown at `screen` with `zoom`.
 *  `bottom` is where the graphics band ends (default: the caption zone; a reel without captions passes
 *  FRAME_BOTTOM). `sides` softens the left and right edges over that many pixels, so environment that runs past the
 *  frame (a bench, a floor) fades out instead of being cut by the frame edge. `fade` is the same for the top and the
 *  bottom of the band: a close-up whose environment runs past the band's bottom needs a long fade (≥ 80 px), or the
 *  band cuts it in a flat edge (motion-check --video reports it as a horizontal cut). The hero must still stay inside
 *  the safe rect (camFit, motion-check). */
export const RoomSvg: React.FC<{cam: Cam; children: React.ReactNode; top?: number; bottom?: number; sides?: number; fade?: number; dark?: boolean; under?: React.ReactNode}> = ({cam, children, top = GRAPHICS_TOP, bottom = ZONES.graphicsBottom, sides = 0, fade = 30, dark = false, under = null}) => {
  const [fx, fy] = cam.focus;
  const [sx, sy] = cam.screen ?? [540, 760];
  return (
    <svg className="iso-svg" width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, background: dark ? COLORS.bgDark : COLORS.bg}}>
      <defs>
        {/* Graphics live only in the band under the captions and the chapter mark; edges fade to the background. */}
        <linearGradient id="graphicsBand" x1="0" y1="0" x2="0" y2="1920" gradientUnits="userSpaceOnUse">
          <stop offset={top / 1920} stopColor="white" stopOpacity={0} />
          <stop offset={(top + 50) / 1920} stopColor="white" stopOpacity={1} />
          <stop offset={(bottom - 10 - fade) / 1920} stopColor="white" stopOpacity={1} />
          <stop offset={(bottom - 10) / 1920} stopColor="white" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="graphicsSides" x1="0" y1="0" x2="1080" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset={0} stopColor="white" stopOpacity={sides ? 0 : 1} />
          <stop offset={sides / 1080} stopColor="white" stopOpacity={1} />
          <stop offset={1 - sides / 1080} stopColor="white" stopOpacity={1} />
          <stop offset={1} stopColor="white" stopOpacity={sides ? 0 : 1} />
        </linearGradient>
        <mask id="graphicsMask" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
          <rect x={0} y={0} width={1080} height={1920} fill="url(#graphicsBand)" />
        </mask>
        <mask id="graphicsSideMask" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
          <rect x={0} y={0} width={1080} height={1920} fill="url(#graphicsSides)" />
        </mask>
      </defs>
      {under}
      <g mask="url(#graphicsMask)">
        <g mask="url(#graphicsSideMask)">
          <g transform={`translate(${sx} ${sy}) scale(${cam.zoom}) translate(${-fx} ${-fy})`}>
            <g transform={`translate(${ROOM_ORIGIN[0]} ${ROOM_ORIGIN[1]})`}>{children}</g>
          </g>
        </g>
      </g>
    </svg>
  );
};

/** Lowest graphics line of a reel or a scene without captions (the bottom of the safe zone). */
export const FRAME_BOTTOM = 1920 - SAFE.bottom;

export type Rect = {x0: number; y0: number; x1: number; y1: number};

/** The rect the hero must stay inside: the platform safe zone (SAFE) cut to the graphics band.
 *  `captions: false` for a reel or a scene without captions: the band runs down to the bottom of the safe zone. */
export const safeRect = ({captions = true, top = GRAPHICS_TOP}: {captions?: boolean; top?: number} = {}): Rect => ({
  x0: SAFE.left,
  x1: 1080 - SAFE.right,
  // captions sit ON TOP since regulation v3.0: with captions the band starts under them and the chapter mark
  y0: captions ? top + 50 : SAFE.top + 50,
  y1: FRAME_BOTTOM - 40,
});

/** A frontal plate pinned to a room point: its rect in screen px relative to the pinned point (x0, y0, x1, y1). */
export type Pin = {at: P3; box: [number, number, number, number]};

/** Camera that fits a set of room points INSIDE a rect of the vertical frame (default: the safe rect with captions),
 *  centred in it, filling `fill` of its width or height (whichever is tighter). `pins` are frontal plates (labels)
 *  pinned to room points: they keep their pixel size at any zoom, so the fit solves the zoom at which the points AND
 *  the plates fit. Pass every extreme point of every pose the camera has to hold (boxCorners of the hero), so nothing
 *  leaves the frame on any pose. `margin` reserves extra pixels (an inset beside the hero). */
export const camFit = (
  points: P3[],
  {rect = safeRect(), fill = 0.94, margin = {}, pins = []}: {rect?: Rect; fill?: number; margin?: Partial<Record<'top' | 'bottom' | 'left' | 'right', number>>; pins?: Pin[]} = {},
): Cam => {
  if (points.length < 4) throw new Error(`camFit: ${points.length} point(s); pass the corners of a box (boxCorners) or every extreme point`);
  return fitXY(points.map((p) => roomPoint(p)), {rect, fill, margin, pins});
};

/** The screen points (camera scale 1) of everything an SVG string of kit markup draws: every coordinate pair of its
 *  paths (the kit draws with M/L/Z only). Root cause it serves (docs/root-causes.md): the showcase framed an object by
 *  the axis box of its solids, wider than the drawn outline (round bodies), and missed what was added beside it
 *  (extras, a loose note): heroes came out small or cut. */
export const svgPoints = (svg: string): [number, number][] => {
  const out: [number, number][] = [];
  // markup under a transform (an interface mapped onto a screen with faceMatrix) is in its own pixel space and lies on
  // a part whose outline is measured anyway: it is left out (counted raw, it shrank the monitor to a speck)
  const flat = svg.replace(/<g transform="[^"]*">[\s\S]*?<\/g>/g, '');
  for (const m of flat.matchAll(/\sd="([^"]*)"/g)) {
    if (/[^MLZmlz0-9.\-\s,e]/.test(m[1])) throw new Error('svgPoints: only absolute M/L/Z paths are measured; draw through the kit');
    const n = m[1].match(/-?[\d.]+(?:e-?\d+)?/g) ?? [];
    for (let i = 0; i + 1 < n.length; i += 2) out.push([ROOM_ORIGIN[0] + Number(n[i]), ROOM_ORIGIN[1] + Number(n[i + 1])]);
  }
  return out;
};

/** camFit by what is drawn: the camera that fits every point the SVG markup draws inside the rect. Prefer it to
 *  boxCorners for a still frame or a page; a moving shot still fits every pose (camFit with the corners of all poses). */
export const camFitSvg = (svg: string, opts: Parameters<typeof camFit>[1] = {}): Cam => {
  const xy = svgPoints(svg);
  if (xy.length < 2) throw new Error('camFitSvg: the markup draws nothing');
  return fitXY(xy, {rect: safeRect(), fill: 0.94, margin: {}, pins: [], ...opts});
};

const fitXY = (
  room: [number, number][],
  {rect = safeRect(), fill = 0.94, margin = {}, pins = []}: {rect?: Rect; fill?: number; margin?: Partial<Record<'top' | 'bottom' | 'left' | 'right', number>>; pins?: Pin[]},
): Cam => {
  const m = {top: 0, bottom: 0, left: 0, right: 0, ...margin};
  const pinned = pins.map((p) => ({xy: roomPoint(p.at), box: p.box}));
  const rw = (rect.x1 - rect.x0 - m.left - m.right) * fill;
  const rh = (rect.y1 - rect.y0 - m.top - m.bottom) * fill;
  // extents of everything at zoom z, relative to an origin at room (0, 0)
  const extents = (z: number) => {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    const take = (ax: number, bx: number, ay: number, by: number) => {
      x0 = Math.min(x0, ax);
      x1 = Math.max(x1, bx);
      y0 = Math.min(y0, ay);
      y1 = Math.max(y1, by);
    };
    for (const [x, y] of room) take(z * x, z * x, z * y, z * y);
    for (const {xy, box} of pinned) take(z * xy[0] + box[0], z * xy[0] + box[2], z * xy[1] + box[1], z * xy[1] + box[3]);
    return {x0, x1, y0, y1};
  };
  const fits = (z: number) => {
    const e = extents(z);
    return e.x1 - e.x0 <= rw && e.y1 - e.y0 <= rh;
  };
  let lo = 0;
  let hi = 1;
  while (fits(hi) && hi < 1e4) hi *= 2;
  if (!fits(lo + 1e-6)) throw new Error('camFit: the pinned plates alone do not fit the rect');
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  const z = lo;
  const e = extents(z);
  const screen: [number, number] = [(rect.x0 + m.left + rect.x1 - m.right) / 2, (rect.y0 + m.top + rect.y1 - m.bottom) / 2];
  // the union's centre goes to the rect's centre: focus is the room point that lands on `screen`
  return {focus: [(e.x0 + e.x1) / 2 / z, (e.y0 + e.y1) / 2 / z], zoom: z, screen};
};

/** Room points of `points` that a camera puts outside the rect (by more than `tol` px): empty when the framing holds. */
export const outside = (cam: Cam, points: P3[], rect: Rect, tol = 1): P3[] =>
  points.filter((p) => {
    const [x, y] = screenOf(cam, p);
    return x < rect.x0 - tol || x > rect.x1 + tol || y < rect.y0 - tol || y > rect.y1 + tol;
  });

export const lerpCam = (a: Cam, b: Cam, t: number): Cam => ({
  focus: [a.focus[0] + (b.focus[0] - a.focus[0]) * t, a.focus[1] + (b.focus[1] - a.focus[1]) * t],
  zoom: a.zoom * Math.pow(b.zoom / a.zoom, t),
  screen: [
    (a.screen ?? [540, 760])[0] + ((b.screen ?? [540, 760])[0] - (a.screen ?? [540, 760])[0]) * t,
    (a.screen ?? [540, 760])[1] + ((b.screen ?? [540, 760])[1] - (a.screen ?? [540, 760])[1]) * t,
  ],
});

/** Camera that frames a set of 3D points (an object's corners): the projected box fills `fill` of the frame width
 *  (or of the graphics band height, whichever is tighter). Use it so the main object meets §19.2 (≥ 35–40 %)
 *  without guessing zoom numbers. */
export const camOn = (points: P3[], fill = 0.55, screen: [number, number] = [540, 720]): Cam => {
  // root cause of a past miss: a camera built from three points that were not the extremes of the object came out far
  // too close. Pass the corners of a BOX (boxCorners / camOnBox) or at least every extreme point of the object.
  if (points.length < 4) throw new Error(`camOn: ${points.length} point(s); pass the corners of a box (boxCorners, camOnBox) so the framing covers the whole object`);
  const xy = points.map((p) => roomPoint(p));
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const w = Math.max(1, Math.max(...xs) - Math.min(...xs));
  const h = Math.max(1, Math.max(...ys) - Math.min(...ys));
  const band = FRAME_BOTTOM - 40 - GRAPHICS_TOP;
  const zoom = Math.min((1080 * fill) / w, (band * fill) / h);
  return {focus: [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2], zoom, screen};
};

/** The eight corners of an axis-aligned box (at, size) for camOn. */
export const boxCorners = ([x, y, z]: P3, [dx, dy, dz]: P3): P3[] =>
  [0, 1].flatMap((i) => [0, 1].flatMap((j) => [0, 1].map((k) => [x + i * dx, y + j * dy, z + k * dz] as P3)));

/** Screen pixel of a room point under a camera (what RoomSvg shows). Use it to pin frontal plates (FrontalLayer)
 *  to objects: plates stay screen-aligned and keep their pixel size whatever the zoom (§20.4). */
export const screenOf = (cam: Cam, p: P3): [number, number] => {
  const [rx, ry] = roomPoint(p);
  const [sx, sy] = cam.screen ?? [540, 760];
  return [sx + cam.zoom * (rx - cam.focus[0]), sy + cam.zoom * (ry - cam.focus[1])];
};

/** Camera on an axis-aligned box in room units: the safe way to frame an object (all eight corners). */
export const camOnBox = (min: P3, size: P3, fill = 0.55, screen: [number, number] = [540, 720]): Cam => camOn(boxCorners(min, size), fill, screen);

/** Fit by HEIGHT so one subject fills the vertical frame. Width may run past the sides (RoomSvg fades it).
 *  The usual camFit is limited by the wider side, which left a short room floating in the upper half (PR #14, PR #38). */
export const camFitHeight = (points: P3[], opts: Parameters<typeof camFit>[1] = {}): Cam => {
  const rect = opts.rect ?? safeRect();
  const mid = (rect.x0 + rect.x1) / 2;
  return camFit(points, {...opts, rect: {...rect, x0: mid - 8000, x1: mid + 8000}});
};

/** The camera breathes (regulation v3.0, section 9): a slow push-in of `amount` (2–3 %) over a shot, t = 0..1 of the
 *  shot. Framing stays camFit's: only the zoom grows around the same focus. */
export const breathe = (cam: Cam, t: number, amount = 0.025): Cam => ({...cam, zoom: cam.zoom * (1 + amount * Math.max(0, Math.min(1, t)))});

/** Parallax: the screen shift (px) of a layer at depth `depth` (−1 = near foreground, 0 = the hero, 1 = far
 *  background) for a camera drift of `drift` px at the hero. The foreground moves faster than the background. */
export const parallaxShift = (drift: number, depth: number) => drift * (depth < 0 ? 1 + 0.6 * -depth : 1 - 0.5 * depth) - drift;
