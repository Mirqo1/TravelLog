import axios from 'axios';

const GEONAMES_BASE_URL = 'https://secure.geonames.org';
const geonamesUsername =
  process.env.EXPO_PUBLIC_GEONAMES_USERNAME || process.env.GEONAMES_USERNAME || 'demo';

const geonamesClient = axios.create({
  baseURL: GEONAMES_BASE_URL,
  timeout: 10000,
});

export const searchPlaces = async (query) => {
  if (!query?.trim()) {
    return [];
  }

  const response = await geonamesClient.get('/searchJSON', {
    params: {
      q: query,
      maxRows: 10,
      username: geonamesUsername,
      style: 'FULL',
    },
  });

  return (response.data?.geonames || []).map((place) => ({
    geonameId: place.geonameId,
    name: place.name,
    countryName: place.countryName,
    lat: Number(place.lat),
    lng: Number(place.lng),
    fcodeName: place.fcodeName,
  }));
};
