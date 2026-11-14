import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {anatomyProjection} from '../lib/anatomy';
import {iso, Point3} from '../vendor/anatomy/iso-kit';
import {COLORS} from '../theme/tokens';

export const MCP_PILOT_FRAMES = 540;
const projection = {...anatomyProjection(12), origin: [480, 785] as [number, number]};
const project = (p: Point3) => iso(p, projection);
const points = (vertices: Point3[]) => vertices.map(project).map(([x, y]) => `${x},${y}`).join(' ');
const Box: React.FC<{at: Point3; size: Point3; active?: boolean}> = ({at: [x, y, z], size: [w, d, h], active}) => {
  const a: Point3 = [x, y, z + h];
  const b: Point3 = [x + w, y, z + h];
  const c: Point3 = [x + w, y + d, z + h];
  const d1: Point3 = [x, y + d, z + h];
  return <g stroke={COLORS.ink} strokeWidth={3.5} strokeLinejoin="round">
    <polygon points={points([d1, c, [x + w, y + d, z], [x, y + d, z]])} fill={COLORS.fillDark}/>
    <polygon points={points([b, c, [x + w, y + d, z], [x + w, y, z]])} fill={COLORS.fillMid}/>
    <polygon points={points([a, b, c, d1])} fill={active ? COLORS.accent : COLORS.fillLight}/>
  </g>;
};
const ramp = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const ease = (t: number) => t * t * (3 - 2 * t);
const Label: React.FC<{x: number; y: number; size?: number; children: React.ReactNode}> = ({x, y, size = 50, children}) =>
  <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight="700" fill={COLORS.ink}>{children}</text>;

export const McpPilotFrame: React.FC<{frame: number}> = ({frame}) => {
  const position = ease(ramp(frame, 39, 204));
  const zoom = ease(ramp(frame, 190, 263));
  const [stationX, stationY] = project([102, 21, 27]);
  const schema = ease(ramp(frame, 258, 282));
  const reply = frame >= 371;
  const travel = reply ? ramp(frame, 371, 451) : ramp(frame, 297, 365);
  const pulseY = reply ? 1170 - travel * 312 : 858 + travel * 312;
  return <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" fontFamily="DejaVu Sans, sans-serif">
    <rect width="1080" height="1920" fill={COLORS.bg}/>
    <g opacity={1 - schema}>
      <Label x={490} y={405} size={104}>Как работает</Label>
      <Label x={490} y={530} size={108}>MCP</Label>
      <g transform={`translate(${zoom * (490 - stationX)} ${zoom * (987 - stationY)}) translate(${stationX} ${stationY}) scale(${1 + zoom * 0.66}) translate(${-stationX} ${-stationY})`}>
        <ellipse cx="525" cy="1163" rx="345" ry="105" fill={COLORS.fillDark}/>
        <Box at={[-17, -9, -12]} size={[149, 64, 12]}/>
        <Box at={[-6, 2, 0]} size={[45, 42, 13]}/>
        <Box at={[-6, 2, 13]} size={[16, 42, 28]}/>
        <Box at={[14, 15, 0]} size={[88, 12, 9]}/>
        {Array.from({length: 9}, (_, i) => <Box key={i} at={[22 + i * 8, 13, 9]} size={[2, 16, 1]}/>)}
        <Box at={[14 + position * 71, 16, 11]} size={[12, 9, 5]} active/>
        <Box at={[102, 1, 0]} size={[21, 40, 48]}/>
        <Box at={[94, 1, 30]} size={[8, 40, 18]}/>
        <Box at={[94, 1, 0]} size={[8, 11, 30]}/>
        <Box at={[94, 32, 0]} size={[8, 9, 30]}/>
        {Array.from({length: 4}, (_, i) => <Box key={i} at={[104, 6 + i * 8, 48]} size={[14, 2, 1]}/>)}
      </g>
      <g opacity={1 - zoom}><Label x={490} y={1380} size={56}>Заявка → станция</Label></g>
    </g>
    <g opacity={schema}>
      <rect x="126" y="430" width="728" height="438" rx="48" fill={COLORS.fillMid} stroke={COLORS.ink} strokeWidth="5"/>
      <Label x={490} y={545} size={58}>Приложение</Label>
      <Label x={490} y={617} size={42}>хост</Label>
      <rect x="222" y="663" width="536" height="145" rx="33" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth="5"/>
      <Label x={490} y={755}>MCP-клиент</Label>
      <path d="M370 875 V1135 m-22 -24 22 25 22 -25 M615 1135 V875 m-22 24 22 -25 22 25" fill="none" stroke={COLORS.ink} strokeWidth="6" strokeLinejoin="round"/>
      <Label x={255} y={1016} size={40}>Вызов</Label>
      <Label x={746} y={1016} size={40}>Результат</Label>
      <circle cx={reply ? 615 : 370} cy={Math.min(1135, Math.max(875, pulseY))} r="17" fill={COLORS.accent} opacity={frame < 460 ? 1 : 0}/>
      <rect x="126" y="1153" width="728" height="239" rx="48" fill={COLORS.fillLight} stroke={COLORS.ink} strokeWidth="5"/>
      <Label x={490} y={1254} size={62}>MCP-сервер</Label>
      <Label x={490} y={1330} size={40}>Выполняет инструмент</Label>
    </g>
  </svg>;
};

export const McpAnatomyPilot: React.FC = () => <McpPilotFrame frame={useCurrentFrame()}/>;
