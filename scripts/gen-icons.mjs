import fs from 'node:fs';
import zlib from 'node:zlib';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const r = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      const i = 1 + x * 3;
      const cx = x - size / 2;
      const cy = y - size / 2;
      const inside = cx * cx + cy * cy < (size * 0.38) ** 2;
      r[i] = inside ? rgb[0] : 0x1a;
      r[i + 1] = inside ? rgb[1] : 0x1d;
      r[i + 2] = inside ? rgb[2] : 0x23;
    }
    rows.push(r);
  }
  const idat = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync('public/icons', { recursive: true });
const rgb = [0x6b, 0x8f, 0x71];
for (const s of [16, 32, 48, 128]) {
  fs.writeFileSync(`public/icons/icon-${s}.png`, png(s, rgb));
}
console.log('icons ok');
