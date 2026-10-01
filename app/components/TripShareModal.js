import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
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
import { clampCrop, coverGeometry } from '../utils/shareCrop';

const nativeShare = Platform.OS === 'android' ? requireOptionalNativeModule('TravelLogDrive') : null;

const localPhotos = photos => photoList(photos).filter(photo => /^(file:|content:)/.test(photoUri(photo) || ''));

export default function TripShareModal({ visible, trip, onClose }) {
  useLanguage();
  const [selected, setSelected] = useState(null);
  const [includePlace, setIncludePlace] = useState(true);
  const [includeDate, setIncludeDate] = useState(true);
  const [originalReady, setOriginalReady] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [frameWidth, setFrameWidth] = useState(320);
  const [sourceSize, setSourceSize] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [photoError, setPhotoError] = useState('');
  const card = useRef(null);
  const drag = useRef({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  const boundsRef = useRef(null);
  const photos = localPhotos(trip?.photos);
  useEffect(() => {
    if (!visible) return;
    setSelected(photos.length ? photoKey(photos[0]) : null);
    setIncludePlace(true); setIncludeDate(true); setOriginalReady(null); setMessage('');
    setSourceSize(null); setPhotoError('');
    setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 };
  }, [visible, trip?.id]);
  const photo = photos.find(item => photoKey(item) === selected);
  const uri = photo ? photoUri(photo) : null;
  const size = sourceSize || (photo?.width > 0 && photo?.height > 0 ? { width: photo.width, height: photo.height } : null);
  const geometry = photo && size ? coverGeometry(size.width, size.height, frameWidth, 400) : null;
  boundsRef.current = geometry;
  useEffect(() => {
    if (!visible || !uri || size || !Image.getSize) return;
    let active = true;
    Image.getSize(uri, (width, height) => {
      if (active && width > 0 && height > 0) setSourceSize({ width, height });
    }, () => {});
    return () => { active = false; };
  }, [visible, uri, size?.width, size?.height]);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !!boundsRef.current,
    onStartShouldSetPanResponderCapture: () => !!boundsRef.current,
    onMoveShouldSetPanResponder: (_, gesture) => !!boundsRef.current &&
      (boundsRef.current.limitX > 0 || boundsRef.current.limitY > 0) &&
      (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3),
    onPanResponderGrant: () => { drag.current = { ...offsetRef.current }; },
    onPanResponderMove: (_, gesture) => {
      const next = clampCrop({ x: drag.current.x + gesture.dx, y: drag.current.y + gesture.dy }, boundsRef.current);
      offsetRef.current = next; setOffset(next);
    },
    onPanResponderRelease: () => {},
    onPanResponderTerminate: () => {},
    onPanResponderTerminationRequest: () => false,
  })).current;
  const selectPhoto = value => {
    setSelected(value); setOriginalReady(null); setSourceSize(null); setPhotoError('');
    const zero = { x: 0, y: 0 }; offsetRef.current = zero; setOffset(zero);
  };
  const available = !photo || (!!geometry && originalReady === selected && !photoError);
  const share = async () => {
    if (busy || !card.current || !available) return;
    setBusy(true);
    try {
      const image = await captureRef(card.current, { format: 'jpg', quality: 0.9, result: 'tmpfile', width: 1080, height: 1350 });
      if (message.trim()) {
        if (!nativeShare?.shareImageWithText) throw new Error(t("Zdieľanie obrázka s textom vyžaduje novú Android verziu aplikácie."));
        await nativeShare.shareImageWithText(image, message.trim());
      } else {
        if (!await Sharing.isAvailableAsync()) throw new Error(t("Zdieľanie obrázkov nie je na tomto zariadení dostupné."));
        await Sharing.shareAsync(image, { mimeType: 'image/jpeg', dialogTitle: t("Zdieľať návštevu"), UTI: 'public.jpeg' });
      }
    } catch (error) { Alert.alert(t("Zdieľanie návštevy"), t(error.message || t("Obrázok sa nepodarilo vytvoriť."))); }
    finally { setBusy(false); }
  };
  if (!trip) return null;
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaProvider><SafeAreaView style={styles.screen}>
      <View style={styles.toolbar}>
        <Text style={styles.heading}>{t("Zdieľať návštevu")}</Text>
        <Pressable accessibilityRole="button" onPress={onClose} disabled={busy} style={styles.close}><Text style={styles.link}>{t("Zavrieť")}</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>{t("Takto bude vyzerať obrázok. Poznámky, hodnotenie ani súradnice doň nepridávame.")}</Text>
        <View ref={card} collapsable={false} style={styles.card} {...pan.panHandlers}
          onLayout={event => setFrameWidth(event.nativeEvent.layout.width)}>
          {photo ? <>
            <Image source={{ uri: photoUri(photo, true) || uri }} resizeMode="cover" style={styles.photo} />
            <Image source={{ uri }} resizeMode={geometry ? 'stretch' : 'cover'}
              style={geometry ? { position: 'absolute', width: geometry.width, height: geometry.height,
                left: (frameWidth - geometry.width) / 2 + offset.x,
                top: (400 - geometry.height) / 2 + offset.y,
                opacity: originalReady === selected ? 1 : 0 }
                : [styles.photo, { opacity: 0 }]}
              onLoad={event => {
                setOriginalReady(selected);
                const source = event?.nativeEvent?.source;
                if (!size && source?.width > 0 && source?.height > 0) setSourceSize({ width: source.width, height: source.height });
              }} onError={() => { setOriginalReady(null); setPhotoError(t("Fotografia sa nepodarila načítať.")); }} />
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
        {photo && <Text style={styles.intro}>{geometry?.limitX || geometry?.limitY
          ? t("Potiahni fotografiu v náhľade. Jej poloha zostane zachovaná aj v zdieľanom obrázku.")
          : size ? t("Fotografia už presne vypĺňa formát karty, takže ju bez priblíženia nemožno posunúť.") : t("Načítavam rozmery fotografie…")}</Text>}
        {!!photoError && <Text style={styles.error}>{t(photoError)}</Text>}
        {photos.length ? <>
          <Text style={styles.label}>{t("Fotografia")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: !photo }}
              onPress={() => selectPhoto(null)} style={[styles.emptyPhoto, !photo && styles.selected]}><Text style={styles.muted}>{t("Bez fotky")}</Text></Pressable>
            {photos.map(item => <Pressable key={photoKey(item)} accessibilityRole="button"
              accessibilityLabel={t("Vybrať fotografiu na zdieľanie")} accessibilityState={{ selected: selected === photoKey(item) }}
              onPress={() => selectPhoto(photoKey(item))}
              style={[styles.thumbnailFrame, selected === photoKey(item) && styles.selected]}>
              <Image source={{ uri: photoUri(item, true) }} style={styles.thumbnail} />
            </Pressable>)}
          </ScrollView>
        </> : null}
        {!!trip.locationName && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: includePlace }}
          onPress={() => setIncludePlace(value => !value)} style={styles.choice}><Text style={styles.check}>{includePlace ? '☑' : '□'}</Text><Text style={styles.choiceText}>{t("Zobraziť lokalitu")}</Text></Pressable>}
        {!!trip.date && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: includeDate }}
          onPress={() => setIncludeDate(value => !value)} style={styles.choice}><Text style={styles.check}>{includeDate ? '☑' : '□'}</Text><Text style={styles.choiceText}>{t("Zobraziť dátum návštevy")}</Text></Pressable>}
        <Text style={styles.label}>{t("Sprievodný text (voliteľný)")}</Text>
        <TextInput value={t(message)} onChangeText={setMessage} multiline maxLength={1000}
          placeholder={t("Napíš niečo ku zdieľanej fotke…")} placeholderTextColor={theme.muted}
          accessibilityLabel={t("Sprievodný text k zdieľanej fotografii")} style={styles.message} />
        <Pressable accessibilityRole="button" disabled={busy || !available} style={[styles.share, (busy || !available) && styles.disabled]}
          onPress={share}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.shareText}>{!available ? t("Pripravujem fotografiu…") : t("Zdieľať obrázok")}</Text>}</Pressable>
        <Text style={styles.intro}>{t("Pri zdieľaní sa sprievodný text skopíruje do schránky. Ak ho Messenger nepripojí automaticky, vlož ho do správy ručne. Nič sa neodosiela bez tvojho potvrdenia.")}</Text>
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
