import React from 'react';
import {Kit} from '../../../lib/anatomy';
import {Cam, RoomSvg} from '../../../lib/camera';
import {Atmos, AtmosField} from '../../../components/Atmos';
import {ChapterMark} from '../../../components/Atlas';

export const Stage: React.FC<{dark?: boolean; cam: Cam; svg: string; chapter: [number, string]; world?: React.ReactNode; children?: React.ReactNode}> = ({dark, cam, svg, chapter, world, children}) => (
  <>
    <RoomSvg cam={cam} dark={dark} sides={80} fade={100} under={<AtmosField hero={[540, 980]} dark={dark} />}>
      <Kit svg={svg} />
      {world}
    </RoomSvg>
    <Atmos dark={dark} />
    <ChapterMark n={chapter[0]} of={4} title={chapter[1]} dark={dark} sound={false} />
    {children}
  </>
);
