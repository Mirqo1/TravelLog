import { countryDisplayName } from '../utils/mapVisits';
import { displayVisitDate } from '../utils/visitDate';
import { theme } from '../theme';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CountriesModal from '../components/CountriesModal';
import { useCloudSync } from '../context/CloudSyncContext';
import AddVisitButton from '../components/AddVisitButton';
import AddPlaceModal from '../components/AddPlaceModal';
import TripDetailsModal from '../components/TripDetailsModal';
import { useTrips } from '../context/TripsContext';

export default function HomeScreen({ navigation }) {
  const { loading, error, stats, trips, updateTrip, deleteTrip, refreshTrips } = useTrips();
  const [countriesOpen, setCountriesOpen] = useState(false);
  const { account, status, message } = useCloudSync();
  const backupTitle = !account ? 'Uložené v tomto telefóne' : status === 'synced' ? 'Návštevy zálohované' : status === 'syncing' || status === 'connecting' ? 'Ukladám do cloudu…' : 'Záloha čaká na uloženie';
  const backupMessage = !account ? 'Pre automatické zálohovanie sa prihlás do cloudového účtu v Profile.' : status === 'synced' ? 'Automatická záloha funguje počas používania aplikácie vo všetkých záložkách. Fotografie zatiaľ nie sú súčasťou zálohy.' : message || 'Údaje sú v telefóne. Po dokončení prenosu sa tu zobrazí potvrdenie zálohy.';
  const [selectedId, setSelectedId] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const selectedTrip = trips.find((trip) => trip.id === selectedId);
  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" /></View>;
  const removeSelected = () => {
    if (!selectedTrip) return;
    const trip = selectedTrip;
    Alert.alert('Zmazať návštevu?', trip.name, [
      { text: 'Zrušiť', style: 'cancel' },
      { text: 'Zmazať', style: 'destructive', onPress: async () => {
        try { await deleteTrip(trip.id); setSelectedId(null); }
        catch (failure) { Alert.alert('Vymazanie zlyhalo', failure.message); }
      } },
    ]);
  };
  return <>
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.brand}>
        <Image source={require('../../assets/compass-foreground.png')} style={{ width: 100, height: 100 }} resizeMode="contain" accessibilityLabel="Kompas" />
        <Text style={styles.brandName}>TravelLog</Text>
        <Text style={styles.muted}>Tvoje miesta. Tvoje príbehy.</Text>
      </View>
      {error ? <View style={styles.card}>
        <Text accessibilityRole="alert" style={styles.muted}>{error}</Text>
        <Pressable onPress={refreshTrips} style={styles.linkButton}><Text style={styles.link}>Skúsiť načítať znova</Text></Pressable>
      </View> : null}
      <AddVisitButton />
      <View style={styles.statsRow}>
        {[{ label: 'Návštevy', value: stats.totalTrips, icon: 'place', route: 'Trips' },
          { label: 'Krajiny', value: stats.countriesVisited, icon: 'public', route: 'Map' }].map((item) => (
          <Pressable key={item.route} accessibilityRole="button" accessibilityLabel={`${item.label}: ${item.value}. Otvoriť ${item.route}`}
            onPress={() => item.route === 'Map' ? setCountriesOpen(true) : navigation.navigate('Trips', { countryCode: null })} style={({ pressed }) => [styles.card, styles.stat, pressed && styles.pressed]}>
            <View style={{ alignItems: 'center' }}><MaterialIcons name={item.icon} color={theme.primary} size={22} /></View>
            <Text style={styles.statValue}>{item.value}</Text><Text style={styles.muted}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Posledné návštevy</Text>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Trips', { countryCode: null })} style={styles.linkButton}>
          <Text style={styles.link}>Zobraziť všetky</Text>
        </Pressable>
      </View>
      {stats.recentTrips.length ? stats.recentTrips.map((trip) => (
        <Pressable key={trip.id} accessibilityRole="button" onPress={() => setSelectedId(trip.id)}
          style={({ pressed }) => [styles.card, styles.visitCard, pressed && styles.pressed]}>
          <View style={styles.body}>
            <Text style={styles.visitName}>{trip.name}</Text>
            <Text style={styles.muted}>{trip.locationName || 'Lokalita neuvedená'}</Text>
            <Text style={styles.visitDate}>{displayVisitDate(trip)}{trip.rating ? `  ·  ★ ${trip.rating}/5` : ''}</Text>
          </View>
        </Pressable>
      )) : <View style={[styles.card, styles.empty]}>
        <MaterialIcons name="explore" color={theme.primary} size={40} />
        <Text style={styles.visitName}>Kam ťa zaviedli tvoje cesty?</Text>
        <Text style={styles.muted}>Pridaj prvé miesto a začni si skladať mapu spomienok.</Text>
      </View>}
      <View style={styles.storage}>
        <MaterialIcons name="phone-android" size={20} color={theme.muted} />
        <View style={styles.body}><Text style={styles.storageTitle}>{backupTitle}</Text>
          <Text style={styles.muted}>{backupMessage}</Text></View>
      </View>
    </ScrollView>
    <CountriesModal visible={countriesOpen} trips={trips} onClose={() => setCountriesOpen(false)}
      onCountry={(country) => { setCountriesOpen(false); navigation.navigate('Trips', { countryCode: country.code, countryName: countryDisplayName(country) }); }}
      onMap={() => { setCountriesOpen(false); navigation.navigate('Map', { overviewRequest: Date.now() }); }} />
    <TripDetailsModal visible={Boolean(selectedTrip)} trip={selectedTrip} onClose={() => setSelectedId(null)}
      onEdit={() => { setEditingTrip(selectedTrip); setSelectedId(null); }} onDelete={removeSelected} />
    <AddPlaceModal visible={Boolean(editingTrip)} initialTrip={editingTrip} title="Upraviť návštevu"
      submitLabel="Uložiť zmeny" onClose={() => setEditingTrip(null)} onSave={async (trip) => {
        await updateTrip(editingTrip.id, trip); setEditingTrip(null);
      }} />
  </>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  container: { padding: 20, paddingBottom: 28, gap: 14 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  brand: { alignItems: 'center', paddingVertical: 16, gap: 7 },
  brandIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 30, fontWeight: '800', color: theme.text, letterSpacing: -0.5 },
  statsRow: { flexDirection: 'row', gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 17, gap: 5 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 38, fontWeight: '800', color: theme.text },
  pressed: { opacity: 0.7 },
  sectionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: theme.text },
  linkButton: { paddingVertical: 12 },
  link: { color: theme.primary, fontWeight: '600' },
  visitCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  visitIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: theme.primarySoft, justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1, gap: 4 },
  visitName: { fontSize: 16, fontWeight: '700', color: theme.text },
  visitDate: { color: theme.muted, fontSize: 12, marginTop: 3 },
  muted: { color: theme.muted, lineHeight: 20, flexShrink: 1 },
  empty: { alignItems: 'center', gap: 12, padding: 24 },
  storage: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  storageTitle: { fontWeight: '600', color: theme.muted },
});
