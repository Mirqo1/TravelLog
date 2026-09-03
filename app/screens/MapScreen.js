import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Heatmap, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Constants from 'expo-constants';
import AddPlaceModal from '../components/AddPlaceModal';
import TripDetailsModal from '../components/TripDetailsModal';
import { useTrips } from '../context/TripsContext';
import { searchPlaces } from '../services/geonamesService';

export default function MapScreen() {
  const { trips, addTrip, updateTrip, deleteTrip } = useTrips();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCoordinate, setSelectedCoordinate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  const googleMapsApiKey = Constants.expoConfig?.extra?.expo_public_google_maps_api_key;
  const hasGoogleMapsApiKey = Boolean(googleMapsApiKey);

  console.log('MapScreen render', {
    hasGoogleMapsApiKey,
    googleMapsApiKey: googleMapsApiKey ? 'SET' : 'NOT SET',
    tripsCount: trips.length,
    platform: Platform.OS,
    mapReady,
  });

  const handleMapPress = (event) => {
    const coordinate = event.nativeEvent.coordinate;
    setSelectedCoordinate({ latitude: coordinate.latitude, longitude: coordinate.longitude });
    setModalVisible(true);
  };

  const handleMapReady = () => {
    console.log('MapView ready!');
    setMapReady(true);
  };

  const handleMapError = (e) => {
    console.error('MapView error:', e);
    setMapError(e.toString());
  };

  const handleSearch = async () => {
    try {
      const results = await searchPlaces(searchQuery);
      setSearchResult(results[0] || null);
      if (!results[0]) {
        Alert.alert('Výsledok', 'Nenašli sa žiadne miesta.');
      }
    } catch (error) {
      Alert.alert('GeoNames chyba', error.message);
    }
  };

  const handleSave = async (trip) => {
    await addTrip(trip);
    setModalVisible(false);
    setSelectedCoordinate(null);
    Alert.alert('Hotovo', 'Výlet bol uložený.');
  };

  const heatPoints = useMemo(
    () =>
      trips
        .filter((trip) => Number.isFinite(trip.location?.latitude) && Number.isFinite(trip.location?.longitude))
        .map((trip) => ({
          latitude: trip.location.latitude,
          longitude: trip.location.longitude,
          weight: Math.max(1, Number(trip.rating || 1)),
        })),
    [trips],
  );
  const tripMarkers = useMemo(
    () =>
      trips.filter(
        (trip) => Number.isFinite(trip.location?.latitude) && Number.isFinite(trip.location?.longitude),
      ),
    [trips],
  );
  const initialRegion = useMemo(() => {
    if (!tripMarkers.length) {
      return {
        latitude: 48.669,
        longitude: 19.699,
        latitudeDelta: 12,
        longitudeDelta: 12,
      };
    }

    const latitudes = tripMarkers.map((trip) => trip.location.latitude);
    const longitudes = tripMarkers.map((trip) => trip.location.longitude);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);

    return {
      latitude: (minLatitude + maxLatitude) / 2,
      longitude: (minLongitude + maxLongitude) / 2,
      latitudeDelta: Math.max(3, (maxLatitude - minLatitude) * 1.6),
      longitudeDelta: Math.max(3, (maxLongitude - minLongitude) * 1.6),
    };
  }, [tripMarkers]);

  console.log('MapScreen initialRegion:', initialRegion);

  const mapProvider = Platform.OS === 'android' && hasGoogleMapsApiKey ? PROVIDER_GOOGLE : undefined;
  console.log('MapScreen mapProvider:', mapProvider, 'platform:', Platform.OS);

  const searchMarker = searchResult
    ? { latitude: Number(searchResult.lat), longitude: Number(searchResult.lng) }
    : null;

  const handleDelete = async () => {
    Alert.alert('Zmazať výlet?', `Naozaj chceš vymazať ${selectedTrip.name}?`, [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Zmazať',
        style: 'destructive',
        onPress: async () => {
          await deleteTrip(selectedTrip.id);
          setSelectedTrip(null);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Map</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Vyhľadaj miesto"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Pressable style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Hľadať</Text>
        </Pressable>
      </View>
      {searchResult ? (
        <Text style={styles.searchHint}>
          Výsledok: {searchResult.name}, {searchResult.countryName}
        </Text>
      ) : (
        <Text style={styles.searchHint}>Klikni na mapu pre nový výlet alebo otvor marker pre detail.</Text>
      )}
      {Platform.OS === 'android' && !hasGoogleMapsApiKey ? (
        <Text style={styles.apiKeyHint}>
          Google Maps API key nie je nastavený. Pre Android build nastav EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.
        </Text>
      ) : null}
      {mapError ? (
        <Text style={styles.errorText}>Map Error: {mapError}</Text>
      ) : null}
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        onPress={handleMapPress}
        provider={mapProvider}
        onMapReady={handleMapReady}
        onError={handleMapError}
      >
        {Heatmap && heatPoints.length ? <Heatmap points={heatPoints} radius={28} opacity={0.55} /> : null}
        {tripMarkers.map((trip) => (
          <Marker
            key={trip.id}
            coordinate={{
              latitude: trip.location.latitude,
              longitude: trip.location.longitude,
            }}
            title={trip.name}
            description={trip.locationName}
            onPress={() => setSelectedTrip(trip)}
          />
        ))}
        {selectedCoordinate ? <Marker coordinate={selectedCoordinate} pinColor="#2563eb" /> : null}
        {searchMarker ? <Marker coordinate={searchMarker} pinColor="#16a34a" /> : null}
      </MapView>
      <View style={styles.actions}>
        <Pressable style={styles.quickButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.quickButtonText}>Pridať nový výlet</Text>
        </Pressable>
      </View>
      <AddPlaceModal
        visible={modalVisible}
        coordinates={selectedCoordinate}
        onClose={() => {
          setModalVisible(false);
          setSelectedCoordinate(null);
        }}
        onSave={handleSave}
      />
      <AddPlaceModal
        visible={Boolean(editingTrip)}
        initialTrip={editingTrip}
        onClose={() => setEditingTrip(null)}
        onSave={async (trip) => {
          await updateTrip(editingTrip.id, trip);
          setEditingTrip(null);
        }}
        title="Upraviť výlet"
        submitLabel="Uložiť zmeny"
      />
      <TripDetailsModal
        visible={Boolean(selectedTrip)}
        trip={selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onEdit={() => {
          setEditingTrip(selectedTrip);
          setSelectedTrip(null);
        }}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchHint: {
    marginTop: 8,
    marginBottom: 10,
    color: '#4b5563',
  },
  apiKeyHint: {
    marginBottom: 10,
    color: '#b45309',
  },
  errorText: {
    marginBottom: 10,
    color: '#dc2626',
    fontWeight: '600',
  },
  map: {
    flex: 1,
    borderRadius: 12,
  },
  actions: {
    marginTop: 10,
  },
  quickButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  quickButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
