import { displayVisitDate } from '../utils/visitDate';
import { theme } from '../theme';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { VisitPhotoGallery } from './VisitPhotos';
import { validLocation } from '../utils/mapVisits';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const ratingText = (value) => {
  const rating = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : 'Bez hodnotenia';
};
export default function TripDetailsModal({ visible, trip, onClose, onEdit, onDelete }) {
  if (!trip) return null;
  const hasLocation = validLocation(trip.location);
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaProvider><SafeAreaView style={styles.screen}>
      <View style={styles.toolbar}>
        <Text style={styles.eyebrow}>MOJA NÁVŠTEVA</Text>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
          <Text style={styles.link}>Zavrieť</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>{trip.name}</Text>
        </View>
        <Text style={styles.subtitle}>{trip.locationName || 'Lokalita neuvedená'}</Text>
        <View style={styles.summary}>
          <View style={styles.summaryItem}><Text style={styles.label}>Dátum návštevy</Text>
            <Text style={styles.value}>{displayVisitDate(trip)}</Text></View>
          <View style={styles.summaryItem}><Text style={styles.label}>Moje hodnotenie</Text>
            <Text style={styles.rating}>{ratingText(trip.rating)}</Text></View>
        </View>
        <VisitPhotoGallery photos={trip.photos} title={trip.name} />
        {hasLocation ? <View style={styles.card}>
          <Text style={styles.heading}>Navštívené miesto</Text>
          {visible ? <View style={styles.mapFrame}>
            <MapView key={trip.id} style={styles.map}
              initialRegion={{ ...trip.location, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
              scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
              toolbarEnabled={false} zoomControlEnabled={false}>
              <Marker coordinate={trip.location} />
            </MapView>
          </View> : null}
          <Text selectable style={styles.coordinates}>{trip.location.latitude.toFixed(5)}, {trip.location.longitude.toFixed(5)}</Text>
        </View> : null}
        {trip.description ? <View style={styles.card}><Text style={styles.heading}>Popis návštevy</Text>
          <Text style={styles.body}>{trip.description}</Text></View> : null}
        {trip.notes ? <View style={styles.card}><Text style={styles.heading}>Poznámky</Text>
          <Text style={styles.body}>{trip.notes}</Text></View> : null}
        {!trip.description && !trip.notes ? <Text style={styles.empty}>Pridaj pár slov, aby ti táto návšteva ožila aj po rokoch.</Text> : null}
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.edit}>
          <Text style={styles.editText}>Upraviť návštevu</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDelete} style={styles.delete}>
          <Text style={styles.deleteText}>Vymazať návštevu</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  toolbar: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: theme.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  close: { paddingVertical: 16, paddingLeft: 16 },
  link: { color: theme.primary, fontWeight: '600' },
  scroll: { flex: 1, alignSelf: 'stretch' },
  container: { alignItems: 'stretch', padding: 20, paddingTop: 8, paddingBottom: 28, gap: 16 },
  titleRow: { alignSelf: 'stretch' },
  title: { alignSelf: 'stretch', fontSize: 24, lineHeight: 31, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 16, lineHeight: 23, color: theme.muted },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, paddingVertical: 8 },
  summaryItem: { minWidth: 140, flexGrow: 1, gap: 6 },
  label: { fontSize: 12, color: theme.muted },
  value: { color: theme.text, fontSize: 16, fontWeight: '600' },
  rating: { color: theme.primary, fontSize: 17 },
  card: { backgroundColor: theme.surface, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: theme.border },
  heading: { fontSize: 16, fontWeight: '700', color: theme.text },
  body: { fontSize: 16, lineHeight: 25, color: theme.text },
  mapFrame: { height: 200, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
  coordinates: { fontSize: 12, color: theme.muted },
  empty: { color: theme.muted, fontSize: 15, lineHeight: 23 },
  edit: { backgroundColor: theme.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  editText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  delete: { padding: 14, alignItems: 'center' },
  deleteText: { color: '#b91c1c', fontWeight: '600' },
});
