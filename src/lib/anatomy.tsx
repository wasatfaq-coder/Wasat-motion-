import React from 'react';
import {AbsoluteFill} from 'remotion';
import {depthOf, Point3, Projection} from '../vendor/anatomy/iso-kit';
import {ANATOMY_CSS} from '../theme/anatomy';
import {ROOM_S} from './camera';
import {P3} from './iso';

// Adapter between the Anatomy core (src/vendor/anatomy, MIT) and our Remotion scenes (MASTER_PROMPT_FINAL §22).
// The Anatomy camera at azimuth 45° and elevation 35.264° is exactly our isometric projection (src/lib/iso.ts):
// x' = cos30·(x − y)·s, y' = 0.5·(x + y)·s − z·s, with Anatomy scale = 0.96825·s (scale·√1.6 = 1.22474·s).
export const ANATOMY_ELEVATION = (Math.asin(Math.tan(Math.PI / 6)) * 180) / Math.PI; // 35.264°
const SCALE_FROM_S = (Math.cos(Math.PI / 6) / Math.cos(Math.PI / 4)) / Math.sqrt(1.6); // 0.96825

/** Projection for kit geometry drawn inside RoomSvg: `unitsPerRoomUnit` kit units make one room unit. */
export const anatomyProjection = (unitsPerRoomUnit = 1): Projection => ({
  origin: [0, 0],
  scale: (ROOM_S / unitsPerRoomUnit) * SCALE_FROM_S,
  azimuth: 45,
  elevation: ANATOMY_ELEVATION,
});

/** Kit point → room point (for roomPoint / camOn cameras). */
export const toRoom = ([x, y, z]: Point3, unitsPerRoomUnit = 1): P3 => [x / unitsPerRoomUnit, y / unitsPerRoomUnit, z / unitsPerRoomUnit];

/** Wraps a scene so the kit's CSS classes take our palette. Use once per scene, around RoomSvg. */
export const AnatomyStage: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill className="iso" data-theme="light">
    <style>{ANATOMY_CSS}</style>
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
