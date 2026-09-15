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
      kotlinVersion: '2.3.21',
    },
  }];
  if (buildPropertiesIndex >= 0) {
    plugins[buildPropertiesIndex] = buildProperties;
  } else {
    plugins.push(buildProperties);
  }

  return {
    ...config,
    plugins,
    extra: {
      ...config.extra,
      expo_public_google_maps_api_key: googleMapsApiKey,
    },
  };
};
