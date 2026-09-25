const { withAndroidStyles, withDangerousMod } = require('expo/config-plugins');
const { addBranding, copyDrawable } = require('./splashBranding.cjs');

module.exports = function withSplashBranding(config) {
  // Register BEFORE expo-splash-screen; Expo runs later-registered mods first.
  config = withAndroidStyles(config, config => {
    if (!addBranding(config.modResults)) throw new Error('Splash theme missing: register withSplashBranding before expo-splash-screen.');
    return config;
  });
  return withDangerousMod(config, ['android', async config => {
    await copyDrawable(config.modRequest.projectRoot, config.modRequest.platformProjectRoot);
    return config;
  }]);
};
