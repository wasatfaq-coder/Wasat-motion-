// Conservative vertical safe-zone profile (not a guarantee for every platform UI).
export const SAFE = {left: 64, right: 176, top: 250, bottom: 450} as const;
// Frame grid of regulation v3.0 (section 10): captions on top under the platform UI, the chapter mark «Табл. NN / NN»
// under them, the graphics band down to the bottom of the safe zone.
export const ZONES = {
  captionsTop: 262,
  captionsBottom: 450,
  chapterTop: 462,
  graphicsTop: 510,
  graphicsBottom: 1470,
} as const;
