import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Heatmap, Marker } from 'react-native-maps';
import AddPlaceModal from '../components/AddPlaceModal';
import TripDetailsModal from '../components/TripDetailsModal';
import MapTypeToggle from '../components/MapTypeToggle';
import { useTrips } from '../context/TripsContext';
import { searchPlaces } from '../services/placeSearchService';
import { groupMarkers, modeForZoom, validLocation, zoomForRegion } from '../utils/mapVisits';

const INITIAL_REGION = { latitude: 49, longitude: 17, latitudeDelta: 35, longitudeDelta: 55 };

export default function MapScreen() {
  const { trips, addTrip, updateTrip, deleteTrip } = useTrips();
  const [region, setRegion] = useState(INITIAL_REGION);
  const [mapType, setMapType] = useState('standard');
  const [mapWidth, setMapWidth] = useState(360);
  const [selectedCoordinate, setSelectedCoordinate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const [visitGroup, setVisitGroup] = useState(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState('');
  const searchRequest = useRef(null);
  useEffect(() => () => searchRequest.current?.abort(), []);
  const mapRef = useRef(null);
  const zoom = zoomForRegion(region, mapWidth);
  const mode = modeForZoom(zoom);
  const heatPoints = useMemo(() => trips.filter((trip) => validLocation(trip.location))
    .map((trip) => ({ ...trip.location, weight: 1 })), [trips]);
  const markers = useMemo(() => mode === 'countries' ? [] : groupMarkers(trips, region, zoom, mode === 'places'),
    [trips, region, zoom, mode]);

  const showGroup = (title, visits) => {
    setSelectedCoordinate(null);
    setVisitGroup({ title, visits });
  };
  const handleCluster = (group) => {
    if (group.trips.length === 1) { setSelectedTrip(group.trips[0]); return; }
    const spread = Math.max(...group.trips.map((trip) => Math.max(
      Math.abs(trip.location.latitude - group.coordinate.latitude),
      Math.abs(trip.location.longitude - group.coordinate.longitude))));
    if (mode === 'places' || spread < 0.0001) {
      showGroup('Návštevy na tomto mieste', group.trips);
      return;
    }
    mapRef.current?.animateToRegion({ ...group.coordinate,
      latitudeDelta: Math.max(0.005, region.latitudeDelta / 3),
      longitudeDelta: Math.max(0.005, region.longitudeDelta / 3) });
  };
  const selectPoint = (event) => {
    if (event.nativeEvent.action === 'marker-press') return;
    setSelectedCoordinate(event.nativeEvent.coordinate);
  };
  const handleSearch = async () => {
    if (!query.trim() || searching) return;
    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    setSearching(true);
    setSearchError('');
    setSearchResults(null);
    Keyboard.dismiss();
    try {
      const results = await searchPlaces(query, region, controller.signal);
      if (!controller.signal.aborted) setSearchResults(results);
    } catch (error) { if (!controller.signal.aborted) setSearchError(error.message); }
    finally { if (!controller.signal.aborted) setSearching(false); }
  };
  const changeQuery = (text) => {
    searchRequest.current?.abort();
    setSearching(false);
    setQuery(text);
    setSearchResults(null);
    setSearchError('');
  };
  const chooseResult = (result) => {
    setSelectedCoordinate(result);
    setSearchResults(null);
    Keyboard.dismiss();
    mapRef.current?.animateToRegion({ latitude: result.latitude, longitude: result.longitude,
      latitudeDelta: 0.025, longitudeDelta: 0.025 });
  };
  const handleDelete = () => {
    if (!selectedTrip) return;
    const trip = selectedTrip;
    Alert.alert('Zmazať návštevu?', trip.name, [
      { text: 'Zrušiť', style: 'cancel' },
      { text: 'Zmazať', style: 'destructive', onPress: async () => {
        try { await deleteTrip(trip.id); setSelectedTrip(null); }
        catch (error) { Alert.alert('Vymazanie zlyhalo', error.message); }
      } },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mapa návštev</Text>
      <MapTypeToggle value={mapType} onChange={setMapType} />
      <View style={styles.searchRow}>
        <TextInput value={query} onChangeText={changeQuery} placeholder="Napr. kosice zoo"
          style={styles.input} returnKeyType="search" onSubmitEditing={handleSearch} />
        <Pressable style={styles.button} disabled={searching} onPress={handleSearch}>
          <Text style={styles.buttonText}>{searching ? 'Hľadám…' : 'Hľadať'}</Text>
        </Pressable>
      </View>
      {searchError ? <Text accessibilityRole="alert" style={styles.hint}>{searchError}</Text> : null}
      {searchResults !== null ? <View style={styles.results}>
        <View style={styles.resultsHeader}>
          <Text style={styles.hint}>{searchResults.length ? 'Vyber miesto' : 'Nenašli sa žiadne miesta.'}</Text>
          <Pressable onPress={() => setSearchResults(null)} accessibilityLabel="Zavrieť výsledky" hitSlop={8}>
            <Text style={styles.resultLink}>Zavrieť</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.resultList} keyboardShouldPersistTaps="handled">
          {searchResults.map((result) => <Pressable key={result.id} style={styles.resultRow}
            accessibilityRole="button" onPress={() => chooseResult(result)}>
            <Text style={styles.resultName}>{result.name}</Text>
            <Text style={styles.hint}>{result.locationName || `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`}</Text>
          </Pressable>)}
        </ScrollView>
        <Text style={styles.hint}>Chýba tvoje miesto? Doplň mesto alebo presnejší názov.</Text>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')
          .catch(() => Alert.alert('Odkaz', 'https://www.openstreetmap.org/copyright'))}>
          <Text style={styles.resultLink}>Vyhľadávanie Photon · © OpenStreetMap contributors</Text>
        </Pressable>
      </View> : null}
      <Text style={styles.hint}>{mode === 'countries'
        ? 'Heat mapa návštev · priblíž pre jednotlivé miesta.'
        : mode === 'clusters' ? 'Heat mapa a skupiny miest · ťuknutím ich priblížiš.'
        : 'Heat mapa a návštevy · ťuknutím otvoríš detail.'}</Text>
      <View style={styles.mapContainer} onLayout={(event) => setMapWidth(event.nativeEvent.layout.width)}>
        <MapView ref={mapRef} style={styles.map} initialRegion={INITIAL_REGION}
          mapType={mapType}
          onRegionChangeComplete={setRegion} onPress={selectPoint}
          onPoiClick={(event) => setSelectedCoordinate({ ...event.nativeEvent.coordinate, name: event.nativeEvent.name })}>
          {heatPoints.length > 0 ? <Heatmap points={heatPoints} radius={28} opacity={0.55} /> : null}
          {markers.map((group) => (
            <Marker key={mode + ':' + Math.floor(zoom) + ':' + group.key + ':' + group.trips.length}
              coordinate={group.coordinate} title={group.trips.length === 1 ? group.trips[0].name : undefined}
              onPress={(event) => { event.stopPropagation(); handleCluster(group); }}>
              {group.trips.length > 1 ? <View style={styles.cluster}>
                <Text style={styles.clusterText}>{group.trips.length}</Text>
              </View> : null}
            </Marker>
          ))}
          {selectedCoordinate ? <Marker coordinate={selectedCoordinate} pinColor="#16a34a" /> : null}
        </MapView>
      </View>
      {selectedCoordinate ? <Text numberOfLines={2} style={styles.hint}>Vybrané: {selectedCoordinate.name ||
        selectedCoordinate.latitude.toFixed(4) + ', ' + selectedCoordinate.longitude.toFixed(4)}</Text> : null}
      <Pressable style={styles.button} onPress={() => setModalVisible(true)}>
        <Text style={styles.buttonText}>+ Pridať návštevu{selectedCoordinate ? ' na vybranom mieste' : ''}</Text>
      </Pressable>
      <AddPlaceModal visible={modalVisible} title="Pridať návštevu" coordinates={selectedCoordinate}
        onClose={() => setModalVisible(false)} onSave={async (trip) => {
          await addTrip(trip); setModalVisible(false); setSelectedCoordinate(null);
          Alert.alert('Hotovo', 'Návšteva bola uložená.');
        }} />
      <AddPlaceModal visible={Boolean(editingTrip)} initialTrip={editingTrip} title="Upraviť návštevu"
        submitLabel="Uložiť zmeny" onClose={() => setEditingTrip(null)}
        onSave={async (trip) => { await updateTrip(editingTrip.id, trip); setEditingTrip(null); }} />
      <TripDetailsModal visible={Boolean(selectedTrip)} trip={selectedTrip} onClose={() => setSelectedTrip(null)}
        onEdit={() => { setEditingTrip(selectedTrip); setSelectedTrip(null); }} onDelete={handleDelete} />
      <Modal visible={Boolean(visitGroup)} animationType="slide" onRequestClose={() => setVisitGroup(null)}>
        <SafeAreaProvider><SafeAreaView style={styles.container}>
          <Text style={styles.header}>{visitGroup?.title}</Text>
          <Text style={styles.hint}>Počet návštev: {visitGroup?.visits.length || 0}</Text>
          <ScrollView style={{ flex: 1 }}>
            {visitGroup?.visits.map((trip) => <Pressable key={trip.id} style={styles.visitRow}
              onPress={() => { setVisitGroup(null); setSelectedTrip(trip); }}>
              <Text style={styles.visitName}>{trip.name}</Text><Text>{trip.date} · {trip.locationName}</Text>
            </Pressable>)}
          </ScrollView>
          <Pressable style={styles.button} onPress={() => setVisitGroup(null)}><Text style={styles.buttonText}>Zavrieť</Text></Pressable>
        </SafeAreaView></SafeAreaProvider>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10, backgroundColor: '#f9fafb' },
  header: { fontSize: 22, fontWeight: '700', color: '#111827' },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#fff' },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 13, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  hint: { color: '#4b5563', fontSize: 12 },
  mapContainer: { flex: 1, minHeight: 160 },
  map: { flex: 1 },
  cluster: { minWidth: 42, height: 42, paddingHorizontal: 8, borderRadius: 21, backgroundColor: '#2563eb', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  clusterText: { fontWeight: '700', color: '#fff', fontSize: 16 },
  results: { flexShrink: 1, backgroundColor: '#fff', padding: 10, borderRadius: 10, gap: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  resultList: { maxHeight: 180, flexShrink: 1 },
  resultRow: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e5e7eb', gap: 3 },
  resultName: { fontWeight: '600', color: '#111827' },
  resultLink: { color: '#2563eb', fontSize: 12 },
  visitRow: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#e5e7eb', gap: 4 },
  visitName: { fontWeight: '700', fontSize: 16 },
});
