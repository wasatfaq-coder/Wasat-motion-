import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AnatomyStage, Kit, toRoom} from '../lib/anatomy';
import {breathe, Cam, camFitSvg, parallaxShift, RoomSvg, safeRect, screenOf} from '../lib/camera';
import {cascade, layers, snap} from '../lib/motion';
import {morph, resample, transitionProblems, TRANSITIONS} from '../lib/transitions';
import {Assembly, Point3} from '../lib/assembly';
import {unitGrid} from '../lib/units';
import {AtmosField, Atmos} from '../components/Atmos';
import {Callouts, ChapterMark} from '../components/Atlas';
import {CaptionLine} from '../components/Captions';
import {CounterPlate, FrontalChart, FrontalLayer, ListPlate, TruthPlate} from '../components/Frontal';
import {DeriveChain, HonestyTag, TriSync, UnknownCard} from '../components/Explain';
import {COLORS, STROKE} from '../theme/tokens';
import {UNI_P, UNI_U} from './kit/projection';
import {PHONE} from './kit/device.parts';
import {DATA} from './kit/data.parts';
import {LAB} from './kit/nature.parts';

// Showcase of the delivery of regulation v3.0 (sections 7, 9, 10, 11): captions on top with the dark pill and words
// coming out of blur, the chapter mark «Табл.» with the sound signature, atlas callouts, the plates (counter, list,
// chart with its source, the moment of truth), the thin light, the one dark scene, the camera breathing, parallax,
// cascades and the morph «real → scheme». Kit objects only; illustrative values, not a topic. Frame N shows page N.

type Page = {id: string; draw: (cam: Cam) => React.ReactNode; svg: string; cam: Cam; dark?: boolean; caption: {words: string[]; key: number; spoken: number}; chapter?: [number, number, string]};

// framed by what each page draws; pages with plates keep the bottom of the band for them
const fitOf = (svg: string, plates = 0) => camFitSvg(svg, {rect: safeRect(), fill: 0.92, margin: {bottom: plates}});
const px = (cam: Cam, kit: Point3) => screenOf(cam, toRoom(kit, UNI_U));

// a quarter-second into a shot: the camera has breathed a little, the foreground drifted with parallax
const T = 0.4;

const GRID = (() => {
  const g = new Assembly('units', UNI_P, {role: 'prop'});
  unitGrid(g, 'g', [0, 0, 0], 40, {cols: 8, marked: 1});
  return g;
})();

const PAGES: Page[] = [
  {
    id: 'hook: captions on top, the pill, words from blur, callouts',
    svg: PHONE.svg(),
    cam: breathe(fitOf(PHONE.svg(), 140), T),
    caption: {words: ['Почему', 'экран', 'светится', 'сам?'], key: 2, spoken: 3},
    draw: (cam) => <Callouts items={[{n: 1, label: 'экран', at: px(cam, [7, 16, 1.7]), to: [120, 1400], show: 1}, {n: 2, label: 'зарядка', at: px(cam, [17, 14.5, 0.6]), to: [860, 1400], show: snap(0.7)}]} />,
  },
  {
    id: 'chapter: Табл., counter and list plates, cascade',
    svg: DATA.svg(),
    cam: breathe(fitOf(DATA.svg(), 330), T),
    chapter: [1, 4, 'из чего складывается'],
    caption: {words: ['Сто', 'сорок', 'литров', 'воды'], key: 2, spoken: 4},
    draw: () => (
      <FrontalLayer>
        <CounterPlate x={90} y={1200} t={snap(0.8)} to={140} unit="литров на чашку" source="Иллюстрация · 2026" />
        <g transform={`translate(${parallaxShift(18, -1).toFixed(1)} 0)`}>
          <ListPlate x={585} y={1180} w={310} rows={[['зерно', '130 л'], ['обжарка', '6 л'], ['чашка', '4 л']]} title="Состав" highlight={0} show={cascade(40, 2, {step: 3, dur: 12})} />
        </g>
      </FrontalLayer>
    ),
  },
  {
    id: 'the one dark scene: truth plate and chart with its source',
    svg: LAB.svg(),
    cam: breathe(fitOf(LAB.svg(), 330), T),
    dark: true,
    chapter: [2, 4, 'главный ответ'],
    caption: {words: ['На', 'деле', 'всё', 'проще'], key: 1, spoken: 4},
    draw: () => (
      <FrontalLayer>
        <TruthPlate x={80} y={1220} w={420} fact="кипение при 100 °C" source="Иллюстрация · 2026" dark />
        <FrontalChart x={540} y={1170} w={340} h={230} kind="bar" data={[{label: 'А', value: 3}, {label: 'Б', value: 7}]} unit="ед." highlight={1} source="Иллюстрация · 2026" />
      </FrontalLayer>
    ),
  },
  {
    id: 'morph real → scheme, the three layers',
    svg: PHONE.svg(),
    cam: breathe(fitOf(PHONE.svg(), 330), 1),
    caption: {words: ['Деталь', 'становится', 'схемой'], key: 2, spoken: 3},
    draw: () => {
      const real: [number, number][] = resample([[0, 0], [220, 0], [220, 120], [180, 160], [40, 160], [0, 120]], 24);
      const scheme: [number, number][] = [[0, 30], [220, 30], [220, 130], [0, 130]];
      const L = layers(60, 30);
      const sequenceOk = transitionProblems(['zoom-into-detail', TRANSITIONS[4], 'hard-cut'], [1, 1, 2]).length === 0;
      return (
        <FrontalLayer>
          <g transform="translate(330 1170)">
            <path d={morph(real, scheme, L.event)} fill={COLORS.fillLight} stroke={sequenceOk ? COLORS.ink : COLORS.accent} strokeWidth={STROKE.main} strokeLinejoin="round" />
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={40 + i * 70} cy={200} r={10 * L.response(i)} fill={COLORS.ink} />
            ))}
            <circle cx={260} cy={60 + 20 * Math.sin(L.life * Math.PI * 2)} r={6} fill={COLORS.inkSoft} />
          </g>
        </FrontalLayer>
      );
    },
  },
  {
    id: 'unit grid: one missile = forty drones, the honesty tag',
    svg: GRID.svg(),
    cam: breathe(fitOf(GRID.svg(), 250), T),
    chapter: [3, 4, 'один к сорока'],
    caption: {words: ['Одна', 'ракета', 'покупает', 'сорок'], key: 3, spoken: 4},
    draw: () => (
      <FrontalLayer>
        <HonestyTag x={80} y={1240} kind="scale" note="значки условны" />
        <HonestyTag x={80} y={1300} kind="simplified" />
      </FrontalLayer>
    ),
  },
  {
    id: 'light chapter: a number derived on screen, three views, the unknown',
    svg: DATA.svg(),
    cam: breathe(fitOf(DATA.svg(), 520), T),
    chapter: [4, 4, 'сколько это в цифрах'],
    caption: {words: ['Число', 'видно', 'целиком'], key: 0, spoken: 3},
    draw: () => (
      <FrontalLayer>
        <DeriveChain x={70} y={960} w={440} steps={[{text: 'импульсов', value: '780'}, {text: 'в секунду', value: '2'}, {text: 'секунд', value: '390'}]} progress={0.95} source="Иллюстрация · 2026" />
        <TriSync x={530} y={930} w={370} t={0.62} total={3000} curve={[[0, 10], [0.25, 5], [0.5, 3], [0.75, 1.5]]} unit="импульсов" yUnit="мм" yMax={10} source="Иллюстрация · 2026" />
        <UnknownCard x={70} y={1240} w={440} title="Цена перехватчика" source="не публикуется · 2026" />
      </FrontalLayer>
    ),
  },
];

export const DELIVERY_PAGES = PAGES.length;

export const DeliverySample: React.FC = () => {
  const page = PAGES[Math.min(PAGES.length - 1, useCurrentFrame())];
  return (
    <AnatomyStage>
      <RoomSvg cam={page.cam} dark={page.dark} fade={60} under={<AtmosField hero={[480, 1000]} dark={page.dark} />}>
        <Kit svg={page.svg} />
      </RoomSvg>
      <Atmos dark={page.dark} />
      {page.draw(page.cam)}
      {page.chapter ? <ChapterMark n={page.chapter[0]} of={page.chapter[1]} title={page.chapter[2]} dark={page.dark} from={-10} sound={false} /> : null}
      <div style={{position: 'absolute', left: 64, right: 176, top: 262}}>
        <CaptionLine words={page.caption.words.map((text, i) => ({text, reveal: i < page.caption.spoken ? 1 : 0.2}))} keyIndex={page.caption.key} dark={page.dark} />
      </div>
    </AnatomyStage>
  );
};
