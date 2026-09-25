import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { VisitPhotoImage } from './VisitPhotos';
import { MAX_VISIT_PHOTOS, photoKey, photoList, selectCover } from '../utils/visitPhotos';
import { usePhotoAccess } from '../hooks/usePhotoAccess';
import { theme } from '../theme';

export default function VisitPhotoEditor({ photos, onChange, onImport, disabled, onBusy }) {
  const { canAddPhotos, preview } = usePhotoAccess();
  const items = photoList(photos);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (lock.current || disabled || !canAddPhotos || items.length >= MAX_VISIT_PHOTOS) return;
    lock.current = true; setBusy(true); onBusy(true); Keyboard.dismiss();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true,
        selectionLimit: MAX_VISIT_PHOTOS - items.length, quality: 1, exif: false });
      if (!result.canceled) await onImport(result.assets.slice(0, MAX_VISIT_PHOTOS - items.length));
    } catch (error) { Alert.alert('Fotografie', error.message || 'Fotografie sa nepodarilo pridať.'); }
    finally { lock.current = false; setBusy(false); onBusy(false); }
  };
  return <View style={styles.section}>
    <View style={styles.row}><Text style={styles.title}>Fotografie</Text><Text style={styles.count}>{items.length} / {MAX_VISIT_PHOTOS}</Text></View>
    <Text style={styles.note}>{preview ? 'Fotografie sú v testovacej verzii odomknuté.' : canAddPhotos ? 'Fotografie k návštevám · Premium' : 'Pridávanie fotografií je súčasťou Premium. Už uložené fotky zostávajú dostupné v detaile.'}</Text>
    {items.length ? <ScrollView horizontal contentContainerStyle={{ gap: 12 }} showsHorizontalScrollIndicator={false}>
      {items.map((photo, i) => <View key={photoKey(photo)} style={styles.tile}>
        <VisitPhotoImage photo={photo} thumbnail style={styles.image} />
        <Pressable accessibilityRole="button" accessibilityState={{ selected: i === 0 }} disabled={disabled || busy}
          style={styles.action} onPress={() => onChange(selectCover(items, photoKey(photo)))}>
          <Text style={[styles.actionText, i === 0 && { fontWeight: '800' }]}>{i === 0 ? '★ Titulná fotografia' : 'Nastaviť ako titulnú'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={disabled || busy} style={styles.action} onPress={() => Alert.alert('Odobrať fotografiu?',
          'Odoberie sa z tejto návštevy. Originál v galérii telefónu zostane zachovaný.',
          [{ text: 'Zrušiť', style: 'cancel' }, { text: 'Odobrať', style: 'destructive', onPress: () => onChange(items.filter(item => photoKey(item) !== photoKey(photo))) }])}>
          <Text style={styles.remove}>Odobrať</Text></Pressable>
      </View>)}
    </ScrollView> : null}
    {canAddPhotos ? <Pressable accessibilityRole="button" onPress={add} disabled={disabled || busy || items.length >= MAX_VISIT_PHOTOS}
      style={[styles.add, (disabled || busy || items.length >= MAX_VISIT_PHOTOS) && { opacity: 0.5 }]}>
      {busy ? <ActivityIndicator color={theme.primary} /> : <MaterialIcons name="add-photo-alternate" size={24} color={theme.primary} />}
      <Text style={styles.actionText}>{busy ? 'Pripravujem fotografie…' : 'Pridať fotografie'}</Text>
    </Pressable> : null}
    <Text style={styles.note}>Fotky sa ukladajú do telefónu. Zálohu fotografií na svoj Google Disk zapni v Profile; textová záloha ich neobsahuje.</Text>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 10, paddingVertical: 10 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '700', color: theme.text }, count: { color: theme.muted },
  note: { color: theme.muted, fontSize: 12, lineHeight: 18 },
  tile: { width: 154, borderWidth: 1, borderColor: theme.border, borderRadius: 12, overflow: 'hidden' },
  image: { width: '100%', height: 110 }, action: { minHeight: 40, alignItems: 'center', justifyContent: 'center', padding: 6 },
  actionText: { color: theme.primary, fontWeight: '600', fontSize: 13 }, remove: { color: '#9a3b2e', fontSize: 13 },
  add: { minHeight: 50, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.primary, borderRadius: 12, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primarySoft },
});
