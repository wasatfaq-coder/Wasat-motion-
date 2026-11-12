import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Onest variable font (SIL Open Font License, public/fonts/OFL.txt), stored locally so renders do not depend on the network.
export const fontFamily = 'Onest';

const ranges = {
  cyrillic: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
};

for (const subset of ['cyrillic', 'latin'] as const) {
  loadFont({
    family: fontFamily,
    url: staticFile(`fonts/onest-${subset}.woff2`),
    weight: '100 900',
    unicodeRange: ranges[subset],
    format: 'woff2',
  }).catch((err) => {
    throw new Error(`Font failed to load: ${subset} ${err}`);
  });
}
