// Mechanical conversion only: no redraw, crop, recolor or sharpening.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const masterPath = path.join(root, 'assets/brand/recipio-logo-source.png');
const masterHash = 'a6fc20eaba83264f3586339d7f662f16ab59909ec5721d86e63c0e9a159a50e2';
const background = '#FDFAF4'; // Rounded mean of the original four corner pixels.
const args = process.argv.slice(2);
assert(args[0] === '--write' || args[0] === '--check', 'Use --write or --check');
const write = args[0] === '--write';
const sourceIndex = args.indexOf('--source');
const sourcePath = sourceIndex === -1 ? masterPath : args[sourceIndex + 1];
assert(sourcePath, '--source requires a PNG path');
const source = await readFile(sourcePath);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256(source), masterHash, 'Only the user-approved PNG can generate assets');
const metadata = await sharp(source).metadata();
assert.equal(metadata.width, 1254);
assert.equal(metadata.height, 1254);
assert.equal(metadata.format, 'png');

// Check every dark symbol pixel against the conservative 66dp circular safe zone.
const { data, info } = await sharp(source).raw().toBuffer({ resolveWithObject: true });
let radius = 0;
let darkPixels = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    if (data[i] < 90 && data[i + 1] < 90 && data[i + 2] < 90) {
      darkPixels++;
      radius = Math.max(radius, Math.hypot(x + 0.5 - info.width / 2, y + 0.5 - info.height / 2));
    }
  }
}
assert(darkPixels > 0, 'Source must contain the original dark symbol');
const radiusDp = radius * 108 / info.width;
assert(radiusDp < 33, 'Original symbol exceeds adaptive safe zone');

const square = (size) => sharp(source).resize(size, size, { fit: 'contain', kernel: 'lanczos3' }).png().toBuffer();
const assets = [
  ['native/public/icon.png', 192], ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512], ['public/icons/icon-maskable-512.png', 512],
  ['public/apple-touch-icon.png', 180],
];
for (const [density, launcher, foreground] of [['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216], ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432]]) {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  assets.push([`${dir}/ic_launcher.png`, launcher]);
  // Android applies the circular mask; preserve the same complete square source.
  assets.push([`${dir}/ic_launcher_round.png`, launcher]);
  assets.push([`${dir}/ic_launcher_foreground.png`, foreground]);
}
const splashSizes = [
  ['drawable', 480, 320],
  ['drawable-land-mdpi', 480, 320], ['drawable-land-hdpi', 800, 480],
  ['drawable-land-xhdpi', 1280, 720], ['drawable-land-xxhdpi', 1600, 960], ['drawable-land-xxxhdpi', 1920, 1280],
  ['drawable-port-mdpi', 320, 480], ['drawable-port-hdpi', 480, 800],
  ['drawable-port-xhdpi', 720, 1280], ['drawable-port-xxhdpi', 960, 1600], ['drawable-port-xxxhdpi', 1280, 1920],
];
const results = [];
async function output(relativePath, bytes) {
  const target = path.join(root, relativePath);
  if (write) {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  } else {
    assert((await readFile(target)).equals(bytes), `${relativePath} differs from approved source conversion`);
  }
  results.push({ path: relativePath, bytes: bytes.length, sha256: sha256(bytes) });
}
await output('assets/brand/recipio-logo-source.png', source);
for (const [file, size] of assets) await output(file, await square(size));

// ICO stores standard PNG frames uniformly resized from the original.
const frames = await Promise.all([16, 32, 48, 256].map(async (size) => ({ size, bytes: await square(size) })));
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
for (let i = 0; i < frames.length; i++) {
  const { size, bytes } = frames[i];
  const entry = 6 + 16 * i;
  header[entry] = size === 256 ? 0 : size;
  header[entry + 1] = size === 256 ? 0 : size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(24, entry + 6);
  header.writeUInt32LE(bytes.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += bytes.length;
}
await output('src/app/favicon.ico', Buffer.concat([header, ...frames.map(({ bytes }) => bytes)]));
for (const [dir, width, height] of splashSizes) {
  const side = Math.round(Math.min(width, height) * 0.65);
  const bytes = await sharp({ create: { width, height, channels: 3, background } })
    .composite([{ input: await square(side), left: Math.floor((width - side) / 2), top: Math.floor((height - side) / 2) }])
    .png().toBuffer();
  await output(`android/app/src/main/res/${dir}/splash.png`, bytes);
}
for (const file of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  const xml = await readFile(path.join(root, 'android/app/src/main/res/mipmap-anydpi-v26', file), 'utf8');
  assert(xml.includes('@mipmap/ic_launcher_foreground'), 'Adaptive foreground not connected');
  assert(xml.includes('@color/ic_launcher_background'), 'Adaptive background not connected');
}
const colorXml = await readFile(path.join(root, 'android/app/src/main/res/values/ic_launcher_background.xml'), 'utf8');
assert(colorXml.includes(background), 'Adaptive background must match source corner color');
const manifest = await readFile(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
assert(manifest.includes('android:icon="@mipmap/ic_launcher"'));
assert(manifest.includes('android:roundIcon="@mipmap/ic_launcher_round"'));
console.log(JSON.stringify({ mode: write ? 'write' : 'check', sourceSha256: masterHash, sourceDimensions: [1254, 1254], background, symbolRadiusDp: radiusDp, safeRadiusDp: 33, assets: results }, null, 2));

// Contact sheet is a mask simulation, never Android device evidence.
if (args.includes('--preview')) {
  const original = await square(192);
  const viewport = await sharp(await square(432)).extract({ left: 72, top: 72, width: 288, height: 288 }).resize(192, 192).png().toBuffer();
  const masks = [
    '<circle cx="96" cy="96" r="96" fill="white"/>',
    '<rect width="192" height="192" rx="42" fill="white"/>',
    '<path d="M96 0 C172 0 192 20 192 96 C192 172 172 192 96 192 C20 192 0 172 0 96 C0 20 20 0 96 0 Z" fill="white"/>',
  ];
  const previews = await Promise.all(masks.map((mask) => sharp(viewport).ensureAlpha().composite([{ input: Buffer.from(`<svg width="192" height="192">${mask}</svg>`), blend: 'dest-in' }]).png().toBuffer()));
  const contact = await sharp({ create: { width: 856, height: 224, channels: 3, background: '#E8E8E8' } })
    .composite([original, ...previews].map((input, i) => ({ input, left: 16 + i * 216, top: 16 }))).png().toBuffer();
  await mkdir(path.join(root, 'artifacts/logo-refresh'), { recursive: true });
  await writeFile(path.join(root, 'artifacts/logo-refresh/mask-preview.png'), contact);
}
