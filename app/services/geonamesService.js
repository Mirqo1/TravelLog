import axios from 'axios';

const GEONAMES_BASE_URL = 'https://secure.geonames.org';
const geonamesUsername =
  (process.env.EXPO_PUBLIC_GEONAMES_USERNAME || '').trim();

const requireAccount = () => {
  if (!geonamesUsername || geonamesUsername === 'demo') {
    throw new Error('Vyhľadávanie lokalít zatiaľ nie je nastavené.');
  }
};

const checkResponse = (data) => {
  if (!data?.status) return;
  const code = Number(data.status.value);
  if ([18, 19, 20].includes(code)) throw new Error('Služba lokalít dosiahla limit požiadaviek.');
  if (code === 10) throw new Error('Účet služby lokalít nie je aktívny.');
  throw new Error('Služba lokalít momentálne nie je dostupná.');
};

const geonamesClient = axios.create({
  baseURL: GEONAMES_BASE_URL,
  timeout: 10000,
});

export const searchPlaces = async (query) => {
  if (!query?.trim()) {
    return [];
  }
  requireAccount();

  const response = await geonamesClient.get('/searchJSON', {
    params: {
      q: query,
      maxRows: 10,
      username: geonamesUsername,
      style: 'FULL',
    },
  });

  checkResponse(response.data);
  return (response.data?.geonames || []).map((place) => ({
    geonameId: place.geonameId,
    name: place.name,
    countryName: place.countryName,
    lat: Number(place.lat),
    lng: Number(place.lng),
    fcodeName: place.fcodeName,
  }));
};

export const findLocationName = async ({ latitude, longitude }) => {
  requireAccount();
  const response = await geonamesClient.get('/findNearbyPlaceNameJSON', {
    params: { lat: latitude, lng: longitude, username: geonamesUsername, style: 'FULL' },
  });
  checkResponse(response.data);
  const place = response.data?.geonames?.[0];
  if (!place) throw new Error('Pre tento bod sa nenašla obec ani krajina.');
  return [place.name, place.countryName].filter(Boolean).join(', ');
};
