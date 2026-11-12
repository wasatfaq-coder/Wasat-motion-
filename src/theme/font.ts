import {loadFont} from '@remotion/google-fonts/Onest';

// Onest (SIL Open Font License), Cyrillic + Latin, two weights only.
export const {fontFamily} = loadFont('normal', {
  weights: ['500', '700'],
  subsets: ['cyrillic', 'latin'],
});
