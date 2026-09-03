import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapboxGL from '@react-native-mapbox-gl/maps';
import AddPlaceModal from '../components/AddPlaceModal';
import TripDetailsModal from '../components/TripDetailsModal';
import { useTrips } from '../context/TripsContext';
import { searchPlaces } from '../services/geonamesService';

const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoibWlydWxpIiwiYSI6ImNtdGx0amo3ajAwZXMyeHIzdHllYWN4Z3oifQ.vswbqwimIIjtF7PRxd-h6A';
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

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

  const handleMapPress = (event) => {
    const coordinates = event?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return;
    }

    const [longitude, latitude] = coordinates;
    setSelectedCoordinate({ latitude, longitude });
    setModalVisible(true);
  };

  const handleMapReady = () => {
    setMapReady(true);
  };

  const handleMapError = (e) => {
    const errorMessage =
      e?.nativeEvent?.payload || e?.message || (typeof e === 'string' ? e : 'Nepodarilo sa načítať mapu.');
    setMapError(String(errorMessage));
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

  const tripMarkers = useMemo(
    () =>
      trips.filter(
        (trip) => Number.isFinite(trip.location?.latitude) && Number.isFinite(trip.location?.longitude),
      ),
    [trips],
  );
  const initialCamera = useMemo(() => {
    if (!tripMarkers.length) {
      return {
        centerCoordinate: [19.699, 48.669],
        zoomLevel: 5,
      };
    }

    const latitudes = tripMarkers.map((trip) => trip.location.latitude);
    const longitudes = tripMarkers.map((trip) => trip.location.longitude);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);

    return {
      centerCoordinate: [(minLongitude + maxLongitude) / 2, (minLatitude + maxLatitude) / 2],
      zoomLevel: 5,
      bounds: {
        ne: [maxLongitude, maxLatitude],
        sw: [minLongitude, minLatitude],
      },
    };
  }, [tripMarkers]);
  const searchMarker = useMemo(() => {
    if (!searchResult) {
      return null;
    }

    const latitude = Number(searchResult.lat);
    const longitude = Number(searchResult.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return [longitude, latitude];
  }, [searchResult]);

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
      {mapError ? (
        <Text style={styles.errorText}>Map Error: {mapError}</Text>
      ) : null}
      <MapboxGL.MapView
        style={styles.map}
        onPress={handleMapPress}
        onDidFinishLoadingMap={handleMapReady}
        onDidFailLoadingMap={handleMapError}
      >
        <MapboxGL.Camera
          defaultSettings={{
            centerCoordinate: initialCamera.centerCoordinate,
            zoomLevel: initialCamera.zoomLevel,
          }}
          bounds={
            initialCamera.bounds
              ? {
                  ...initialCamera.bounds,
                  paddingTop: 50,
                  paddingRight: 50,
                  paddingBottom: 50,
                  paddingLeft: 50,
                }
              : undefined
          }
          animationDuration={mapReady ? 600 : 0}
        />
        {tripMarkers.map((trip) => (
          <MapboxGL.PointAnnotation
            key={trip.id}
            id={`trip-${trip.id}`}
            coordinate={[trip.location.longitude, trip.location.latitude]}
            onSelected={() => setSelectedTrip(trip)}
          >
            <View style={styles.tripMarker} />
          </MapboxGL.PointAnnotation>
        ))}

        {selectedCoordinate ? (
          <MapboxGL.PointAnnotation
            id="selected-coordinate"
            coordinate={[selectedCoordinate.longitude, selectedCoordinate.latitude]}
          >
            <View style={styles.selectedMarker} />
          </MapboxGL.PointAnnotation>
        ) : null}

        {searchMarker ? (
          <MapboxGL.PointAnnotation id="search-result" coordinate={searchMarker}>
            <View style={styles.searchMarker} />
          </MapboxGL.PointAnnotation>
        ) : null}
      </MapboxGL.MapView>
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
  errorText: {
    marginBottom: 10,
    color: '#dc2626',
    fontWeight: '600',
  },
  map: {
    flex: 1,
    borderRadius: 12,
  },
  tripMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  selectedMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(37, 99, 235, 1)',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  searchMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(22, 163, 74, 1)',
    borderWidth: 2,
    borderColor: '#ffffff',
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
