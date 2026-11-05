const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a valid PNG file of given width, height, and solid/gradient color with forge icon data
function createPng(width, height, r = 14, g = 16, b = 22) {
  // Build uncompressed scanlines: each line starts with filter byte 0
  const lineSize = 1 + width * 4;
  const rawData = Buffer.alloc(lineSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * lineSize;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      // Compute distance from center for subtle accent glow
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const maxR = width * 0.45;

      let pr = r;
      let pg = g;
      let pb = b;

      // Inner Android Green / Cyan glowing motif
      if (dist < maxR * 0.5) {
        const factor = (maxR * 0.5 - dist) / (maxR * 0.5);
        pr = Math.floor(r + (61 - r) * factor);
        pg = Math.floor(g + (220 - g) * factor);
        pb = Math.floor(b + (132 - b) * factor);
      } else if (dist < maxR) {
        const factor = (maxR - dist) / (maxR * 0.5);
        pr = Math.floor(r + (34 - r) * factor * 0.4);
        pg = Math.floor(g + (211 - g) * factor * 0.4);
        pb = Math.floor(b + (238 - b) * factor * 0.4);
      }

      rawData[pxOffset] = pr;
      rawData[pxOffset + 1] = pg;
      rawData[pxOffset + 2] = pb;
      rawData[pxOffset + 3] = 255;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  // PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  function makeChunk(type, data) {
    const len = data.length;
    const chunk = Buffer.alloc(4 + 4 + len + 4);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4);
    data.copy(chunk, 8);
    const typeAndData = chunk.subarray(4, 8 + len);
    const crc = crc32(typeAndData);
    chunk.writeUInt32BE(crc, 8 + len);
    return chunk;
  }

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table
const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
  }
  table[n] = c;
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, 7, 8, 11));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180));

console.log('Generated PNG icons successfully in /public');
