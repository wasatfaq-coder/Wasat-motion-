import {anatomyProjection} from '../../lib/anatomy';

// One projection for every sample of the universal kit (MASTER_PROMPT_FINAL §24): 10 kit units per room unit.
// ILLUSTRATIVE geometry and values throughout: the map regions are invented shapes, not real borders; the data are not
// a topic's data.
export const UNI_U = 10;
export const UNI_P = anatomyProjection(UNI_U);
