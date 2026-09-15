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

  return {
    ...config,
    plugins,
    extra: {
      ...config.extra,
      expo_public_google_maps_api_key: googleMapsApiKey,
    },
  };
};
