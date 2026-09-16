import React, { useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polygon } from 'react-native-maps';
import AddPlaceModal from '../components/AddPlaceModal';
import TripDetailsModal from '../components/TripDetailsModal';
import MapTypeToggle from '../components/MapTypeToggle';
import { useTrips } from '../context/TripsContext';
import { searchPlaces } from '../services/geonamesService';
import { groupMarkers, modeForZoom, shadeForCount, summarizeCountries, validLocation, zoomForRegion } from '../utils/mapVisits';

const INITIAL_REGION = { latitude: 49, longitude: 17, latitudeDelta: 35, longitudeDelta: 55 };
const coordinate = ([longitude, latitude]) => ({ latitude, longitude });

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
  const mapRef = useRef(null);
  const zoom = zoomForRegion(region, mapWidth);
  const mode = modeForZoom(zoom);
  const summary = useMemo(() => summarizeCountries(trips), [trips]);
  const countryLayers = useMemo(() => summary.groups.flatMap(({ country, trips: visits }) =>
    country.polygons.map(([outer, ...holes], index) => ({
      key: country.code + '-' + index, country, visits,
      coordinates: outer.map(coordinate), holes: holes.map((ring) => ring.map(coordinate)),
    }))), [summary]);
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
    setSearching(true);
    try {
      const results = await searchPlaces(query);
      const result = results.find((item) => validLocation({ latitude: Number(item.lat), longitude: Number(item.lng) }));
      if (!result) { Alert.alert('Vyhľadávanie', 'Nenašli sa žiadne miesta.'); return; }
      const point = { latitude: Number(result.lat), longitude: Number(result.lng), name: result.name };
      setSelectedCoordinate(point);
      mapRef.current?.animateToRegion({ ...point, latitudeDelta: 0.025, longitudeDelta: 0.025 });
    } catch (error) { Alert.alert('Vyhľadávanie', error.message); }
    finally { setSearching(false); }
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
        <TextInput value={query} onChangeText={setQuery} placeholder="Vyhľadaj miesto"
          style={styles.input} returnKeyType="search" onSubmitEditing={handleSearch} />
        <Pressable style={styles.button} disabled={searching} onPress={handleSearch}>
          <Text style={styles.buttonText}>{searching ? 'Hľadám…' : 'Hľadať'}</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>{mode === 'countries'
        ? 'Prehľad krajín · priblíž mapu pre jednotlivé miesta.'
        : mode === 'clusters' ? 'Skupiny miest · ťuknutím ich priblížiš.'
        : 'Jednotlivé návštevy · ťuknutím otvoríš detail.'}</Text>
      <View style={styles.mapContainer} onLayout={(event) => setMapWidth(event.nativeEvent.layout.width)}>
        <MapView ref={mapRef} style={styles.map} initialRegion={INITIAL_REGION}
          mapType={mapType}
          onRegionChangeComplete={setRegion} onPress={selectPoint}
          onPoiClick={(event) => setSelectedCoordinate({ ...event.nativeEvent.coordinate, name: event.nativeEvent.name })}>
          {mode === 'countries' ? countryLayers.map((layer) => (
            <Polygon key={layer.key} coordinates={layer.coordinates} holes={layer.holes}
              fillColor={shadeForCount(layer.visits.length)} strokeColor="#2563eb" strokeWidth={1}
              tappable onPress={(event) => { event.stopPropagation(); showGroup(layer.country.name, layer.visits); }} />
          )) : null}
          {markers.map((group) => (
            <Marker key={mode + ':' + Math.floor(zoom) + ':' + group.key + ':' + group.trips.length}
              coordinate={group.coordinate} title={group.trips.length === 1 ? group.trips[0].name : undefined}
              onPress={(event) => { event.stopPropagation(); handleCluster(group); }}>
              {group.trips.length > 1 ? <View style={styles.cluster}>
                <Text style={styles.clusterText}>{group.trips.length}</Text>
              </View> : null}
            </Marker>
          ))}
          {mode !== 'countries' && selectedCoordinate ? <Marker coordinate={selectedCoordinate} pinColor="#16a34a" /> : null}
        </MapView>
      </View>
      {mode === 'countries' ? (
        <View>
          <Text style={styles.hint}>Počet návštev v krajine</Text>
          <View style={styles.legend}>
            {[['1', 1], ['2–4', 2], ['5–9', 5], ['10+', 10]].map(([label, count]) => (
              <View key={label} style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: shadeForCount(count) }]} /><Text>{label}</Text></View>
            ))}
          </View>
          {summary.unmatched ? <Text style={styles.hint}>Bez určenej krajiny: {summary.unmatched}. Návštevy nájdeš v Trips.</Text> : null}
        </View>
      ) : null}
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
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 16, height: 16, borderRadius: 3 },
  visitRow: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#e5e7eb', gap: 4 },
  visitName: { fontWeight: '700', fontSize: 16 },
});
