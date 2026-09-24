// Reuse the exact splash artwork, excluding Android's transparent mask margins.
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
sharp(path.join(root, 'assets/splash-centered.svg'), { density: 216 })
  .extract({ left: 225, top: 225, width: 414, height: 426 })
  .png().toFile(path.join(root, 'assets/home-brand.png'))
  .catch(error => { console.error(error.message); process.exitCode = 1; });
