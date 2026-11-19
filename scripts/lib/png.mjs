// PNG read and write in plain Node (zlib), for checks that must run in CI with nothing installed. Root cause
// (docs/root-causes.md): scripts/style-check.mjs called python3 with Pillow, which the CI runner does not have.
// Handles 8-bit greyscale, RGB and RGBA, non-interlaced: what Remotion stills and our references are.
import fs from 'node:fs';
import zlib from 'node:zlib';

const CHANNELS = {0: 1, 2: 3, 4: 2, 6: 4};

/** Decode a PNG file to {width, height, rgb: Uint8Array (3 bytes per pixel)}. */
export const readPng = (file) => {
  const buf = fs.readFileSync(file);
  let pos = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let type = 0;
  let interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const name = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (name === 'IHDR') [width, height, depth, type, interlace] = [data.readUInt32BE(0), data.readUInt32BE(4), data[8], data[9], data[12]];
    else if (name === 'IDAT') idat.push(data);
    else if (name === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8 || interlace || !CHANNELS[type]) throw new Error(`readPng: ${file} is not an 8-bit non-interlaced grey/RGB/RGBA PNG`);
  const ch = CHANNELS[type];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const up = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0;
      const b = up ? up[i] : 0;
      const c = up && i >= ch ? up[i - ch] : 0;
      let v = src[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
  }
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    if (ch >= 3) for (let k = 0; k < 3; k++) rgb[i * 3 + k] = out[i * ch + k];
    else rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = out[i * ch];
  }
  return {width, height, rgb};
};

const crcTable = Array.from({length: 256}, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (bytes) => {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (name, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(name, 'ascii'), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};

/** Encode {width, height, rgb} as an RGB PNG file. */
export const writePng = (file, {width, height, rgb}) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(rgb.buffer, rgb.byteOffset + y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1);
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))]));
};

/** Box downscale by an integer factor (1080×1920 → 270×480 with 4). */
export const shrink = ({width, height, rgb}, k) => {
  const w = Math.floor(width / k);
  const h = Math.floor(height / k);
  const out = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) s += rgb[((y * k + dy) * width + x * k + dx) * 3 + c];
        out[(y * w + x) * 3 + c] = Math.round(s / (k * k));
      }
  return {width: w, height: h, rgb: out};
};
