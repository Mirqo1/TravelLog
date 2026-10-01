import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripsContext';
import { useWishlist } from '../context/WishlistContext';
import { usePhotoAccess } from '../hooks/usePhotoAccess';
import { acceptVisitTransfer } from '../services/visitTransferService';
import { displayVisitDate, displayDate, localDate, localTime, parseVisitDate, validVisitTime } from '../utils/visitDate';
import VisitCalendar from './VisitCalendar';
import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
import { theme } from '../theme';
export default function VisitReceiveModal({ data, onClose }) {
  useLanguage();
  const { notebookId } = useAuth();
  const { loading, refreshAfterSync } = useTrips();
  const wishes = useWishlist();
  const { canAddPhotos } = usePhotoAccess();
  const [target, setTarget] = useState('visits');
  const [confirmed, setConfirmed] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [calendar, setCalendar] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false), live = useRef(null);
  live.current = { notebookId, canAddPhotos, data, wishes };
  useEffect(() => {
    if (data) {
      setTarget('visits'); setConfirmed(false); setIncludePhotos(canAddPhotos && data.photos.length > 0);
      setDate(displayDate(data.visit.date || localDate())); setTime(data.visit.visitTime || localTime()); setCalendar(false);
    }
  }, [data]);
  if (!data) return null;
  const save = async () => {
    if (lock.current || loading || !notebookId || (target === 'visits' && !confirmed)) return;
    lock.current = true; setBusy(true);
    const identity = notebookId, received = data;
    const current = () => live.current.notebookId === identity && live.current.data === received
      && (!includePhotos || target === 'dreams' || live.current.canAddPhotos);
    try {
      if (target === 'dreams') {
        if (!wishes.ready || !wishes.premium) throw new Error('Pridávanie a úpravy mojich snov sú súčasťou Premium.');
        const id = 'shared-wish-' + data.sourceId;
        const existing = wishes.items.some(item => item.id === id);
        if (!current()) throw new Error('Účet sa zmenil. Skús to znova.');
        if (!existing) await wishes.save({ id, name: data.visit.name, locationName: data.visit.locationName,
          countryCode: data.visit.countryCode, location: { ...data.visit.location }, notes: '' });
        if (current()) { onClose(); Alert.alert(t('Zdieľaná návšteva'), t(existing ? 'Toto miesto už máš v Mojich snoch.' : 'Miesto bolo pridané do Mojich snov.')); }
      } else {
        const result = await acceptVisitTransfer({ data, notebookId, date: parseVisitDate(date), visitTime: time,
          includePhotos: includePhotos && canAddPhotos, confirmed, isCurrent: current });
        if (!current()) return;
        await refreshAfterSync();
        if (current()) { onClose(); Alert.alert(t('Zdieľaná návšteva'), t(result.already ? 'Túto návštevu už máš uloženú. Tvoje údaje zostali zachované.' : 'Návšteva bola prijatá a uložená do tvojho denníka.')); }
      }
    } catch (error) { if (live.current.notebookId === identity) Alert.alert(t('Prijatie návštevy'), t(error.message)); }
    finally { lock.current = false; setBusy(false); }
  };
  const invalidDate = !parseVisitDate(date) || (time && !validVisitTime(time));
  const disabled = busy || loading || !notebookId || (target === 'visits' ? !confirmed || invalidDate : !wishes.premium || !wishes.ready);
  return <Modal visible={!!data} animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaProvider><SafeAreaView style={styles.screen}>
      <View style={styles.bar}><Text style={styles.title}>{t(data.kind === 'invitation' ? 'Pozvánka do návštevy' : 'Zdieľaná návšteva')}</Text>
        <Pressable accessibilityRole="button" onPress={onClose} disabled={busy} style={styles.close}><Text style={styles.link}>{t('Zavrieť')}</Text></Pressable></View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.visitName}>{data.visit.name}</Text><Text style={styles.note}>{data.visit.locationName}</Text>
        {data.visit.date ? <Text style={styles.note}>{displayVisitDate(data.visit)}</Text> : null}
        <Text style={styles.note}>{t('Odosielateľ')}: {data.author || t('Cestovateľ')}</Text>
        <Text style={styles.note}>{t('Meno odosielateľa je údaj zo súboru, nie overená identita.')}</Text>
        {data.visit.description ? <Text style={styles.body}>{data.visit.description}</Text> : null}
        {data.visit.rating != null ? <Text style={styles.note}>{t('Hodnotenie odosielateľa')}: {data.visit.rating}/5</Text> : null}
        {data.visit.notes ? <View style={styles.noteBox}><Text style={styles.heading}>{t('Priložené poznámky')}</Text><Text style={styles.body}>{data.visit.notes}</Text></View> : null}
        {data.photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {data.photos.map(photo => <Image key={photo.entry} source={{ uri: photo.thumbUri || photo.uri }} style={styles.photo} accessibilityLabel={t('Fotografia návštevy')} />)}
        </ScrollView> : null}
        <Text style={styles.note}>{t('Prezeranie nič neukladá. Tvoje vlastné poznámky a hodnotenie začnú prázdne.')}</Text>
        <View style={styles.targets}>{[['visits', 'Moje návštevy'], ['dreams', 'Moje sny']].map(([value, label]) =>
          <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: target === value }} disabled={busy}
            onPress={() => setTarget(value)} style={[styles.target, target === value && styles.active]}><Text style={styles.link}>{t(label)}</Text></Pressable>)}</View>
        {target === 'visits' ? <>
          <View style={styles.option}><Text style={styles.optionText}>{t('Potvrdzujem, že som toto miesto navštívil')}</Text>
            <Switch accessibilityLabel={t('Potvrdzujem, že som toto miesto navštívil')} disabled={busy} value={confirmed} onValueChange={setConfirmed} trackColor={{ true: theme.primary }} /></View>
          <Text style={styles.heading}>{t('Môj dátum a čas návštevy')}</Text>
          <TextInput value={date} onChangeText={setDate} editable={!busy} style={styles.input} keyboardType="numbers-and-punctuation"
            accessibilityLabel={t('Dátum návštevy')} placeholder="DD.MM.RRRR" maxLength={10} />
          <Pressable accessibilityRole="button" onPress={() => setCalendar(value => !value)} disabled={busy}><Text style={styles.link}>{t('Vybrať dátum v kalendári')}</Text></Pressable>
          {calendar && !busy ? <VisitCalendar value={date} onSelect={value => { setDate(displayDate(value)); setCalendar(false); }} /> : null}
          <TextInput value={time} onChangeText={setTime} editable={!busy} style={styles.input} keyboardType="numbers-and-punctuation"
            accessibilityLabel={t('Čas návštevy')} placeholder="HH:MM" maxLength={5} />
          {invalidDate ? <Text style={styles.error}>{t('Zadaj platný dátum a čas návštevy.')}</Text> : null}
          {data.photos.length && canAddPhotos ? <View style={styles.option}><Text style={styles.optionText}>{t('Uložiť aj vybrané fotografie')}</Text>
            <Switch accessibilityLabel={t('Uložiť aj vybrané fotografie')} disabled={busy} value={includePhotos} onValueChange={setIncludePhotos} trackColor={{ true: theme.primary }} /></View> : null}
          {data.photos.length && !canAddPhotos ? <Text style={styles.note}>{t('Bez Premium sa uloží text návštevy. Fotografie si môžeš prezrieť v náhľade.')}</Text> : null}
        </> : <Text style={styles.note}>{t(wishes.premium ? 'Do Mojich snov sa uloží iba miesto, bez dátumu, hodnotenia a fotografií.' : 'Pridávanie a úpravy mojich snov sú súčasťou Premium.')}</Text>}
        <Pressable accessibilityRole="button" onPress={save} disabled={disabled} style={[styles.primary, disabled && { opacity: 0.45 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t(data.kind === 'invitation' ? 'Prijať pozvánku' : target === 'visits' ? 'Uložiť medzi moje návštevy' : 'Pridať do Mojich snov')}</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} disabled={busy} style={styles.close}>
          <Text style={styles.link}>{t(data.kind === 'invitation' ? 'Odmietnuť pozvánku' : 'Neukladať')}</Text></Pressable>
        <Text style={styles.note}>{t('Prijatie alebo odmietnutie zostáva v telefóne príjemcu. Odosielateľ zatiaľ nedostane potvrdenie; spoločná galéria sa nevytvára.')}</Text>
      </ScrollView></KeyboardAvoidingView>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background }, bar: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, color: theme.text, fontWeight: '800', fontSize: 21 }, close: { paddingVertical: 16, alignItems: 'center' },
  link: { color: theme.primary, fontWeight: '700' }, content: { padding: 20, paddingTop: 8, paddingBottom: 28, gap: 16 },
  visitName: { color: theme.text, fontSize: 24, fontWeight: '800' }, note: { color: theme.muted, lineHeight: 21 },
  body: { color: theme.text, lineHeight: 24, fontSize: 16 }, noteBox: { padding: 16, backgroundColor: theme.surface, borderRadius: 14, gap: 8 },
  heading: { fontSize: 16, fontWeight: '700', color: theme.text }, photo: { width: 150, height: 120, borderRadius: 12 },
  targets: { flexDirection: 'row', gap: 10 }, target: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
  active: { borderColor: theme.primary, backgroundColor: theme.surface }, option: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionText: { flex: 1, color: theme.text, lineHeight: 22 }, input: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, color: theme.text, backgroundColor: theme.surface },
  error: { color: '#9a3b2e' }, primary: { minHeight: 50, borderRadius: 14, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
