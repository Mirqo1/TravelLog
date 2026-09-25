import { WishlistEditor } from '../components/WishlistModal';
import { useWishlist } from '../context/WishlistContext';
import { displayVisitDate } from '../utils/visitDate';
import { theme } from '../theme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Alert, Keyboard, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Heatmap, Marker } from 'react-native-maps';
import AddPlaceModal from '../components/AddPlaceModal';
import TripDetailsModal from '../components/TripDetailsModal';
import MapTypeToggle from '../components/MapTypeToggle';
import { useTrips } from '../context/TripsContext';
import { searchPlaces } from '../services/placeSearchService';
import { countryDisplayName, countryMarkers, groupMarkers, stableModeForZoom, validLocation, zoomForRegion } from '../utils/mapVisits';

const INITIAL_REGION = { latitude: 49, longitude: 17, latitudeDelta: 35, longitudeDelta: 55 };

export default function MapScreen({ route, navigation }) {
  const isFocused = useIsFocused();
  const { premium, items: wishes } = useWishlist();
  const [pickingWish, setPickingWish] = useState(false);
  const [wishDraft, setWishDraft] = useState(null);
  const wishHandled = useRef(null);
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
  const overviewHandled = useRef(null);
  const mapReady = useRef(false);
  useEffect(() => { if (!isFocused) mapReady.current = false; }, [isFocused]);
  const openWishEditor = coordinate => {
    const existing = wishes.find(item => item.id === coordinate.wishlistId);
    setWishDraft(existing || { name: coordinate.name || '', latitude: coordinate.latitude,
      longitude: coordinate.longitude, locationName: coordinate.locationName || '', countryCode: coordinate.countryCode || '' });
  };
  const selectCoordinate = coordinate => {
    setSelectedCoordinate(coordinate);
    if (pickingWish && premium) { setPickingWish(false); openWishEditor(coordinate); }
  };
  const showWish = () => {
    const request = route.params?.wishRequest;
    if (!request || wishHandled.current === request || !mapReady.current || !mapRef.current) return;
    wishHandled.current = request;
    const item = route.params.wishPlace;
    setPickingWish(!item && premium);
    setSelectedCoordinate(item ? { ...item.location, name: item.name, locationName: item.locationName, countryCode: item.countryCode, wishlistId: item.id } : null);
    if (item) mapRef.current.animateToRegion({ ...item.location, latitudeDelta: 0.025, longitudeDelta: 0.025 });
  };
  useEffect(() => { if (isFocused) showWish(); }, [route.params?.wishRequest, isFocused]);
  const showOverview = () => {
    const request = route.params?.overviewRequest;
    if (!request || overviewHandled.current === request || !mapReady.current || !mapRef.current) return;
    overviewHandled.current = request;
    setPickingWish(false);
    setSelectedCoordinate(null);
    const points = [...trips.map((trip) => trip.location).filter(validLocation), ...countryMarkers(trips).map((group) => group.coordinate)];
    if (points.length) mapRef.current.fitToCoordinates(points, { edgePadding: { top: 70, right: 55, bottom: 70, left: 55 }, animated: true });
    else mapRef.current.animateToRegion(INITIAL_REGION);
  };
  useEffect(() => { if (isFocused) showOverview(); }, [route.params?.overviewRequest, isFocused]);
  const zoom = zoomForRegion(region, mapWidth);
  const [mode, setMode] = useState('countries');
  useEffect(() => setMode((previous) => stableModeForZoom(zoom, previous)), [zoom]);
  const heatPoints = useMemo(() => trips.filter((trip) => validLocation(trip.location))
    .map((trip) => ({ ...trip.location, weight: 1 })), [trips]);
  const countryPins = useMemo(() => countryMarkers(trips), [trips]);
  const markers = useMemo(() => mode === 'countries' ? [] : groupMarkers(trips, region, zoom, mode === 'places'),
    [trips, region, zoom, mode]);

  const wishMarkers = useMemo(() => mode === 'countries' ? [] : groupMarkers(wishes, region, zoom, mode === 'places'),
    [wishes, region, zoom, mode]);
  const selectWish = item => selectCoordinate({ ...item.location, name: item.name,
    locationName: item.locationName, countryCode: item.countryCode, wishlistId: item.id });
  const handleWishCluster = group => {
    if (group.trips.length === 1) { selectWish(group.trips[0]); return; }
    const spread = Math.max(...group.trips.map(item => Math.max(Math.abs(item.location.latitude - group.coordinate.latitude),
      Math.abs(item.location.longitude - group.coordinate.longitude))));
    if (mode === 'places' || spread < 0.0001) {
      setVisitGroup({ title: 'Chcem navštíviť', visits: group.trips, wishlist: true });
    } else mapRef.current?.animateToRegion({ ...group.coordinate,
      latitudeDelta: Math.max(0.005, region.latitudeDelta / 3), longitudeDelta: Math.max(0.005, region.longitudeDelta / 3) });
  };

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
    selectCoordinate(event.nativeEvent.coordinate);
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
    selectCoordinate(result);
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
      <View style={styles.mapHeader}>
        <Text style={[styles.header, { flex: 1 }]}>Mapa návštev</Text>

      </View>
      <MapTypeToggle value={mapType} onChange={setMapType} />
      <View style={styles.searchRow}>
        <TextInput value={query} onChangeText={changeQuery} placeholder="Napr. Big Ben London"
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
      <Text accessibilityLiveRegion="polite" style={styles.hint}>{pickingWish ? 'Vyhľadaj miesto alebo ťukni na mapu. Opätovným stlačením tlačidla výber zrušíš.' : mode === 'countries'
        ? 'Počet návštev v krajine · ťukni na číslo pre zoznam.'
        : mode === 'clusters' ? 'Skupiny návštev · ☆ plánované miesta. Ťuknutím priblížiš.'
        : 'Heat mapa a návštevy · ☆ plánované miesta.'}</Text>
      <View style={styles.mapContainer} onLayout={(event) => setMapWidth(event.nativeEvent.layout.width)}>
        {isFocused ? <MapView ref={mapRef} style={styles.map} initialRegion={region}
          mapType={mapType} onMapReady={() => { mapReady.current = true; showOverview(); showWish(); }}
          onRegionChangeComplete={setRegion} onPress={selectPoint}
          onPoiClick={(event) => selectCoordinate({ ...event.nativeEvent.coordinate, name: event.nativeEvent.name })}>
          {heatPoints.length > 0 ? <Heatmap points={heatPoints} radius={28} opacity={0.55} /> : null}
          {mode === 'countries' ? countryPins.map((group) => <Marker key={'country:' + group.country.code}
            coordinate={group.coordinate} anchor={{ x: 0.5, y: 0.5 }}
            onPress={(event) => { event.stopPropagation(); showGroup(countryDisplayName(group.country), group.trips); }}>
            <View style={styles.cluster}><Text style={styles.clusterText}>{group.trips.length}</Text></View>
          </Marker>) : null}
          {markers.map((group) => (
            <Marker key={'visits:' + group.trips.map((trip) => trip.id).sort().join('|')}
              coordinate={group.coordinate} title={group.trips.length === 1 ? group.trips[0].name : undefined}
              onPress={(event) => { event.stopPropagation(); handleCluster(group); }}>
              {group.trips.length > 1 ? <View style={styles.cluster}>
                <Text style={styles.clusterText}>{group.trips.length}</Text>
              </View> : null}
            </Marker>
          ))}
          {wishMarkers.map(group => <Marker key={'wishes:' + group.trips.map(item => item.id).sort().join('|')}
            coordinate={group.coordinate} anchor={{ x: 0.5, y: 0.5 }} zIndex={2}
            accessibilityLabel={group.trips.length === 1 ? `Chcem navštíviť: ${group.trips[0].name}` : `Moje sny: ${group.trips.length} miest`}
            onPress={event => { event.stopPropagation(); handleWishCluster(group); }}>
            <View style={styles.wishMarker}><Text style={styles.wishMarkerText}>☆{group.trips.length > 1 ? ` ${group.trips.length}` : ''}</Text></View>
          </Marker>)}
          {selectedCoordinate ? <Marker zIndex={3} coordinate={selectedCoordinate} pinColor="#16a34a" /> : null}
        </MapView> : null}
      </View>
      {selectedCoordinate ? <Text numberOfLines={2} style={styles.hint}>Vybrané: {selectedCoordinate.name ||
        selectedCoordinate.latitude.toFixed(4) + ', ' + selectedCoordinate.longitude.toFixed(4)}</Text> : null}
      <View style={styles.mapActions}>
      <Pressable accessibilityRole="button" style={[styles.button, styles.mapAction]} onPress={() => { setPickingWish(false); setModalVisible(true); }}>
        <Text style={styles.buttonText}>+ Pridať návštevu</Text>
      </Pressable>
      {premium ? <Pressable accessibilityRole="button" accessibilityState={{ selected: pickingWish }}
        style={[styles.button, styles.mapAction, styles.wishAction, pickingWish && { backgroundColor: theme.primarySoft }]}
        onPress={() => {
          Keyboard.dismiss();
          if (selectedCoordinate) { setPickingWish(false); openWishEditor(selectedCoordinate); }
          else setPickingWish(current => !current);
        }}><Text style={[styles.buttonText, { color: theme.primary }]}>☆ Chcem navštíviť</Text></Pressable> : null}
      </View>
      {wishDraft ? <WishlistEditor place={wishDraft} onClose={() => setWishDraft(null)} /> : null}
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
          <Text style={styles.hint}>{visitGroup?.wishlist ? 'Plánované miesta' : 'Počet návštev'}: {visitGroup?.visits.length || 0}</Text>
          <ScrollView style={{ flex: 1 }}>
            {visitGroup?.visits.map((trip) => <Pressable key={trip.id} style={styles.visitRow}
              onPress={() => { setVisitGroup(null); if (visitGroup.wishlist) selectWish(trip); else setSelectedTrip(trip); }}>
              <Text style={styles.visitName}>{trip.name}</Text><Text>{visitGroup.wishlist ? trip.locationName : `${displayVisitDate(trip)} · ${trip.locationName}`}</Text>
            </Pressable>)}
          </ScrollView>
          <Pressable style={styles.button} onPress={() => setVisitGroup(null)}><Text style={styles.buttonText}>Zavrieť</Text></Pressable>
        </SafeAreaView></SafeAreaProvider>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  mapHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wishlistEntry: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, flexShrink: 1 },
  wishlistEntryText: { color: theme.primary, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  wishMarker: { minWidth: 36, height: 36, borderRadius: 10, backgroundColor: theme.surface, borderWidth: 2,
    borderColor: theme.primary, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  wishMarkerText: { color: theme.primary, fontWeight: '800', fontSize: 20 },
  mapActions: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  mapAction: { flex: 1, minHeight: 48, paddingHorizontal: 8 },
  wishAction: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.primary },
  container: { flex: 1, padding: 16, gap: 10, backgroundColor: 'transparent' },
  header: { fontSize: 22, fontWeight: '700', color: theme.text },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#fff' },
  button: { backgroundColor: theme.primary, borderRadius: 10, padding: 13, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  hint: { color: theme.muted, fontSize: 12 },
  mapContainer: { flex: 1, minHeight: 160 },
  map: { flex: 1 },
  cluster: { minWidth: 42, height: 42, paddingHorizontal: 8, borderRadius: 21, backgroundColor: theme.primary, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  clusterText: { fontWeight: '700', color: '#fff', fontSize: 16 },
  results: { flexShrink: 1, backgroundColor: '#fff', padding: 10, borderRadius: 10, gap: 8, borderWidth: 1, borderColor: theme.border },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  resultList: { maxHeight: 180, flexShrink: 1 },
  resultRow: { paddingVertical: 10, borderBottomWidth: 1, borderColor: theme.border, gap: 3 },
  resultName: { fontWeight: '600', color: theme.text },
  resultLink: { color: theme.primary, fontSize: 12 },
  visitRow: { paddingVertical: 16, borderBottomWidth: 1, borderColor: theme.border, gap: 4 },
  visitName: { fontWeight: '700', fontSize: 16 },
});
