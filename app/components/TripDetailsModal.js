import AddPlaceModal from './AddPlaceModal';
import { repeatVisitDraft } from '../utils/repeatVisits';
import { useTrips } from '../context/TripsContext';
import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
import { normalizeTags } from '../utils/backup';
import { displayVisitDate } from '../utils/visitDate';
import { theme } from '../theme';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { VisitPhotoGallery } from './VisitPhotos';
import { validLocation } from '../utils/mapVisits';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { usePhotoAccess } from '../hooks/usePhotoAccess';
import TripShareModal from './TripShareModal';
import VisitShareActions from './VisitShareActions';
import VisitTransferModal from './VisitTransferModal';

const ratingText = (value) => {
  const rating = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : t("Bez hodnotenia");
};
export default function TripDetailsModal({ visible, trip, onClose, onEdit, onDelete }) {
  useLanguage();
  const { addTrip } = useTrips();
  const [repeatDraft, setRepeatDraft] = useState(null);
  const [mapTouching, setMapTouching] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { canAddPhotos: canShare } = usePhotoAccess();
  useEffect(() => { if (!visible) { setShareOpen(false); setRepeatDraft(null); setMapTouching(false); } }, [visible]);
  if (!trip) return null;
  const hasLocation = validLocation(trip.location);
  return <><Modal visible={visible && !repeatDraft} animationType="slide" onRequestClose={onClose}>
    <SafeAreaProvider><SafeAreaView style={styles.screen}>
      <View style={styles.toolbar}>
        <Text style={styles.eyebrow}>{t("MOJA NÁVŠTEVA")}</Text>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
          <Text style={styles.link}>{t("Zavrieť")}</Text>
        </Pressable>
      </View>
      <ScrollView scrollEnabled={!mapTouching} style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>{trip.name}</Text>
        </View>
        <Text style={styles.subtitle}>{trip.locationName || t("Lokalita neuvedená")}</Text>
        <View style={styles.summary}>
          <View style={styles.summaryItem}><Text style={styles.label}>{t("Dátum návštevy")}</Text>
            <Text style={styles.value}>{displayVisitDate(trip)}</Text></View>
          <View style={styles.summaryItem}><Text style={styles.label}>{t("Moje hodnotenie")}</Text>
            <Text style={styles.rating}>{ratingText(trip.rating)}</Text></View>
        </View>
        {normalizeTags(trip.tags).length ? <View style={styles.tags}>
          {normalizeTags(trip.tags).map(tag => <Text key={tag} style={styles.tag}>{tag}</Text>)}
        </View> : null}
        <VisitPhotoGallery photos={trip.photos} title={trip.name} />
        {hasLocation ? <View style={styles.card}>
          <Text style={styles.heading}>{t("Navštívené miesto")}</Text>
          {visible ? <View style={styles.mapFrame} onTouchStart={() => setMapTouching(true)}
            onTouchEnd={event => setMapTouching(Boolean(event.nativeEvent.touches?.length))}
            onTouchCancel={() => setMapTouching(false)}>
            <MapView key={trip.id} style={styles.map}
              initialRegion={{ ...trip.location, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
              scrollEnabled zoomEnabled rotateEnabled pitchEnabled
              toolbarEnabled={false} zoomControlEnabled>
              <Marker coordinate={trip.location} />
            </MapView>
          </View> : null}
          <Text selectable style={styles.coordinates}>{trip.location.latitude.toFixed(5)}, {trip.location.longitude.toFixed(5)}</Text>
        </View> : null}
        {trip.description ? <View style={styles.card}><Text style={styles.heading}>{t("Popis návštevy")}</Text>
          <Text style={styles.body}>{trip.description}</Text></View> : null}
        {trip.notes ? <View style={styles.card}><Text style={styles.heading}>{t("Poznámky")}</Text>
          <Text style={styles.body}>{trip.notes}</Text></View> : null}
        {!trip.description && !trip.notes ? <Text style={styles.empty}>{t("Pridaj pár slov, aby ti táto návšteva ožila aj po rokoch.")}</Text> : null}
        {canShare ? <Pressable accessibilityRole="button" onPress={() => setShareOpen(true)} style={styles.share}>
          <Text style={styles.shareText}>{t("Zdieľať návštevu")}</Text>
        </Pressable> : null}
        {hasLocation ? <Pressable accessibilityRole="button" onPress={() => { setShareOpen(false); setRepeatDraft(repeatVisitDraft(trip)); }} style={styles.share}>
          <Text style={styles.shareText}>{t('Navštívil som znova')}</Text>
        </Pressable> : null}
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.edit}>
          <Text style={styles.editText}>{t("Upraviť návštevu")}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDelete} style={styles.delete}>
          <Text style={styles.deleteText}>{t("Vymazať návštevu")}</Text>
        </Pressable>
      </ScrollView>
      <VisitShareActions visible={shareOpen === true && visible} onChoose={setShareOpen} onClose={() => setShareOpen(false)} />
      <VisitTransferModal visible={Boolean(visible && (shareOpen === 'copy' || shareOpen === 'invitation'))} kind={shareOpen === 'invitation' ? 'invitation' : 'copy'} trip={trip} onClose={() => setShareOpen(false)} />
      <TripShareModal visible={shareOpen === 'card' && visible} trip={trip} onClose={() => setShareOpen(false)} />
    </SafeAreaView></SafeAreaProvider>
  </Modal>
    <AddPlaceModal visible={Boolean(repeatDraft) && visible} initialTrip={repeatDraft} title={t('Nová návšteva tohto miesta')}
      submitLabel={t('Uložiť návštevu')} onClose={() => setRepeatDraft(null)}
      onSave={async draft => { await addTrip(draft); setRepeatDraft(null); onClose(); }} />
  </>;
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
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { color: theme.primary, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 13 },
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
  share: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  shareText: { color: theme.primary, fontWeight: '700', fontSize: 16 },
  editText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  delete: { padding: 14, alignItems: 'center' },
  deleteText: { color: '#b91c1c', fontWeight: '600' },
});
