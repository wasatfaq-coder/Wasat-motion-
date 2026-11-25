import {TextureDefs} from '../theme/textures';
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {depthOf, Point3, Projection} from '../vendor/anatomy/iso-kit';
import {ATLAS_BG, ATLAS_CSS, ANATOMY_CSS} from '../theme/anatomy';
import {ROOM_S} from './camera';
import {P3} from './iso';

// Adapter between the Anatomy core (src/vendor/anatomy, MIT) and our Remotion scenes (MASTER_PROMPT_FINAL §22).
// At azimuth 45° and elevation 35.264° the kit matches our isometric projection (src/lib/iso.ts):
// x' = cos30·(x − y)·s, y' = 0.5·(x + y)·s − z·s, with Anatomy scale = 0.96825·s (scale·√1.6 = 1.22474·s).
// 35.264° is OUR isometry. Anatomy's own default elevation is 30°; do not switch to it or iso.ts stops matching.
export const ANATOMY_ELEVATION = (Math.asin(Math.tan(Math.PI / 6)) * 180) / Math.PI; // 35.264°
/** A scene may turn the kit camera. 45° is the default and the only angle that matches src/lib/iso.ts. */
export const ANATOMY_AZIMUTH = {min: 35, max: 60, default: 45} as const;
const SCALE_FROM_S = (Math.cos(Math.PI / 6) / Math.cos(Math.PI / 4)) / Math.sqrt(1.6); // 0.96825

/** Projection for kit geometry drawn inside RoomSvg: `unitsPerRoomUnit` kit units make one room unit.
 *  `azimuth` is degrees, 35–60, default 45. The scale stays the 45° match with iso.ts, so the default
 *  call is unchanged. A scene that passes another azimuth rotates only the kit camera. */
export const anatomyProjection = (unitsPerRoomUnit = 1, azimuth: number = ANATOMY_AZIMUTH.default): Projection => {
  if (azimuth < ANATOMY_AZIMUTH.min || azimuth > ANATOMY_AZIMUTH.max) {
    throw new Error(`anatomyProjection: azimuth ${azimuth}° is outside ${ANATOMY_AZIMUTH.min}–${ANATOMY_AZIMUTH.max}°`);
  }
  return {
    origin: [0, 0],
    scale: (ROOM_S / unitsPerRoomUnit) * SCALE_FROM_S,
    azimuth,
    elevation: ANATOMY_ELEVATION,
  };
};

/** Kit point → room point (for roomPoint / camOn cameras). */
export const toRoom = ([x, y, z]: Point3, unitsPerRoomUnit = 1): P3 => [x / unitsPerRoomUnit, y / unitsPerRoomUnit, z / unitsPerRoomUnit];

/** Wraps a scene so the kit's CSS classes take our palette. Use once per scene, around RoomSvg. */
/** `look="atlas"`: the upstream Anatomy light look (near-white solids, grey shades, thin contour, no patterns), for
 *  trying it against the house look (sketches only until the regulation says otherwise). */
export const AnatomyStage: React.FC<{children: React.ReactNode; look?: 'house' | 'atlas'}> = ({children, look = 'house'}) => (
  <AbsoluteFill className="iso" data-theme="light" data-look={look} style={look === 'atlas' ? {background: ATLAS_BG} : undefined}>
    <style>{ANATOMY_CSS}</style>
    {look === 'atlas' ? <style>{ATLAS_CSS}</style> : null}
    <TextureDefs />
    {children}
  </AbsoluteFill>
);

/** Kit SVG strings are deterministic markup built from fixed inputs; this inserts them into the scene's SVG. */
export const Kit: React.FC<{svg: string; transform?: string; opacity?: number}> = ({svg, transform, opacity}) => (
  <g transform={transform} opacity={opacity} dangerouslySetInnerHTML={{__html: svg}} />
);

export type Painted = {at: Point3; svg: string};

/** Painter's order: back to front by true depth (larger depthOf = nearer the viewer). */
export const paint = (items: Painted[], P: Projection) =>
  [...items].sort((a, b) => depthOf(a.at, P) - depthOf(b.at, P)).map((i) => i.svg).join('');
