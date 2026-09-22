import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '../theme';
import { photoKey, photoList } from '../utils/visitPhotos';
import { photoUri, exportVisitPhoto } from '../services/visitPhotoService';
import { usePhotoAccess } from '../hooks/usePhotoAccess';

export function VisitPhotoImage({ photo, thumbnail = false, style, resizeMode = 'cover' }) {
  const uri = photoUri(photo, thumbnail);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  if (!uri || failed) return <View style={[styles.missing, style]}>
    <MaterialIcons name="broken-image" color={theme.muted} size={28} />
    <Text style={styles.missingText}>Fotografia nie je dostupná</Text>
  </View>;
  return <Image source={{ uri }} style={style} resizeMode={resizeMode} onError={() => setFailed(true)} accessibilityLabel="Fotografia návštevy" />;
}
export function VisitPhotoCover({ photos }) {
  const { canAddPhotos } = usePhotoAccess();
  const items = photoList(photos);
  if (!canAddPhotos || !items.length) return null;
  return <View style={styles.coverFrame}>
    <VisitPhotoImage photo={items[0]} thumbnail style={styles.cover} />
    <View style={styles.count}><MaterialIcons name="photo-library" size={14} color="#fff" /><Text style={styles.countText}>{items.length}</Text></View>
  </View>;
}
export function VisitPhotoGallery({ photos, title }) {
  const items = photoList(photos);
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const pager = useRef(null);
  const photo = items.find(item => photoKey(item) === selected);
  const index = items.indexOf(photo);
  if (!items.length) return null;
  const showPhoto = nextIndex => {
    if (nextIndex < 0 || nextIndex >= items.length) return;
    setSelected(photoKey(items[nextIndex]));
    pager.current?.scrollToIndex({ index: nextIndex, animated: true });
  };
  const share = async () => {
    if (exporting) return;
    setExporting(true);
    try { await exportVisitPhoto(photo); }
    catch (error) { Alert.alert('Fotografia', error.message); }
    finally { setExporting(false); }
  };
  return <View style={styles.gallery}>
    <Text style={styles.heading}>Fotografie <Text style={styles.subtle}>· {items.length}</Text></Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {items.map((item, i) => <Pressable key={photoKey(item)} accessibilityRole="button" accessibilityLabel={`Otvoriť fotografiu ${i + 1}`}
        onPress={() => setSelected(photoKey(item))}><VisitPhotoImage photo={item} thumbnail style={styles.thumb} /></Pressable>)}
    </ScrollView>
    <Text style={styles.note}>Iba v tomto telefóne · záloha fotografií na Google Disk ešte nie je pripojená.</Text>
    <Modal visible={!!photo} animationType="fade" onRequestClose={() => setSelected(null)}>
      <SafeAreaProvider><SafeAreaView style={styles.viewer}>
        <View style={styles.viewerBar}><Text style={styles.viewerTitle} numberOfLines={2}>{title}</Text>
          <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={styles.control}><Text style={styles.white}>Zavrieť</Text></Pressable></View>
        <View style={{ flex: 1 }} onLayout={({ nativeEvent: { layout } }) => {
          setViewport(previous => previous.width === layout.width && previous.height === layout.height
            ? previous : { width: layout.width, height: layout.height });
        }}>
          {photo && viewport.width > 0 && viewport.height > 0 ? <FlatList
            key={`photo-pager-${viewport.width}-${viewport.height}`}
            ref={pager} data={items} horizontal pagingEnabled
            showsHorizontalScrollIndicator={false} bounces={false}
            initialScrollIndex={index} initialNumToRender={1} maxToRenderPerBatch={2} windowSize={3}
            keyExtractor={photoKey}
            getItemLayout={(_, page) => ({ length: viewport.width, offset: viewport.width * page, index: page })}
            onMomentumScrollEnd={({ nativeEvent }) => {
              const next = Math.max(0, Math.min(items.length - 1, Math.round(nativeEvent.contentOffset.x / viewport.width)));
              setSelected(photoKey(items[next]));
            }}
            renderItem={({ item }) => <VisitPhotoImage photo={item} resizeMode="contain"
              style={{ width: viewport.width, height: viewport.height }} />}
          /> : null}
        </View>
        <View style={styles.viewerBar}>
          <Pressable accessibilityRole="button" disabled={index <= 0} onPress={() => showPhoto(index - 1)} style={[styles.control, index <= 0 && styles.disabled]}><Text style={styles.white}>‹ Predošlá</Text></Pressable>
          <Text style={styles.white}>{index + 1} / {items.length}</Text>
          <Pressable accessibilityRole="button" disabled={index >= items.length - 1} onPress={() => showPhoto(index + 1)} style={[styles.control, index >= items.length - 1 && styles.disabled]}><Text style={styles.white}>Ďalšia ›</Text></Pressable>
        </View>
        <Pressable accessibilityRole="button" disabled={exporting} style={styles.export} onPress={share}>
          {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.white}>Uložiť alebo zdieľať fotografiu</Text>}
        </Pressable>
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  coverFrame: { marginTop: 12, borderRadius: 14, overflow: 'hidden', backgroundColor: theme.primarySoft },
  cover: { width: '100%', aspectRatio: 1.6 },
  count: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(35,27,19,0.75)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  countText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  missing: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primarySoft, gap: 8 },
  missingText: { color: theme.muted, textAlign: 'center', fontSize: 12, padding: 6 },
  gallery: { gap: 12 }, heading: { color: theme.text, fontWeight: '700', fontSize: 17 },
  subtle: { color: theme.muted, fontWeight: '400' },
  thumb: { width: 148, height: 112, borderRadius: 12 },
  note: { color: theme.muted, fontSize: 12, lineHeight: 18 },
  viewer: { flex: 1, backgroundColor: '#211C17' },
  viewerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, gap: 8 },
  viewerTitle: { color: '#fff', flex: 1, fontWeight: '600', fontSize: 16 },
  white: { color: '#fff', textAlign: 'center' }, control: { padding: 14 }, disabled: { opacity: 0.3 },
  export: { margin: 16, padding: 16, borderRadius: 12, backgroundColor: theme.primary },
});
