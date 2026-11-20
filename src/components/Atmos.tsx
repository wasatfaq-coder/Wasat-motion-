import React from 'react';
import {COLORS} from '../theme/tokens';

// The thin light of the house style (MASTER_PROMPT_FINAL v3.0, section 7), over the scene and under the captions:
// a soft gradient of the field toward the hero, a light vignette and a paper grain of 2–3 %. All in the palette: the
// gradient and the vignette are the background mixed toward ink, never a new hue. On the one dark scene the vignette is
// deeper. The grain is a seeded SVG turbulence: the same on every frame (deterministic, section 16).
// Contact shadows under bodies and in the joints of parts are drawn by the kit itself (the halo of each solid, §7).

/** The field under the scene: a soft glow of the background toward the hero. Pass it as RoomSvg's `under`. */
export const AtmosField: React.FC<{hero?: [number, number]; dark?: boolean}> = ({hero = [540, 990], dark = false}) => (
  <>
    <defs>
      <radialGradient id="atmos-glow" cx={hero[0]} cy={hero[1]} r={760} gradientUnits="userSpaceOnUse">
        <stop offset={0} stopColor={dark ? COLORS.plateDark : COLORS.fillLight} stopOpacity={0.9} />
        <stop offset={1} stopColor={dark ? COLORS.plateDark : COLORS.fillLight} stopOpacity={0} />
      </radialGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#atmos-glow)" />
  </>
);

/** Over the scene, under the captions: the paper grain and the vignette. */
export const Atmos: React.FC<{dark?: boolean; grain?: number}> = ({dark = false, grain = 0.025}) => {
  const tint = dark ? COLORS.ink : COLORS.inkSoft;
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <defs>
        <radialGradient id="atmos-vignette" cx={0.5} cy={0.52} r={0.78}>
          <stop offset={0.55} stopColor={tint} stopOpacity={0} />
          <stop offset={1} stopColor={tint} stopOpacity={dark ? 0.45 : 0.14} />
        </radialGradient>
        <filter id="atmos-grain" x={0} y={0} width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={7} />
          <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.27  0 0 0 0 0.24  0 0 0 1 0" />
        </filter>
      </defs>
      <rect width={1080} height={1920} filter="url(#atmos-grain)" opacity={grain} />
      <rect width={1080} height={1920} fill="url(#atmos-vignette)" />
    </svg>
  );
};
