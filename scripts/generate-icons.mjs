// One-off asset generator (spec 008, T049). Not part of the build/CI pipeline --
// run manually with `node scripts/generate-icons.mjs` whenever `public/cash3.svg`
// changes, then commit the generated files under `public/`.
import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Buffer } from "node:buffer";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(rootDir, "public");
const sourceSvgPath = path.join(publicDir, "cash3.svg");

const iconSizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
];

const brandColor = "#0369a1"; // --color-sky-700, the light-theme --brand value
const logoGreenDark = "#427d2a";
const logoGreenLight = "#87cc71";

async function generateFavicons() {
  const svgBuffer = await readFile(sourceSvgPath);

  for (const { name, size } of iconSizes) {
    await sharp(svgBuffer)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, name));
    console.log(`Generated ${name}`);
  }

  const icoBuffer = await pngToIco([
    path.join(publicDir, "favicon-16x16.png"),
    path.join(publicDir, "favicon-32x32.png"),
  ]);
  await writeFile(path.join(publicDir, "favicon.ico"), icoBuffer);
  console.log("Generated favicon.ico");
}

async function generateOgImage() {
  // A static branded 1200x630 card (logo + "GnuCash Insights" wordmark on a solid brand
  // background) per research.md item 10 -- not a live app screenshot.
  const width = 1200;
  const height = 630;
  const logoScale = 3.6; // cash3.svg viewBox is 122.9x71.3
  const logoWidth = 122.9 * logoScale;
  const logoHeight = 71.3 * logoScale;
  const logoX = (width - logoWidth) / 2;
  const logoY = height / 2 - logoHeight / 2 - 70;

  const ogSvg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${brandColor}" />
  <g transform="translate(${logoX} ${logoY}) scale(${logoScale})">
    <path fill="${logoGreenDark}" fill-rule="evenodd" d="M13 0h110v61h-8l1-45a7 7 0 0 0-7-7H13V0ZM0 14h110v57H0V14Z"/>
    <path fill="${logoGreenLight}" fill-rule="evenodd" d="M92 23a8 8 0 0 0 8 8v23a9 9 0 0 0-9 9H18a8 8 0 0 0-8-9V32a8 8 0 0 0 9-9Z"/>
    <path fill="${logoGreenDark}" fill-rule="evenodd" d="M40 35a17 17 0 1 1 7 23 17 17 0 0 1-7-23Z"/>
    <path fill="#fff" d="M55 55a2 2 0 0 1-1-1v-2a11 11 0 0 1-3 0 13 13 0 0 1-2-1 2 2 0 0 1-1-1 2 2 0 0 1 0-1 2 2 0 0 1 1-1 2 2 0 0 1 1 0 10 10 0 0 0 2 1 9 9 0 0 0 3 0 4 4 0 0 0 2-1 2 2 0 0 0 1-1 1 1 0 0 0 0-1 4 4 0 0 0-2-1l-3-1q-5-1-5-5a5 5 0 0 1 2-3 7 7 0 0 1 4-2v-2a2 2 0 0 1 0-1 2 2 0 0 1 1 0 1 1 0 0 1 1 0 2 2 0 0 1 1 1v2a11 11 0 0 1 2 0 7 7 0 0 1 2 1 2 2 0 0 1 0 1 2 2 0 0 1 0 1 1 1 0 0 1-1 1 2 2 0 0 1-1 0 8 8 0 0 0-2-1 8 8 0 0 0-2 0 4 4 0 0 0-2 1 2 2 0 0 0-1 1 1 1 0 0 0 1 1 4 4 0 0 0 1 1l3 1a7 7 0 0 1 4 2 4 4 0 0 1 1 3 5 5 0 0 1-1 3 7 7 0 0 1-4 2v2a2 2 0 0 1-1 1 1 1 0 0 1-1 0Z"/>
  </g>
  <text x="${width / 2}" y="${logoY + logoHeight + 130}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="72" fill="#ffffff">GnuCash Insights</text>
  <text x="${width / 2}" y="${logoY + logoHeight + 185}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="34" fill="#e0f2fe">Personal finance dashboard for GnuCash</text>
</svg>`;

  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(publicDir, "og-image.png"));
  console.log("Generated og-image.png");
}

async function removeDuplicateFavicon() {
  // favicon.svg is a byte-identical, unreferenced duplicate of cash3.svg (T051).
  await rm(path.join(publicDir, "favicon.svg"), { force: true });
  console.log("Removed unreferenced public/favicon.svg");
}

await generateFavicons();
await generateOgImage();
await removeDuplicateFavicon();
