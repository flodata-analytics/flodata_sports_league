/**
 * Convert SVG logo to 1024x1024 PNG for Expo icon/splash.
 * Usage: node scripts/convert-svg.js [inputSvgPath]
 */
const path = require('path');
const fs = require('fs');

async function main() {
  const sharp = require('sharp');

  const workspaceRoot = path.resolve(__dirname, '..');
  const defaultInput = path.join(
    workspaceRoot,
    'assets',
    'images',
    'FCL APK Logo ( 512 X 512 px ).png'
  );

  const inputSvg = process.argv[2]
    ? path.resolve(process.argv[2])
    : defaultInput;

  const outputPng = path.join(
    workspaceRoot,
    'assets',
    'images',
    'fclIcon-1024.png'
  );

  if (!fs.existsSync(inputSvg)) {
    console.error(`Input SVG not found: ${inputSvg}`);
    process.exit(1);
  }

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPng), { recursive: true });

  try {
    // Canvas is 1024x1024; render SVG to an inner square with safe padding
    // to avoid clipping on adaptive icon masks and splash cropping.
    const canvasSize = 1024;
    const innerSize = 864; // ~84% of canvas, leaves ~80px padding on all sides

    const rendered = await sharp(inputSvg)
      .resize({
        width: innerSize,
        height: innerSize,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toBuffer();

    await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: rendered, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(outputPng);

    console.log(`✓ Generated padded PNG: ${path.relative(workspaceRoot, outputPng)}`);
    console.log('You can now build with EAS and the new icon/splash.');
  } catch (err) {
    console.error('Failed to convert SVG to PNG:', err);
    process.exit(1);
  }
}

main();
