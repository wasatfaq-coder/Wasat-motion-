import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AnatomyStage, Kit, toRoom} from '../../lib/anatomy';
import {Cam, camFit, RoomSvg, safeRect, screenOf} from '../../lib/camera';
import {FrontalLayer, Word} from '../../components/Frontal';
import {CHAR_W, chipAnchor, chipItem, CHIPS, PHONE, PHONE_CORNERS, PHONE_U, PIECES, QUESTION, SCREEN, SCREEN_CORNERS} from './phone.parts';
import {facePoint} from '../../lib/device';

// Style frames of the hero phone (STOP 2): frame 0 = scene 1 wide (the phone on its stand, the answer typed up to the
// fifth piece, that piece coral), frame 1 = scene 1 close-up on the screen. Chat text: neutral Russian (decisions.md
// 19.11.2026); the question and the pieces are an EXAMPLE until the script fixes them. Text is never drawn on the slanted
// face: each piece is a frontal Word pinned to its chip (§20.4).
export const PHONE_STILL_RECT = safeRect({captions: true});

type PhoneState = {typed: number; cam: Cam};

const room = (p: [number, number, number]) => toRoom(p, PHONE_U);
export const phoneStill = (frame: number): PhoneState => {
  const rect = PHONE_STILL_RECT;
  if (frame === 1) return {typed: 5, cam: camFit(SCREEN_CORNERS.map(room), {rect, fill: 0.92})};
  return {typed: 5, cam: camFit(PHONE_CORNERS.map(room), {rect, fill: 0.94})};
};

const PhoneView: React.FC<{state: PhoneState}> = ({state}) => {
  const {typed, cam} = state;
  // text size follows the screen's scale, so a piece always fits its chip (CHAR_W kit units per character)
  const [a, b] = [screenOf(cam, room(facePoint(SCREEN, 0, 0))), screenOf(cam, room(facePoint(SCREEN, 1, 0)))];
  const size = (CHAR_W * Math.hypot(b[0] - a[0], b[1] - a[1])) / 0.7; // bold Cyrillic Rubik runs ≈ 0.7 em a letter
  const last = typed - 1;
  // chips not yet typed are hidden; the last typed chip is drawn as the one coral moving part
  const hidden = new Set(CHIPS.map((c, i) => (i >= typed || i === last ? `phone.${c.name}` : '')).filter(Boolean));
  const picture = PHONE.svg({}, {hide: (n) => hidden.has(n), extra: last >= 0 ? [chipItem(last, {lit: true})] : []});
  const at = (p: [number, number, number]) => screenOf(cam, room(p));
  // the question bubble spans x 0.16·W … W − 0.8, y 5.2 … 8.2 of the screen (device.ts chatUi): two lines in it
  const q = (k: number) => at(facePoint(SCREEN, 6.9, 6.1 + k * 1.2, 0.1));
  // the rows of the face run at this angle on screen (it is turned 10° off the line of sight): the words follow them
  const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return (
    <AnatomyStage>
      <RoomSvg cam={cam}>
        <Kit svg={picture} />
      </RoomSvg>
      <FrontalLayer>
        {QUESTION.map((t, k) => (
          <Word key={t} at={q(k)} text={t} size={size * 0.8} angle={angle} />
        ))}
        {PIECES.slice(0, typed).map((t, i) => (
          <Word key={i} at={at(chipAnchor(i))} text={t} size={size} angle={angle} />
        ))}
      </FrontalLayer>
    </AnatomyStage>
  );
};

/** Style frames of the phone: frame 0 wide, frame 1 close-up (projects/kak-rabotaet-claude/content/stills.json). */
export const KakRabotaetClaudePhone: React.FC = () => <PhoneView state={phoneStill(useCurrentFrame())} />;
