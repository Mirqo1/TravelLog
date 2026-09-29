import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { theme } from '../theme';
import { displayVisitDate } from '../utils/visitDate';
import { photoKey, photoList } from '../utils/visitPhotos';
import { photoUri } from '../services/visitPhotoService';
import { prepareSharePhoto, removeSharePhoto } from '../services/sharePhotoCrop';
import { clampCrop, coverGeometry, cropRect } from '../utils/shareCrop';

const nativeShare = Platform.OS === 'android' ? requireOptionalNativeModule('TravelLogDrive') : null;

const localPhotos = photos => photoList(photos).filter(photo => /^(file:|content:)/.test(photoUri(photo) || ''));

export default function TripShareModal({ visible, trip, onClose }) {
  const [selected, setSelected] = useState(null);
  const [includePlace, setIncludePlace] = useState(true);
  const [includeDate, setIncludeDate] = useState(true);
  const [readyPhoto, setReadyPhoto] = useState(null);
  const [originalReady, setOriginalReady] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [frameWidth, setFrameWidth] = useState(320);
  const [sourceSize, setSourceSize] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [croppedUri, setCroppedUri] = useState(null);
  const [cropError, setCropError] = useState('');
  const card = useRef(null);
  const drag = useRef({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  const boundsRef = useRef(null);
  const cropRequest = useRef(null);
  const cropGeneration = useRef(0);
  const cropFiles = useRef(new Set());
  const photos = localPhotos(trip?.photos);
  useEffect(() => () => {
    cropGeneration.current++;
    for (const file of cropFiles.current) removeSharePhoto(file);
    cropFiles.current.clear();
  }, []);
  useEffect(() => {
    if (visible) return;
    cropGeneration.current++;
    for (const file of cropFiles.current) removeSharePhoto(file);
    cropFiles.current.clear();
    setCroppedUri(null);
  }, [visible]);
  useEffect(() => {
    if (!visible) return;
    cropGeneration.current++;
    setSelected(photos.length ? photoKey(photos[0]) : null);
    setIncludePlace(true); setIncludeDate(true); setReadyPhoto(null); setOriginalReady(null); setMessage('');
    setSourceSize(null); setCroppedUri(null); setCropError(''); setDragging(false);
    setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 };
  }, [visible, trip?.id]);
  const photo = photos.find(item => photoKey(item) === selected);
  const uri = photo ? photoUri(photo) : null;
  const size = sourceSize || (photo?.width > 0 && photo?.height > 0 ? { width: photo.width, height: photo.height } : null);
  const geometry = photo && size ? coverGeometry(size.width, size.height, frameWidth, 400) : null;
  boundsRef.current = geometry;
  const prepareCrop = async nextOffset => {
    if (!uri || !size) return;
    const rect = cropRect(size.width, size.height, frameWidth, 400, nextOffset);
    if (!rect) return;
    const generation = ++cropGeneration.current;
    setReadyPhoto(null); setCropError('');
    try {
      const result = await prepareSharePhoto(uri, rect);
      if (generation !== cropGeneration.current) { await removeSharePhoto(result); return; }
      cropFiles.current.add(result);
      setCroppedUri(result);
    } catch (error) {
      if (generation === cropGeneration.current) {
        setDragging(false);
        setCropError('Výrez sa nepodarilo pripraviť. Skús vybrať fotku znova.');
      }
    }
  };
  cropRequest.current = prepareCrop;
  useEffect(() => {
    if (visible && photo && size) prepareCrop(offsetRef.current);
  }, [visible, selected, uri, size?.width, size?.height, frameWidth]);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !!boundsRef.current,
    onStartShouldSetPanResponderCapture: () => !!boundsRef.current,
    onMoveShouldSetPanResponder: (_, gesture) => !!boundsRef.current &&
      (boundsRef.current.limitX > 0 || boundsRef.current.limitY > 0) &&
      (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3),
    onPanResponderGrant: () => { drag.current = { ...offsetRef.current }; setDragging(true); },
    onPanResponderMove: (_, gesture) => {
      const next = clampCrop({ x: drag.current.x + gesture.dx, y: drag.current.y + gesture.dy }, boundsRef.current);
      offsetRef.current = next; setOffset(next);
    },
    onPanResponderRelease: () => { cropRequest.current?.(offsetRef.current); },
    onPanResponderTerminate: () => { setDragging(false); },
    onPanResponderTerminationRequest: () => false,
  })).current;
  const selectPhoto = value => {
    cropGeneration.current++;
    setSelected(value); setReadyPhoto(null); setOriginalReady(null); setSourceSize(null); setCroppedUri(null); setCropError(''); setDragging(false);
    const zero = { x: 0, y: 0 }; offsetRef.current = zero; setOffset(zero);
  };
  const available = !photo || (!!croppedUri && readyPhoto === selected && !cropError);
  const share = async () => {
    if (busy || !card.current || !available) return;
    setBusy(true);
    try {
      const image = await captureRef(card.current, { format: 'jpg', quality: 0.9, result: 'tmpfile', width: 1080, height: 1350 });
      if (message.trim()) {
        if (!nativeShare?.shareImageWithText) throw new Error('Zdieľanie obrázka s textom vyžaduje novú Android verziu aplikácie.');
        await nativeShare.shareImageWithText(image, message.trim());
      } else {
        if (!await Sharing.isAvailableAsync()) throw new Error('Zdieľanie obrázkov nie je na tomto zariadení dostupné.');
        await Sharing.shareAsync(image, { mimeType: 'image/jpeg', dialogTitle: 'Zdieľať návštevu', UTI: 'public.jpeg' });
      }
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
        <View ref={card} collapsable={false} style={styles.card}
          onLayout={event => setFrameWidth(event.nativeEvent.layout.width)}>
          {photo ? <>
            <Image source={{ uri: photoUri(photo, true) || uri }} resizeMode="cover" style={styles.photo} />
            <Image source={{ uri }} resizeMode="cover"
              style={[styles.photo, { opacity: originalReady === selected ? 1 : 0 }]}
              onLoad={event => {
                setOriginalReady(selected);
                const source = event?.nativeEvent?.source;
                if (!size && source?.width > 0 && source?.height > 0) setSourceSize({ width: source.width, height: source.height });
              }} onError={() => { setReadyPhoto(null); setCropError('Fotografia sa nepodarila načítať.'); }} />
            {!!croppedUri && <Image source={{ uri: croppedUri }} resizeMode="cover"
              style={[styles.photo, { opacity: readyPhoto === selected && !dragging ? 1 : 0 }]}
              onLoad={() => { setReadyPhoto(selected); setDragging(false); }}
              onError={() => { setReadyPhoto(null); setDragging(false); setCropError('Výrez fotografie sa nepodaril načítať.'); }} />}
            {dragging && geometry && <Image source={{ uri }} resizeMode="stretch" pointerEvents="none"
              style={{ position: 'absolute', width: geometry.width, height: geometry.height,
                left: (frameWidth - geometry.width) / 2 + offset.x,
                top: (400 - geometry.height) / 2 + offset.y }} />}
            <View style={styles.dragLayer} {...pan.panHandlers} />
          </>
            : <View style={styles.photoPlaceholder} />}
          <View style={styles.caption}>
            <View style={styles.brand}>
              <View style={styles.logoClip}>
                <Image source={require('../../assets/compass-foreground.png')} style={styles.logo} />
              </View>
              <Text style={styles.wordmark}>TravelLog</Text>
            </View>
            <Text style={[styles.name, trip.name.length > 55 && styles.longName]} numberOfLines={4}>{trip.name}</Text>
            {includePlace && !!trip.locationName && <Text style={styles.info} numberOfLines={2}>{trip.locationName}</Text>}
            {includeDate && !!trip.date && <Text style={styles.info}>{displayVisitDate(trip)}</Text>}
          </View>
        </View>
        {photo && <Text style={styles.intro}>Potiahni fotografiu v náhľade. Výrez uvidíš počas posúvania a po pustení prsta sa pripraví na zdieľanie.</Text>}
        {!!cropError && <Text style={styles.error}>{cropError}</Text>}
        {photos.length ? <>
          <Text style={styles.label}>Fotografia</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: !photo }}
              onPress={() => selectPhoto(null)} style={[styles.emptyPhoto, !photo && styles.selected]}><Text style={styles.muted}>Bez fotky</Text></Pressable>
            {photos.map(item => <Pressable key={photoKey(item)} accessibilityRole="button"
              accessibilityLabel="Vybrať fotografiu na zdieľanie" accessibilityState={{ selected: selected === photoKey(item) }}
              onPress={() => selectPhoto(photoKey(item))}
              style={[styles.thumbnailFrame, selected === photoKey(item) && styles.selected]}>
              <Image source={{ uri: photoUri(item, true) }} style={styles.thumbnail} />
            </Pressable>)}
          </ScrollView>
        </> : null}
        {!!trip.locationName && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: includePlace }}
          onPress={() => setIncludePlace(value => !value)} style={styles.choice}><Text style={styles.check}>{includePlace ? '☑' : '□'}</Text><Text style={styles.choiceText}>Zobraziť lokalitu</Text></Pressable>}
        {!!trip.date && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: includeDate }}
          onPress={() => setIncludeDate(value => !value)} style={styles.choice}><Text style={styles.check}>{includeDate ? '☑' : '□'}</Text><Text style={styles.choiceText}>Zobraziť dátum návštevy</Text></Pressable>}
        <Text style={styles.label}>Sprievodný text (voliteľný)</Text>
        <TextInput value={message} onChangeText={setMessage} multiline maxLength={1000}
          placeholder="Napíš niečo ku zdieľanej fotke…" placeholderTextColor={theme.muted}
          accessibilityLabel="Sprievodný text k zdieľanej fotografii" style={styles.message} />
        <Pressable accessibilityRole="button" disabled={busy || !available} style={[styles.share, (busy || !available) && styles.disabled]}
          onPress={share}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.shareText}>{!available ? 'Pripravujem fotografiu…' : 'Zdieľať obrázok'}</Text>}</Pressable>
        <Text style={styles.intro}>Pri zdieľaní sa sprievodný text skopíruje do schránky. Ak ho Messenger nepripojí automaticky, vlož ho do správy ručne. Nič sa neodosiela bez tvojho potvrdenia.</Text>
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
  card: { width: '100%', maxWidth: 320, height: 400, backgroundColor: theme.primarySoft, overflow: 'hidden' },
  photo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  dragLayer: { ...StyleSheet.absoluteFillObject },
  error: { color: '#b91c1c', alignSelf: 'stretch' },
  photoPlaceholder: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.primarySoft },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(37, 28, 20, 0.78)', paddingHorizontal: 20, paddingVertical: 16, gap: 5 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  logoClip: { width: 32, height: 32, overflow: 'hidden' },
  logo: { position: 'absolute', width: 64, height: 64, left: -16, top: -16 },
  wordmark: { fontSize: 14, fontWeight: '800', letterSpacing: 1, color: '#F6F0E4' },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 26 },
  longName: { fontSize: 18, lineHeight: 21 },
  info: { color: '#F4E5C5', fontSize: 13, lineHeight: 18 },
  label: { alignSelf: 'stretch', fontWeight: '700', color: theme.text },
  picker: { alignItems: 'center', gap: 8 },
  emptyPhoto: { width: 76, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 5 },
  muted: { color: theme.muted, textAlign: 'center', fontSize: 12 },
  thumbnailFrame: { width: 76, height: 68, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: theme.border },
  thumbnail: { width: '100%', height: '100%', borderRadius: 6 },
  selected: { borderWidth: 2, borderColor: theme.primary },
  choice: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', minHeight: 42, gap: 8 },
  message: { alignSelf: 'stretch', minHeight: 76, maxHeight: 150, padding: 12, borderWidth: 1, borderColor: theme.border,
    borderRadius: 10, backgroundColor: theme.surface, color: theme.text, textAlignVertical: 'top' },
  check: { color: theme.primary, fontSize: 23 }, choiceText: { color: theme.text, fontSize: 15 },
  share: { alignSelf: 'stretch', minHeight: 48, backgroundColor: theme.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  shareText: { color: '#fff', fontWeight: '700', fontSize: 16 }, disabled: { opacity: 0.5 },
});
