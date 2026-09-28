import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { theme } from '../theme';
import { displayVisitDate } from '../utils/visitDate';
import { photoKey, photoList } from '../utils/visitPhotos';
import { photoUri } from '../services/visitPhotoService';

const localPhotos = photos => photoList(photos).filter(photo => /^(file:|content:)/.test(photoUri(photo) || ''));

export default function TripShareModal({ visible, trip, onClose }) {
  const [selected, setSelected] = useState(null);
  const [includePlace, setIncludePlace] = useState(true);
  const [includeDate, setIncludeDate] = useState(true);
  const [readyPhoto, setReadyPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const card = useRef(null);
  const photos = localPhotos(trip?.photos);
  useEffect(() => {
    if (!visible) return;
    setSelected(photos.length ? photoKey(photos[0]) : null);
    setIncludePlace(true); setIncludeDate(true); setReadyPhoto(null);
  }, [visible, trip?.id]);
  const photo = photos.find(item => photoKey(item) === selected);
  const uri = photo ? photoUri(photo) : null;
  const available = !photo || readyPhoto === selected;
  const share = async () => {
    if (busy || !card.current || !available) return;
    setBusy(true);
    try {
      if (!await Sharing.isAvailableAsync()) throw new Error('Zdieľanie obrázkov nie je na tomto zariadení dostupné.');
      const image = await captureRef(card.current, { format: 'jpg', quality: 0.9, result: 'tmpfile', width: 1080, height: 1350 });
      await Sharing.shareAsync(image, { mimeType: 'image/jpeg', dialogTitle: 'Zdieľať návštevu', UTI: 'public.jpeg' });
    } catch (error) { Alert.alert('Zdieľanie návštevy', error.message || 'Obrázok sa nepodarilo vytvoriť.'); }
    finally { setBusy(false); }
  };
  if (!trip) return null;
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaProvider><SafeAreaView style={styles.screen}>
      <View style={styles.toolbar}>
        <Text style={styles.heading}>Zdieľať návštevu</Text>
        <Pressable accessibilityRole="button" onPress={onClose} disabled={busy} style={styles.close}><Text style={styles.link}>Zavrieť</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Takto bude vyzerať obrázok. Poznámky, hodnotenie ani súradnice doň nepridávame.</Text>
        <View ref={card} collapsable={false} style={styles.card}>
          {photo ? <View style={styles.photoFrame}>
            <Image key={selected} source={{ uri }} resizeMode="cover" style={styles.photo}
              onLoad={() => setReadyPhoto(selected)} onError={() => setReadyPhoto(null)} />
          </View> : <View style={styles.photoPlaceholder}><Text style={styles.symbol}>✦</Text></View>}
          <View style={styles.caption}>
            <Text style={styles.wordmark}>✦  TravelLog</Text>
            <Text style={[styles.name, trip.name.length > 55 && styles.longName]} numberOfLines={4}>{trip.name}</Text>
            {includePlace && !!trip.locationName && <Text style={styles.info} numberOfLines={2}>{trip.locationName}</Text>}
            {includeDate && !!trip.date && <Text style={styles.info}>{displayVisitDate(trip)}</Text>}
          </View>
        </View>
        {photos.length ? <>
          <Text style={styles.label}>Fotografia</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: !photo }}
              onPress={() => { setSelected(null); setReadyPhoto(null); }} style={[styles.emptyPhoto, !photo && styles.selected]}><Text style={styles.muted}>Bez fotky</Text></Pressable>
            {photos.map(item => <Pressable key={photoKey(item)} accessibilityRole="button"
              accessibilityLabel="Vybrať fotografiu na zdieľanie" accessibilityState={{ selected: selected === photoKey(item) }}
              onPress={() => { setSelected(photoKey(item)); setReadyPhoto(null); }}
              style={[styles.thumbnailFrame, selected === photoKey(item) && styles.selected]}>
              <Image source={{ uri: photoUri(item, true) }} style={styles.thumbnail} />
            </Pressable>)}
          </ScrollView>
        </> : null}
        {!!trip.locationName && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: includePlace }}
          onPress={() => setIncludePlace(value => !value)} style={styles.choice}><Text style={styles.check}>{includePlace ? '☑' : '□'}</Text><Text style={styles.choiceText}>Zobraziť lokalitu</Text></Pressable>}
        {!!trip.date && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: includeDate }}
          onPress={() => setIncludeDate(value => !value)} style={styles.choice}><Text style={styles.check}>{includeDate ? '☑' : '□'}</Text><Text style={styles.choiceText}>Zobraziť dátum návštevy</Text></Pressable>}
        <Pressable accessibilityRole="button" disabled={busy || !available} style={[styles.share, (busy || !available) && styles.disabled]}
          onPress={share}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.shareText}>{!available ? 'Načítavam fotografiu…' : 'Zdieľať obrázok'}</Text>}</Pressable>
        <Text style={styles.intro}>Vyberieš aplikáciu v systémovej ponuke. Obrázok sa nikam neodosiela automaticky.</Text>
      </ScrollView>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  toolbar: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 17, color: theme.text, fontWeight: '700' },
  close: { padding: 15 }, link: { color: theme.primary, fontWeight: '700' },
  content: { alignItems: 'center', padding: 20, paddingBottom: 40, gap: 16 },
  intro: { color: theme.muted, lineHeight: 20, alignSelf: 'stretch' },
  card: { width: '100%', maxWidth: 320, height: 400, backgroundColor: theme.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  photoFrame: { height: 182, backgroundColor: theme.primarySoft }, photo: { width: '100%', height: '100%' },
  photoPlaceholder: { height: 116, backgroundColor: theme.primarySoft, justifyContent: 'center', alignItems: 'center' },
  symbol: { color: theme.primary, fontSize: 42 },
  caption: { flex: 1, paddingHorizontal: 20, paddingVertical: 10, gap: 4 },
  wordmark: { fontSize: 13, fontWeight: '800', letterSpacing: 1, color: theme.primary },
  name: { color: theme.text, fontSize: 22, fontWeight: '800', lineHeight: 26 },
  longName: { fontSize: 18, lineHeight: 21 },
  info: { color: theme.muted, fontSize: 13, lineHeight: 18 },
  label: { alignSelf: 'stretch', fontWeight: '700', color: theme.text },
  picker: { alignItems: 'center', gap: 8 },
  emptyPhoto: { width: 76, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 5 },
  muted: { color: theme.muted, textAlign: 'center', fontSize: 12 },
  thumbnailFrame: { width: 76, height: 68, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: theme.border },
  thumbnail: { width: '100%', height: '100%', borderRadius: 6 },
  selected: { borderWidth: 2, borderColor: theme.primary },
  choice: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', minHeight: 42, gap: 8 },
  check: { color: theme.primary, fontSize: 23 }, choiceText: { color: theme.text, fontSize: 15 },
  share: { alignSelf: 'stretch', minHeight: 48, backgroundColor: theme.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  shareText: { color: '#fff', fontWeight: '700', fontSize: 16 }, disabled: { opacity: 0.5 },
});
