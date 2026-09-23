// Expo resolves app.json first, including the projectId added by EAS init.
module.exports = ({ config }) => {
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    '';

  if (process.env.EAS_BUILD_PLATFORM === 'android' && !googleMapsApiKey) {
    throw new Error('Google Maps key is missing. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY for the EAS preview environment.');
  }

  let foundMapsPlugin = false;
  const plugins = (config.plugins || []).map((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    if (name !== 'react-native-maps') return plugin;

    foundMapsPlugin = true;
    const options = Array.isArray(plugin) ? { ...plugin[1] } : {};
    delete options.googleMapsApiKey;
    return [name, { ...options, androidGoogleMapsApiKey: googleMapsApiKey }];
  });

  if (!foundMapsPlugin) {
    plugins.push(['react-native-maps', { androidGoogleMapsApiKey: googleMapsApiKey }]);
  }

  // Google Mobile Ads 25.4 uses Kotlin 2.3 metadata.
  // Pika 0.3.2 (used by Expo) publishes a compiler for 2.3.20, not 2.3.21.
  const kotlinVersion = '2.3.20';
  const buildPropertiesIndex = plugins.findIndex((plugin) =>
    (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-build-properties'
  );
  const existingBuildProperties = buildPropertiesIndex >= 0 &&
    Array.isArray(plugins[buildPropertiesIndex])
    ? plugins[buildPropertiesIndex][1] || {}
    : {};
  const buildProperties = ['expo-build-properties', {
    ...existingBuildProperties,
    android: {
      ...existingBuildProperties.android,
      kotlinVersion,
    },
  }];
  if (buildPropertiesIndex >= 0) {
    plugins[buildPropertiesIndex] = buildProperties;
  } else {
    plugins.push(buildProperties);
  }

  plugins.push(['./plugins/withKotlinCompiler', { kotlinVersion }]);

  const splashIndex = plugins.findIndex((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-splash-screen');
  const splashPlugin = ['expo-splash-screen', {
    image: './assets/compass-foreground.png', imageWidth: 160,
    resizeMode: 'contain', backgroundColor: '#F6F0E4',
    dark: { image: './assets/compass-foreground.png', backgroundColor: '#F6F0E4' },
  }];
  if (splashIndex >= 0) plugins[splashIndex] = splashPlugin;
  else plugins.push(splashPlugin);
  // Expo mods run in reverse registration order: apply branding after splash styles.
  const configuredSplashIndex = plugins.findIndex(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-splash-screen');
  plugins.splice(configuredSplashIndex, 0, './plugins/withSplashBranding');

  return {
    ...config,
    icon: './assets/compass-icon.png',
    android: {
      ...config.android,
      softwareKeyboardLayoutMode: 'resize',
      adaptiveIcon: {
        foregroundImage: './assets/compass-foreground.png',
        monochromeImage: './assets/compass-monochrome.png',
        backgroundColor: '#F6F0E4',
      },
    },
    splash: { image: './assets/compass-icon.png', resizeMode: 'contain', backgroundColor: '#F6F0E4' },
    plugins,
    extra: {
      ...config.extra,
      expo_public_google_maps_api_key: googleMapsApiKey,
    },
  };
};
