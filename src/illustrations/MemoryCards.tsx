import React from 'react';
import {COLORS, STROKE} from '../theme/tokens';

// Frontal memory cards with simple line drawings (no text). Size 240 × 170 in local px.
export const CARD_W = 240;
export const CARD_H = 170;

const Street: React.FC = () => (
  <g fill="none" stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeLinejoin="round">
    <path d="M30,140 L30,80 L60,55 L90,80 L90,140" fill={COLORS.fillMid} />
    <path d="M100,140 L100,60 L150,60 L150,140" fill={COLORS.fillLight} />
    <path d="M160,140 L160,90 L190,70 L215,90 L215,140" fill={COLORS.fillMid} />
    <rect x={115} y={75} width={12} height={14} />
    <rect x={133} y={75} width={12} height={14} />
    <line x1={15} y1={140} x2={225} y2={140} />
  </g>
);

const Ticket: React.FC = () => (
  <g fill="none" stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeLinejoin="round">
    <path d="M30,50 L210,50 L210,75 A12,12 0 0 0 210,99 L210,125 L30,125 L30,99 A12,12 0 0 0 30,75 Z" fill={COLORS.fillLight} />
    <line x1={160} y1={55} x2={160} y2={120} strokeDasharray="6 6" />
    <line x1={50} y1={75} x2={130} y2={75} />
    <line x1={50} y1={98} x2={110} y2={98} />
  </g>
);

const Wave: React.FC = () => (
  <g fill="none" stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeLinecap="round">
    <circle cx={180} cy={55} r={18} />
    <path d="M20,105 Q50,80 80,105 T140,105 T200,105 T230,105" />
    <path d="M20,130 Q50,110 80,130 T140,130 T200,130" />
  </g>
);

const Party: React.FC = () => (
  <g fill="none" stroke={COLORS.ink} strokeWidth={STROKE.secondary} strokeLinejoin="round">
    <path d="M120,140 C60,100 70,55 98,55 C110,55 118,66 120,72 C122,66 130,55 142,55 C170,55 180,100 120,140 Z" fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth={STROKE.secondary} />
    <circle cx={45} cy={60} r={6} fill={COLORS.accent} />
    <circle cx={200} cy={70} r={6} fill={COLORS.accent} />
    <path d="M40,120 l14,-10 M195,125 l-12,-12" />
  </g>
);

export const MemoryCard: React.FC<{kind: 'street' | 'ticket' | 'wave' | 'party' | 'blank'; novel?: boolean}> = ({kind, novel = true}) => (
  <g>
    <rect x={0} y={0} width={CARD_W} height={CARD_H} rx={12} fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth={STROKE.main} />
    {kind === 'street' ? <Street /> : kind === 'ticket' ? <Ticket /> : kind === 'wave' ? <Wave /> : kind === 'party' ? <Party /> : null}
    {novel ? <rect x={14} y={14} width={46} height={16} rx={4} fill={COLORS.accent} /> : null}
  </g>
);

/** Head profile outline (memory). Local box ≈ 260 × 300. */
export const HEAD_PATH =
  'M120,290 L120,240 C70,235 40,205 45,170 L20,150 L45,135 C35,60 90,10 160,10 C230,10 265,60 255,130 C250,175 225,200 210,215 L210,290';
