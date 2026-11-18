import React from 'react';
import {AnatomyCover, AnatomyCoverProps} from '../../components/AnatomyCover';
import {COVERS} from './covers';

export const ElektromotorCover: React.FC<AnatomyCoverProps> = ({variant}) => <AnatomyCover spec={COVERS[variant]} />;
