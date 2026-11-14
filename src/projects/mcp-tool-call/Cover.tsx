import React from 'react';
import {AnatomyCover, AnatomyCoverProps} from '../../components/AnatomyCover';
import {COVERS} from './covers';

export const McpToolCallCover: React.FC<AnatomyCoverProps> = ({variant}) => <AnatomyCover spec={COVERS[variant]} />;
