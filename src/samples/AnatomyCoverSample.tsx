import React from 'react';
import {AnatomyCover, AnatomyCoverProps} from '../components/AnatomyCover';
import {COVERS} from './covers';

/** Cover template sample: <Composition id="AnatomyCoverSample"> with props {variant: 'a' | 'b' | 'c'}. */
export const AnatomyCoverSample: React.FC<AnatomyCoverProps> = ({variant}) => <AnatomyCover spec={COVERS[variant]} />;
