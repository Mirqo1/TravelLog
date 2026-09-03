const appJson = require('./app.json');

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const config = appJson.expo ?? appJson;
const plugins = [...(config.plugins || [])];

if (!plugins.some((plugin) => Array.isArray(plugin) && plugin[0] === 'react-native-maps')) {
  plugins.push([
    'react-native-maps',
    {
      googleMapsApiKey,
    },
  ]);
}

module.exports = {
  expo: {
    ...config,
    plugins,
    extra: {
      ...config.extra,
      expo_public_google_maps_api_key: googleMapsApiKey,
    },
  },
};
