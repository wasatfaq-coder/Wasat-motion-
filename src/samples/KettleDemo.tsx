import React from 'react';
import {Sequence, useCurrentFrame} from 'remotion';
import {Assembly, Dyn, Point3} from '../lib/assembly';
import {AnatomyStage, Kit, toRoom} from '../lib/anatomy';
import {boxCorners, breathe, Cam, camFit, Rect, RoomSvg, screenOf} from '../lib/camera';
import {settle} from '../lib/motion';
import {Atmos, AtmosField} from '../components/Atmos';
import {ChapterMark} from '../components/Atlas';
import {CaptionLine, wordReveal} from '../components/Captions';
import {FrontalLayer, ListPlate} from '../components/Frontal';
import {HonestyTag, LoupeInset, TriSync} from '../components/Explain';
import {bubbles, kettleCoil, kettleInside, kettleShell, KC, kitchen, mug, P, R, steam, thermostat, U, Z0} from './kettle.parts';

// «Как работает чайник»: a MOVING sketch of the style (not a topic), 11 s at 30 fps, no voice: a hook, a cut-open view
// with the heating running (one quantity in three views from one clock), the dark answer chapter with the thermostat
// bending in a loupe until the contact opens, and the finale on the same kettle. Everything is a pure function of the
// frame; the click of the chapter mark and of the thermostat are real sounds (switch.wav).

export const KETTLE_FPS = 30;
const SHOTS = [
  {from: 0, len: 72}, // hook (light)
  {from: 72, len: 96}, // Табл. 01 (light): the section, heating
  {from: 168, len: 96}, // Табл. 02 (dark): the thermostat
  {from: 264, len: 66}, // finale (light)
];
export const KETTLE_DEMO_FRAMES = 330;

const GRAPHICS: Rect = {x0: 70, x1: 900, y0: 600, y1: 1420};
const room = (p: Point3) => toRoom(p, U);
const px = (cam: Cam, p: Point3) => screenOf(cam, room(p));

// the worlds are built once per variant (the geometry is fixed; only the steam, the bubbles and the shell's opacity change):
// the scene (kitchen, mug, power base, water), the coil (lit or not) and the shell (the body, lid, lip, handle, switch)
type World = {scene: Assembly; coil: Assembly; shell: Assembly; spout: Point3; at: (r: number, z: number, a?: number) => Point3};
const cache = new Map<string, World>();
const world = (coilOn: boolean, withMug: boolean): World => {
  const key = `${coilOn}${withMug}`;
  let w = cache.get(key);
  if (!w) {
    const scene = new Assembly('k.scene', P, {role: 'hero'});
    kitchen(scene);
    kettleInside(scene, KC, Z0 + 2.4);
    if (withMug) mug(scene, 62, 20);
    const coil = new Assembly('k.coil', P, {role: 'hero'});
    kettleCoil(coil, KC, Z0 + 2.4, {coilOn});
    const shell = new Assembly('k.shell', P, {role: 'hero'});
    const k = kettleShell(shell, KC, Z0 + 2.4, {coilOn});
    w = {scene, coil, shell, spout: k.spout, at: k.at};
    cache.set(key, w);
  }
  return w;
};
/** the picture of a world: the scene (with `inner` extras such as bubbles), the coil, then the shell at `shell` opacity
 *  with `outer` extras (steam). A shell below 1 is the x-ray: the water and the coil show through. */
const draw = (w: World, shell: number, inner: Dyn[] = [], outer: Dyn[] = []) =>
  w.scene.svg({}, {extra: inner}) + w.coil.svg() + `<g opacity="${shell.toFixed(3)}">${w.shell.svg({}, {extra: outer})}</g>`;
const thermo = new Map<number, string>();
const thermoSvg = (bend: number) => {
  const q = Math.round(bend * 20);
  let s = thermo.get(q);
  if (!s) thermo.set(q, (s = thermostat(q / 20).svg()));
  return s;
};

const FULL_BOX = camFitBox([10, 4, Z0], [60, 30, 42]);
const SEC_BOX = camFitBox([14, 4, Z0], [44, 32, 36]);
function camFitBox(lo: Point3, hi: Point3): [Point3, Point3] {
  return [room(lo), room([hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]])];
}
const fit = (box: [Point3, Point3], fill: number, bottom = 0, rect: Rect = GRAPHICS) => camFit(boxCorners(...box), {rect, fill, margin: {bottom}});

type Page = {dark?: boolean; svg: string; cam: Cam; overlay: React.ReactNode};

const Caption: React.FC<{words: string[]; key_: number; every?: number; dark?: boolean}> = ({words, key_, every = 8, dark}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 64, right: 176, top: 262}}>
      <CaptionLine words={words.map((text, i) => ({text, reveal: wordReveal(f, 4 + i * every)}))} keyIndex={key_} dark={dark} />
    </div>
  );
};

const Shot: React.FC<{page: Page; chapter?: [number, number, string]; words: string[]; key_: number}> = ({page, chapter, words, key_}) => (
  <>
    <RoomSvg cam={page.cam} dark={page.dark} fade={70} sides={60} under={<AtmosField hero={[480, 960]} dark={page.dark} />}>
      <Kit svg={page.svg} />
    </RoomSvg>
    <Atmos dark={page.dark} />
    {page.overlay}
    {chapter ? <ChapterMark n={chapter[0]} of={chapter[1]} title={chapter[2]} dark={page.dark} from={6} /> : null}
    <Caption words={words} key_={key_} dark={page.dark} />
  </>
);

const T = (f: number, from: number) => (f + from) / KETTLE_FPS; // global seconds for the particles

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const w = world(true, true);
  const svg = draw(w, 1, [], steam(w.spout, 22, T(f, 0)));
  const cam = breathe(fit(FULL_BOX, 0.9), f / 72);
  return <Shot page={{svg, cam, overlay: null}} words={['Почему', 'чайник', 'сам', 'отключается?']} key_={2} />;
};

const Section: React.FC = () => {
  const f = useCurrentFrame();
  const w = world(true, false);
  const t = Math.min(1, f / 90);
  const shell = 1 - 0.72 * settle(Math.min(1, Math.max(0, (f - 4) / 16))); // the shell turns translucent: an x-ray
  const svg = draw(w, shell, bubbles(KC, 16, T(f, 72)), steam(w.spout, 10, T(f, 72)));
  const cam = breathe(fit(SEC_BOX, 0.92, 400), f / 96);
  return (
    <Shot
      page={{
        svg,
        cam,
        overlay: (
          <FrontalLayer>
            <TriSync x={70} y={1060} w={560} t={t} total={167} curve={[[0, 20], [0.2, 36], [0.4, 52], [0.6, 68], [0.8, 84]]} unit="секунд" yUnit="°C" yMax={100} source="Расчёт: 1 л, 2 кВт, без потерь" />
            <HonestyTag x={70} y={1470} kind="sped" note="×55" show={settle(Math.min(1, f / 10))} />
            <HonestyTag x={390} y={1470} kind="simplified" note="корпус условно прозрачный" show={settle(Math.min(1, Math.max(0, (f - 10) / 10)))} />
          </FrontalLayer>
        ),
      }}
      chapter={[1, 4, 'как нагревается']}
      words={['Спираль', 'греет', 'воду', 'снизу']}
      key_={1}
    />
  );
};

const Answer: React.FC = () => {
  const f = useCurrentFrame();
  const bend = settle(Math.min(1, Math.max(0, (f - 10) / 52)));
  const clicked = f >= 66;
  const w = world(!clicked, false);
  const svg = draw(w, 1, [], steam(w.spout, clicked ? Math.max(2, 30 - (f - 66)) : 8 + Math.round(bend * 24), T(f, 168)));
  const cam = breathe(fit(FULL_BOX, 0.92, 0, {...GRAPHICS, y0: 560, y1: 1050}), f / 96);
  const flash = clicked && f < 76 ? 1 - (f - 66) / 10 : 0;
  return (
    <>
      <Shot
        page={{
          dark: true,
          svg,
          cam,
          overlay: (
            <FrontalLayer>
              <LoupeInset id="loupe-th" x={270} y={1190} r={180} at={px(cam, w.at(R + 2, 6))} svg={thermoSvg(bend)} dark tag={<HonestyTag x={0} y={0} kind="scale" note="×6" dark />} show={settle(Math.min(1, f / 14))} />
              <ListPlate x={480} y={1090} w={420} title="Упрощённо. На деле:" rows={[['биметалл гнётся'], ['от пара, 100 °C']]} foot="Принцип · без деталей" dark show={settle(Math.min(1, Math.max(0, (f - 24) / 20)))} />
              {flash > 0 ? <circle cx={270} cy={1190} r={180 + 30 * (1 - flash)} fill="none" stroke="var(--anatomy-lit-top)" strokeWidth={6} opacity={flash} /> : null}
            </FrontalLayer>
          ),
        }}
        chapter={[2, 4, 'главный ответ']}
        words={['Пар', 'сам', 'выключает', 'чайник']}
        key_={0}
      />
      {clicked ? <ClickSound at={66} /> : null}
    </>
  );
};

import {Audio} from '@remotion/media';
import {staticFile} from 'remotion';
const ClickSound: React.FC<{at: number}> = ({at}) => (
  <Sequence durationInFrames={30} layout="none">
    <Audio src={staticFile('audio/sfx/switch.wav')} volume={0.8} />
    <span style={{display: 'none'}}>{at}</span>
  </Sequence>
);

const Finale: React.FC = () => {
  const f = useCurrentFrame();
  const w = world(false, true);
  const svg = draw(w, 1, [], steam(w.spout, Math.max(0, 8 - Math.floor(f / 8)), T(f, 264)));
  const cam = breathe(fit(FULL_BOX, 0.9), 1 - f / 120);
  return <Shot page={{svg, cam, overlay: null}} words={['Пар', 'выключил', 'чайник', 'сам']} key_={3} />;
};

export const KettleDemo: React.FC = () => (
  <AnatomyStage>
    <Sequence from={SHOTS[0].from} durationInFrames={SHOTS[0].len}>
      <Hook />
    </Sequence>
    <Sequence from={SHOTS[1].from} durationInFrames={SHOTS[1].len}>
      <Section />
    </Sequence>
    <Sequence from={SHOTS[2].from} durationInFrames={SHOTS[2].len}>
      <Answer />
    </Sequence>
    <Sequence from={SHOTS[3].from} durationInFrames={SHOTS[3].len}>
      <Finale />
    </Sequence>
  </AnatomyStage>
);
