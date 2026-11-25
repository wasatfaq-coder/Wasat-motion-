import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Assembly, Point3} from '../lib/assembly';
import {AnatomyStage, toRoom} from '../lib/anatomy';
import {boxCorners, breathe, Cam, camFit, screenOf} from '../lib/camera';
import {particles} from '../lib/nature';
import {Atmos} from '../components/Atmos';
import {ChapterMark} from '../components/Atlas';
import {CaptionLine} from '../components/Captions';
import {HonestyTag} from '../components/Explain';
import {ATLAS_LAYOUT, AtlasTable, FormulaPart} from '../components/AtlasTable';
import {hideNear, kettle, KC, kitchen, P, R, thermostat, U, Z0} from './KettleSketch';

// SKETCH of the scene template «Атлас-таблица» (not a topic) on our own kettle: one clock drives the kettle in section,
// the thermostat in the loupe, the temperature graph and the live formula. Textbook physics, no losses: 1 kg of water,
// 4.18 kJ/(kg·K), 2 kW, from 20 to 100 °C in 4.18 × 80 ÷ 2 ≈ 167 s. The switch-off moment is shown, not timed.

export const ATLAS_SKETCH_FRAMES = 360;
const SECONDS = 200; // the clock spans 0..200 s of the process
const BOIL = (4.18 * 80) / 2; // ≈ 167.2 s

const temp = (s: number) => Math.min(100, 20 + (80 * s) / BOIL);
const room = (p: Point3) => toRoom(p, U);
const px = (cam: Cam, p: Point3) => screenOf(cam, room(p));
const num = (v: number, d = 0) => v.toLocaleString('ru-RU', {minimumFractionDigits: d, maximumFractionDigits: d});

export const AtlasTableSketch: React.FC = () => {
  const frame = useCurrentFrame();
  const t = Math.min(1, frame / (ATLAS_SKETCH_FRAMES - 1));
  const s = t * SECONDS;
  const T = temp(s);
  const off = s >= BOIL + 4; // the steam has reached the bimetal strip
  const bend = Math.max(0, Math.min(1, (s - BOIL) / 4));

  const A = new Assembly('k.atlas', P, {role: 'hero'});
  kitchen(A);
  const k = kettle(A, KC, Z0 + 2.4, {heat: !off});
  const rate = T < 70 ? 0 : 4 + 26 * ((T - 70) / 30) * (off ? 0.3 : 1);
  const steam = rate > 0 ? particles(P, 'steam', {at: [KC[0] - 6, KC[1] + 2, Z0 + 36], spread: 1.6, rate}, frame / 60) : [];
  const svg = A.svg({}, {hide: hideNear, extra: steam});
  const cam = breathe(camFit(boxCorners(room([14, 4, Z0]), room([44, 32, 36])), {rect: ATLAS_LAYOUT.main, fill: 0.94}), t);

  const dT = Math.round(T - 20);
  const sec = (4.18 * dT) / 2;
  const parts: FormulaPart[] = [
    {text: '1 кг × 4,18 × '},
    {text: `${dT} К`, tone: 'norm'},
    {text: ' ÷ 2 кВт = ', tone: 'soft'},
    {text: `${num(sec)} с`, tone: 'accent'},
  ];

  const words = off ? ['Пар', 'выключил', 'чайник', 'сам'] : ['Литр', 'закипает', 'за', 'три', 'минуты'];
  const key = off ? 1 : 3;

  return (
    <AnatomyStage>
      <AtlasTable
        t={t}
        main={{svg, cam, hero: [490, 800]}}
        loupe={{id: 'atlas-loupe', svg: thermostat(bend).svg(), at: px(cam, k.at(R + 2, 6)), tag: <HonestyTag x={0} y={0} kind="scale" />}}
        graph={{
          f: (x) => temp(x),
          xMax: SECONDS,
          yMax: 110,
          xUnit: 'с',
          yUnit: '°C',
          xTicks: [0, 60, 120, 180],
          yTicks: [0, 50, 100],
          threshold: {y: 100, label: 'кипение'},
          readout: (_x, y) => `${num(y)} °C`,
        }}
        formula={{parts, source: 'Расчёт: 1 л воды, 2 кВт, от 20 °C, без потерь'}}
        honesty={<HonestyTag x={0} y={0} kind="simplified" note="без потерь" />}
      />
      <Atmos />
      <ChapterMark n={2} of={4} title="как нагревается" sound={false} from={-10} />
      <div style={{position: 'absolute', left: 64, right: 176, top: 262}}>
        <CaptionLine words={words.map((text) => ({text, reveal: 1}))} keyIndex={key} />
      </div>
    </AnatomyStage>
  );
};
