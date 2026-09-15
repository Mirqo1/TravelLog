import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import TripForm from '../components/TripForm';
import { useTrips } from '../context/TripsContext';

export default function AddTripScreen() {
  const { addTrip } = useTrips();
  const [formKey, setFormKey] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: 48.1486,
    longitude: 17.1077,
  });

  const initialRegion = useMemo(
    () => ({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      latitudeDelta: 10,
      longitudeDelta: 10,
    }),
    [selectedLocation.latitude, selectedLocation.longitude],
  );

  const handleSave = async (trip) => {
    await addTrip(trip);
    setFormKey((current) => current + 1);
    Alert.alert('Hotovo', 'Výlet bol uložený.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Add Trip</Text>
      <Text style={styles.helper}>Ťukni na mapu pre výber polohy alebo uprav súradnice vo formulári.</Text>
      <View style={styles.mapCard}>
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          onPress={(event) => setSelectedLocation(event.nativeEvent.coordinate)}
        >
          <Marker coordinate={selectedLocation} />
        </MapView>
      </View>
      <TripForm
        key={formKey}
        title="Nový výlet"
        submitLabel="Pridať výlet"
        externalLocation={selectedLocation}
        onSubmit={handleSave}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    backgroundColor: '#f9fafb',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  helper: {
    color: '#4b5563',
  },
  mapCard: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  map: {
    flex: 1,
  },
});
