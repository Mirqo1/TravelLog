// Apply to an ALREADY generated Android project without regenerating signing files.
const fs = require('node:fs/promises');
const path = require('node:path');
const { parseStringPromise, Builder } = require('xml2js');
const { addBranding, copyDrawable } = require('../plugins/splashBranding.cjs');

async function apply(projectRoot, platformRoot = path.join(projectRoot, 'android')) {
  const res = path.join(platformRoot, 'app/src/main/res');
  const files = [];
  for (const entry of await fs.readdir(res, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^values(?:-|$)/.test(entry.name)) continue;
    for (const name of await fs.readdir(path.join(res, entry.name))) {
      if (!name.endsWith('.xml')) continue;
      const file = path.join(res, entry.name, name);
      const styles = await parseStringPromise(await fs.readFile(file, 'utf8'));
      if (addBranding(styles)) files.push({ file, contents: new Builder().buildObject(styles) + '\n' });
    }
  }
  if (!files.length) throw new Error('No generated Theme.App.SplashScreen found. Run this from the existing TravelLog checkout with its android project.');
  await copyDrawable(projectRoot, platformRoot);
  for (const { file, contents } of files) await fs.writeFile(file, contents);
  return files.map(({ file }) => file);
}
module.exports = { apply };
if (require.main === module) apply(path.resolve(__dirname, '..'))
  .then(files => console.log(`Splash branding applied (${files.length} theme file(s)). Signing and Gradle files were not changed.`))
  .catch(error => { console.error(error.message); process.exitCode = 1; });
