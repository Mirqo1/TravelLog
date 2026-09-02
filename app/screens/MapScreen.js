import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import AddPlaceModal from '../components/AddPlaceModal';
import { addPlace } from '../services/placesService';
import { searchPlaces } from '../services/geonamesService';
import { useAuth } from '../context/AuthContext';

export default function MapScreen() {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCoordinate, setSelectedCoordinate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const initialRegion = useMemo(
    () => ({
      latitude: 48.669,
      longitude: 19.699,
      latitudeDelta: 15,
      longitudeDelta: 15,
    }),
    [],
  );

  const handleMapPress = (event) => {
    const coordinate = event.nativeEvent.coordinate;
    setSelectedCoordinate({ lat: coordinate.latitude, lng: coordinate.longitude });
    setModalVisible(true);
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

  const handleSave = async (place) => {
    try {
      if (!user) {
        Alert.alert('Prihlásenie', 'Pre uloženie miesta sa prihlás.');
        return;
      }
      await addPlace({ ...place, userId: user.uid });
      setModalVisible(false);
      Alert.alert('Hotovo', 'Miesto bolo uložené.');
    } catch (error) {
      Alert.alert('Ukladanie zlyhalo', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mapa & Pridať Miesto</Text>
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
        <Text style={styles.searchHint}>Klikni na mapu alebo vyhľadaj miesto.</Text>
      )}
      <MapView style={styles.map} initialRegion={initialRegion} onPress={handleMapPress}>
        {selectedCoordinate ? (
          <Marker
            coordinate={{
              latitude: selectedCoordinate.lat,
              longitude: selectedCoordinate.lng,
            }}
          />
        ) : null}
      </MapView>
      <AddPlaceModal
        visible={modalVisible}
        coordinates={selectedCoordinate}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
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
  map: {
    flex: 1,
    borderRadius: 12,
  },
});
