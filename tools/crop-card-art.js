// Crops the line-art panel out of each printed card PNG and cleans the paper grain so the files are small.
// Usage: node tools/crop-card-art.js <folder with P7-*.png> <output folder>
// Dependency-free: decodes and re-encodes PNGs with Node's zlib.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const [, , inDir, outDir] = process.argv;
if (!inDir || !outDir) { console.error('usage: node crop-card-art.js <in> <out>'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

function decode(buf) {
  let p = 8, w, h, bd, ct; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; }
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  if (bd !== 8 || (ct !== 2 && ct !== 6)) throw new Error(`unsupported PNG: depth ${bd}, colour type ${ct}`);
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = px.subarray(y * stride, (y + 1) * stride), up = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0, b = up ? up[x] : 0, c = up && x >= bpp ? up[x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      row[x] = v & 255;
    }
  }
  return { w, h, bpp, px };
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) { const t = Buffer.from(type), len = Buffer.alloc(4), c = Buffer.alloc(4); len.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]); }
function encodeRGB(w, h, rgb) {
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// The art panel sits at x 46–704, y 248–634 on every 750×1050 card; crop just inside its 1 px border.
const X0 = 48, Y0 = 250, W = 654, H = 382;
const files = fs.readdirSync(inDir).filter(f => /^P7-[A-Z]\d\d\.png$/.test(f));
let total = 0;
for (const f of files) {
  const { w, h, bpp, px } = decode(fs.readFileSync(path.join(inDir, f)));
  if (w !== 750 || h !== 1050) throw new Error(f + ' is not 750x1050');
  const out = Buffer.alloc(W * H * 3);
  // panel colour = the most common colour in the empty top-left corner of the panel
  const at = (x, y) => (y * w + x) * bpp;
  const tr = px[at(X0 + 6, Y0 + 6)], tg = px[at(X0 + 6, Y0 + 6) + 1], tb = px[at(X0 + 6, Y0 + 6) + 2];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = at(X0 + x, Y0 + y), r = px[i], g = px[i + 1], b = px[i + 2], o = (y * W + x) * 3;
    if (Math.abs(r - tr) + Math.abs(g - tg) + Math.abs(b - tb) < 26) { out[o] = tr; out[o + 1] = tg; out[o + 2] = tb; } // flatten grain
    else { out[o] = r; out[o + 1] = g; out[o + 2] = b; }
  }
  const id = f.slice(3, 6), png = encodeRGB(W, H, out);
  fs.writeFileSync(path.join(outDir, `art-${id}.png`), png); total += png.length;
  console.log(id, (png.length / 1024).toFixed(1) + ' KB', `panel rgb(${tr},${tg},${tb})`);
}
console.log(files.length, 'files,', (total / 1024).toFixed(0), 'KB total');
