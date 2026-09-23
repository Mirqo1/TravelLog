const fs = require('node:fs/promises');
const path = require('node:path');
const THEME = 'Theme.App.SplashScreen';
const ATTRIBUTE = 'android:windowSplashScreenBrandingImage';
const DRAWABLE = '@drawable/travellog_splash_wordmark';

function addBranding(styles) {
  const theme = styles.resources?.style?.find(style => style.$?.name === THEME);
  if (!theme) return false;
  theme.item = (theme.item || []).filter(item => item.$?.name !== ATTRIBUTE);
  theme.item.push({ $: { name: ATTRIBUTE }, _: DRAWABLE });
  return true;
}
async function copyDrawable(projectRoot, platformRoot) {
  const target = path.join(platformRoot, 'app/src/main/res/drawable/travellog_splash_wordmark.xml');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(path.join(projectRoot, 'assets/splash-wordmark.xml'), target);
}
module.exports = { addBranding, copyDrawable, THEME };
