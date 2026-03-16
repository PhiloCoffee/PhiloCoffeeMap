// Generates minimal valid PNG icons for the PWA manifest
import { writeFileSync } from 'fs';
import { createGzip, deflateSync } from 'zlib';

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, c]);
}

function makePNG(size, r, g, b) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // IDAT - raw pixel data
  const rowSize = size * 3;
  const raw = Buffer.alloc((rowSize + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowSize + 1)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const off = y * (rowSize + 1) + 1 + x * 3;
      // Draw a simple espresso-brown icon
      const cx = x - size / 2, cy = y - size / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      if (dist < size * 0.45) {
        // Inside circle
        if (dist < size * 0.30) {
          // Inner circle (caramel)
          raw[off] = 196; raw[off+1] = 120; raw[off+2] = 58;
        } else {
          // Ring (dark espresso)
          raw[off] = 61; raw[off+1] = 26; raw[off+2] = 0;
        }
      } else {
        // Background
        raw[off] = 28; raw[off+1] = 10; raw[off+2] = 0;
      }
    }
  }
  const compressed = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('./public/icons/icon-192.png', makePNG(192, 28, 10, 0));
writeFileSync('./public/icons/icon-512.png', makePNG(512, 28, 10, 0));
console.log('Icons generated: icon-192.png, icon-512.png');
