import axios from 'axios';
import { parsePlaces, searchParameters } from '../utils/placeSearch';

// Submit-only search; no requests on every keystroke. Public Photon uses OSM
// data and relevance/location bias, not Google search popularity.
export async function searchPlaces(query, region, signal) {
  if (!query.trim()) return [];
  try {
    const { data } = await axios.get('https://photon.komoot.io/api/', {
      params: searchParameters(query, region), timeout: 15000, signal,
    });
    return parsePlaces(data);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Vyhľadávanie sa nepodarilo. Skontroluj internet a skús to znova.');
  }
}
