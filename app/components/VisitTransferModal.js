import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { usePhotoAccess } from '../hooks/usePhotoAccess';
import { VisitPhotoImage } from './VisitPhotos';
import { photoList } from '../utils/visitPhotos';
import { DEFAULT_TRANSFER_OPTIONS, transferVisit } from '../utils/visitTransfer';
import { displayVisitDate } from '../utils/visitDate';
import { sendVisitTransfer } from '../services/visitTransferService';
import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
import { theme } from '../theme';

export default function VisitTransferModal({ visible, kind, trip, onClose }) {
  useLanguage();
  const { notebookId, user } = useAuth();
  const { canAddPhotos } = usePhotoAccess();
  const [options, setOptions] = useState(DEFAULT_TRANSFER_OPTIONS);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false), live = useRef(null);
  live.current = { notebookId, canAddPhotos, visible };
  const photos = photoList(trip?.photos).filter(photo => typeof photo === 'object');
  useEffect(() => {
    if (visible) { setOptions({ ...DEFAULT_TRANSFER_OPTIONS }); setSelected(photos.map(photo => photo.id)); }
  }, [visible, trip?.id]);
  if (!trip) return null;
  const preview = transferVisit(trip, options);
  const send = async () => {
    if (lock.current || !canAddPhotos || !notebookId) return;
    lock.current = true; setBusy(true);
    const identity = notebookId;
    const current = () => live.current.notebookId === identity && live.current.canAddPhotos && live.current.visible;
    try {
      await sendVisitTransfer({ trip, notebookId, author: user?.displayName || t('Cestovateľ'), kind, options,
        photos: photos.filter(photo => selected.includes(photo.id)), isCurrent: current });
    } catch (error) { if (current()) Alert.alert(t('Zdieľanie návštevy'), t(error.message)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Modal visible={visible} animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaProvider><SafeAreaView style={styles.screen}>
      <View style={styles.bar}><Text style={styles.title}>{t(kind === 'invitation' ? 'Pozvať do návštevy' : 'Poslať kópiu návštevy')}</Text>
        <Pressable accessibilityRole="button" onPress={onClose} disabled={busy} style={styles.close}><Text style={styles.link}>{t('Zavrieť')}</Text></Pressable></View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>{t('Príjemca si návštevu najprv prezrie. Bez jeho potvrdenia sa nič nepridá do denníka.')}</Text>
        <View style={styles.preview}><Image source={require('../../assets/compass-foreground.png')} style={styles.logo} />
          <Text style={styles.visitName}>{preview.name}</Text><Text style={styles.note}>{preview.locationName}</Text>
          {options.date ? <Text style={styles.note}>{displayVisitDate(preview)}</Text> : null}
          {options.rating ? <Text style={styles.note}>{t('Hodnotenie odosielateľa')}: {preview.rating}/5</Text> : null}
          {preview.description ? <Text style={styles.body}>{preview.description}</Text> : null}
          {preview.notes ? <Text style={styles.body}>{t('Priložené poznámky')}: {preview.notes}</Text> : null}
          {preview.tags?.length ? <Text style={styles.note}>{preview.tags.join(' · ')}</Text> : null}
          <Text style={styles.note}>{t('Odosielateľ')}: {user?.displayName || t('Cestovateľ')}</Text>
        </View>
        <Text style={styles.heading}>{t('Čo priložiť')}</Text>
        {[
          ['date', 'Dátum a čas návštevy'], ['rating', 'Moje hodnotenie'], ['description', 'Popis návštevy'],
          ['notes', 'Moje súkromné poznámky'], ['tags', 'Značky návštevy'],
        ].map(([key, label]) => <View key={key} style={styles.option}><Text style={styles.optionText}>{t(label)}</Text>
          <Switch disabled={busy} value={options[key]} accessibilityLabel={t(label)} onValueChange={value => setOptions(previous => ({ ...previous, [key]: value }))}
            trackColor={{ true: theme.primary }} /></View>)}
        <Text style={styles.note}>{t('Poznámky a hodnotenie sú predvolene vypnuté. Odoslanú kópiu už nemožno odvolať.')}</Text>
        <Text style={styles.heading}>{t('Vybrané fotografie')} · {selected.length}/{photos.length}</Text>
        {photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {photos.map(photo => <Pressable key={photo.id} accessibilityRole="checkbox" accessibilityLabel={t('Vybrať fotografiu')}
            accessibilityState={{ checked: selected.includes(photo.id) }} disabled={busy}
            onPress={() => setSelected(previous => previous.includes(photo.id) ? previous.filter(id => id !== photo.id) : [...previous, photo.id])}
            style={[styles.tile, selected.includes(photo.id) && styles.selected]}>
            <VisitPhotoImage photo={photo} thumbnail style={styles.photo} />
            <Text style={styles.link}>{t(selected.includes(photo.id) ? 'Vybraná' : 'Nevybraná')}</Text>
          </Pressable>)}
        </ScrollView> : <Text style={styles.note}>{t('Táto návšteva nemá fotografie uložené v aplikácii.')}</Text>}
        <Text style={styles.note}>{t('Posiela sa súbor ZIP cez aplikáciu podporujúcu súbory. Príjemca ho otvorí v TravelLog cez Profil → Zdieľané návštevy.')}</Text>
        {kind === 'invitation' ? <Text style={styles.note}>{t('Prijatie alebo odmietnutie zostáva v telefóne príjemcu. Odosielateľ zatiaľ nedostane potvrdenie; spoločná galéria sa nevytvára.')}</Text> : null}
        <Pressable accessibilityRole="button" disabled={busy || !canAddPhotos} onPress={send} style={[styles.primary, (busy || !canAddPhotos) && { opacity: 0.5 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t(kind === 'invitation' ? 'Odoslať pozvánku' : 'Odoslať kópiu')}</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background }, bar: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, color: theme.text, fontWeight: '800', fontSize: 21 }, close: { paddingVertical: 18 },
  link: { color: theme.primary, fontWeight: '600' }, content: { padding: 20, paddingTop: 8, paddingBottom: 28, gap: 16 },
  note: { color: theme.muted, lineHeight: 21 }, body: { color: theme.text, lineHeight: 24, fontSize: 16 },
  preview: { padding: 18, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 18, gap: 10 },
  logo: { width: 42, height: 42 }, visitName: { color: theme.text, fontSize: 23, fontWeight: '800' },
  heading: { fontSize: 17, fontWeight: '700', color: theme.text }, option: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionText: { flex: 1, color: theme.text, fontSize: 16 }, tile: { borderWidth: 2, borderColor: theme.border, borderRadius: 12, overflow: 'hidden', alignItems: 'center', paddingBottom: 8, gap: 8 },
  selected: { borderColor: theme.primary }, photo: { width: 132, height: 106 },
  primary: { minHeight: 50, borderRadius: 14, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
