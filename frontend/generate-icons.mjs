import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const svg = readFileSync('./public/favicon.svg');

const sizes = [
  { name: 'pwa-192x192.png',    size: 192 },
  { name: 'pwa-512x512.png',    size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png',  size: 32 },
];

for (const { name, size } of sizes) {
  await sharp(svg).resize(size, size).png().toFile(`./public/${name}`);
  console.log(`✅ Created ${name} (${size}x${size})`);
}

console.log('All icons generated!');
