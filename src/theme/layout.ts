// Conservative vertical safe-zone profile (not a guarantee for every platform UI).
export const SAFE = {left: 64, right: 176, top: 250, bottom: 450} as const;
export const ZONES = {
  graphicsTop: 250,
  graphicsBottom: 1210,
  captionsTop: 1210,
  captionsBottom: 1470,
} as const;
