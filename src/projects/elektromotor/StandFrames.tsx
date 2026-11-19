import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AnatomyStage, Kit, toRoom} from '../../lib/anatomy';
import {onTop} from '../../lib/assembly';
import {Rect, RoomSvg, screenOf} from '../../lib/camera';
import {screenDir} from '../../lib/handed';
import {COLORS, STROKE} from '../../theme/tokens';
import {FrontalLayer, Plate} from '../../components/Frontal';
import {STAND, STAND_P, STAND_U} from './stand.parts';
import {FIELD, forceDir, insetRect, LABEL_ANCHORS, LABEL_LIFT, LABEL_SIZE, partsOf, REEL_RECT, reelState, StandState, STILL_RECT_OF, stillState} from './stand.motion';
export {REEL_FRAMES} from './stand.motion';

// Style frames of the field stand (STOP 2, scenes 2–5) and the silent test reel. The state of every frame comes from
// stand.motion.ts (pure, read by scripts/motion-check.mjs); this file only draws it.
const P = STAND_P;

const norm2 = (v: [number, number]): [number, number] => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};
const Inset: React.FC<{x: number; y: number; opacity: number}> = ({x, y, opacity}) => {
  // a plan view looking down the wire, turned like the stand on screen: the current comes out of the page (dot); the
  // field and the force use the SAME screen directions as the 3D arrows (derived from the same vectors)
  const c = {x: x + 120, y: y + 100};
  const hi = COLORS.ink;
  const X = norm2(screenDir(FIELD, P));
  const Y = norm2(screenDir(forceDir([0, 0, 1]), P));
  const pt = (v: number[], k: number) => `${c.x + v[0] * k} ${c.y + v[1] * k}`;
  const head = (v: number[], k: number, w: number, fill: string, stroke: string) => {
    const base = [c.x + v[0] * (k - 24), c.y + v[1] * (k - 24)];
    const n = [-v[1], v[0]];
    return <path d={`M${pt(v, k)} L${base[0] + n[0] * w} ${base[1] + n[1] * w} L${base[0] - n[0] * w} ${base[1] - n[1] * w} Z`} fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />;
  };
  return (
    <g opacity={opacity}>
      <rect x={x + 6} y={y + 6} width={240} height={240} rx={22} fill={COLORS.fillDark} />
      <rect x={x} y={y} width={240} height={240} rx={22} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} />
      <path d={`M${pt(X, -70)} L${pt(X, 76)}`} stroke={COLORS.inkSoft} strokeWidth={4} strokeDasharray="14 10" fill="none" />
      {head(X, 100, 10, COLORS.inkSoft, COLORS.inkSoft)}
      <path d={`M${pt(Y, 14)} L${pt(Y, 62)}`} stroke={hi} strokeWidth={14} strokeLinecap="butt" fill="none" />
      <path d={`M${pt(Y, 14)} L${pt(Y, 62)}`} stroke={COLORS.fillLight} strokeWidth={8} strokeLinecap="butt" fill="none" />
      {head(Y, 92, 17, COLORS.fillLight, hi)}
      <circle cx={c.x} cy={c.y} r={16} fill={COLORS.accent} stroke={hi} strokeWidth={STROKE.secondary} />
      <circle cx={c.x} cy={c.y} r={4.5} fill={hi} />
    </g>
  );
};

const StandView: React.FC<{state: StandState; rect: Rect; bottom: number}> = ({state, rect, bottom}) => {
  const {extra, arrows} = partsOf(state);
  const picture = onTop(STAND.svgFaded(extra), arrows.map((a) => (a.opacity < 0.999 ? `<g opacity="${a.opacity.toFixed(3)}">${a.svg}</g>` : a.svg)), 'force arrows are never hidden behind a part (motion-check ties them to their owners)');
  const nPos = screenOf(state.cam, toRoom(LABEL_ANCHORS.N, STAND_U));
  const sPos = screenOf(state.cam, toRoom(LABEL_ANCHORS.S, STAND_U));
  const ins = insetRect(rect);
  return (
    <AnatomyStage>
      <RoomSvg cam={state.cam} bottom={bottom} sides={90}>
        <g className="ns">
          <Kit svg={picture} />
        </g>
      </RoomSvg>
      <FrontalLayer>
        <Plate at={[nPos[0], nPos[1] - LABEL_LIFT]} to={nPos} text="С" size={LABEL_SIZE} show={state.labels} />
        <Plate at={[sPos[0], sPos[1] - LABEL_LIFT]} to={sPos} text="Ю" size={LABEL_SIZE} show={state.labels} />
        {state.inset > 0.001 ? <Inset x={ins.x} y={ins.y} opacity={state.inset} /> : null}
      </FrontalLayer>
    </AnatomyStage>
  );
};

/** Style frames: frame 0 scene 2, 1 scene 3, 2 scene 4, 3 scene 5. still-check reads these four frames. */
export const ElektromotorStand: React.FC = () => {
  const frame = useCurrentFrame();
  return <StandView state={stillState(frame)} rect={STILL_RECT_OF} bottom={STILL_RECT_OF.y1 + 40} />;
};

/** Silent test reel: the four beats; the loop turns between them and the last beat returns to the first (loops). */
export const ElektromotorReel: React.FC = () => {
  const frame = useCurrentFrame();
  return <StandView state={reelState(frame)} rect={REEL_RECT} bottom={REEL_RECT.y1 + 40} />;
};
