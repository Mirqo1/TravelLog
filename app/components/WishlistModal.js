import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useWishlist } from '../context/WishlistContext';
import { useTrips } from '../context/TripsContext';
import { findLocationDetails } from '../services/geonamesService';
import AddPlaceModal from './AddPlaceModal';

const Button = ({ children, onPress, disabled, secondary = false }) => <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
  style={[styles.button, secondary && styles.secondaryButton, disabled && { opacity: 0.45 }]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{children}</Text></Pressable>;
const Shell = ({ children, onClose }) => <Modal visible animationType="slide" onRequestClose={onClose}>
  <SafeAreaProvider><SafeAreaView style={styles.screen}>{children}</SafeAreaView></SafeAreaProvider>
</Modal>;

export function WishlistEditor({ place, onClose }) {
  const { save } = useWishlist();
  const [draft, setDraft] = useState({ ...place, location: place.location || { latitude: place.latitude, longitude: place.longitude } });
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [hint, setHint] = useState('');
  const locationEdited = useRef(false);
  const scroll = useRef(null), focusedInput = useRef(null);
  const revealInput = () => {
    if (focusedInput.current) scroll.current?.getScrollResponder()?.scrollResponderScrollNativeHandleToKeyboard(focusedInput.current, 80, true);
  };
  const onFocus = event => { focusedInput.current = event.nativeEvent.target; revealInput(); };
  useEffect(() => {
    const listener = Keyboard.addListener('keyboardDidShow', revealInput);
    return () => listener.remove();
  }, []);
  useEffect(() => {
    let alive = true;
    if (!place.locationName) {
      setHint('Dohľadávam lokalitu…');
      findLocationDetails(draft.location).then(details => {
        if (alive) { if (!locationEdited.current) setDraft(old => ({ ...old, ...details })); setHint(''); }
      }).catch(() => { if (alive) setHint('Lokalitu môžeš doplniť ručne. Súradnice zostávajú uložené.'); });
    }
    return () => { alive = false; };
  }, []);
  const submit = async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try { await save(draft); onClose(); }
    catch (error) { Alert.alert('Moje sny', error.message); }
    finally { locked.current = false; setBusy(false); }
  };
  return <Shell onClose={() => { if (!locked.current) onClose(); }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.title}>{place.id ? 'Upraviť želané miesto' : 'Chcem navštíviť'}</Text>
        <Text style={styles.muted}>Odlož si miesto na neskôr. Do návštev sa zatiaľ nezapočíta.</Text>
        <Text style={styles.label}>Názov miesta</Text>
        <TextInput onFocus={onFocus} accessibilityLabel="Názov miesta" style={styles.input} maxLength={160} value={draft.name || ''} editable={!busy}
          onChangeText={name => setDraft(old => ({ ...old, name }))} placeholder="Napr. ZOO Košice" />
        <Text style={styles.label}>Lokalita</Text>
        <TextInput onFocus={onFocus} accessibilityLabel="Lokalita" style={styles.input} maxLength={300} value={draft.locationName || ''} editable={!busy}
          onChangeText={locationName => { locationEdited.current = true; setDraft(old => ({ ...old, locationName })); }} />
        {hint ? <Text style={styles.muted}>{hint}</Text> : null}
        <Text style={styles.muted}>{draft.location.latitude.toFixed(5)}, {draft.location.longitude.toFixed(5)}</Text>
        <Text style={styles.label}>Moje poznámky</Text>
        <TextInput onFocus={onFocus} accessibilityLabel="Moje poznámky" style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]} multiline maxLength={2000}
          value={draft.notes || ''} editable={!busy} onChangeText={notes => setDraft(old => ({ ...old, notes }))} placeholder="Čo tu chcem vidieť…" />
        <Button disabled={busy || !draft.name?.trim()} onPress={submit}>{busy ? 'Ukladám…' : 'Uložiť medzi moje sny'}</Button>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={styles.link}><Text style={[styles.muted, { textAlign: 'center' }]}>Zrušiť</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </Shell>;
}

export default function WishlistModal({ visible, onClose, onMap, embedded = false, header }) {
  const { items, premium, preview, ready, message, remove, sync } = useWishlist();
  const { addTrip } = useTrips();
  const [editing, setEditing] = useState(null);
  const [visiting, setVisiting] = useState(null);
  const [query, setQuery] = useState('');
  const visitInitial = useMemo(() => {
    if (!visiting) return null;
    const { id, changedAt, deleted, ...fields } = visiting;
    return fields;
  }, [visiting]);
  useEffect(() => { if (!visible) { setEditing(null); setVisiting(null); setQuery(''); } }, [visible]);
  if (!visible) return null;
  if (editing) return <WishlistEditor place={editing} onClose={() => setEditing(null)} />;
  if (visiting) {
    const { id } = visiting;
    return <AddPlaceModal visible title="Navštívil som toto miesto" submitLabel="Uložiť návštevu" initialTrip={visitInitial}
      onClose={() => setVisiting(null)} onSave={async data => {
        // Stable visit ID makes retries safe if saving the removal fails after the visit was saved.
        await addTrip(data, id);
        await remove(visiting);
        setVisiting(null);
        Alert.alert('Hotovo', 'Miesto je teraz medzi návštevami.');
      }} />;
  }
  const normalized = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = items.filter(item => normalized(`${item.name} ${item.locationName}`).includes(normalized(query)));
  const removeItem = item => Alert.alert('Odstrániť z mojich snov?', item.name, [
    { text: 'Zrušiť', style: 'cancel' }, { text: 'Odstrániť', style: 'destructive', onPress: () => remove(item).catch(error => Alert.alert('Moje sny', error.message)) },
  ]);
  const Container = embedded ? View : Shell;
  return <Container onClose={onClose} style={{ flex: 1 }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, embedded && { padding: 0, paddingBottom: 24 }]}>
      {header}
      {!embedded ? <View style={styles.headingRow}>
        <Text style={[styles.title, { flex: 1 }]}>Moje sny</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Zavrieť moje sny" onPress={onClose} style={styles.iconButton}>
          <MaterialIcons name="close" size={24} color={theme.text} />
        </Pressable>
      </View> : null}
      <Text style={styles.muted}>Moje sny · Premium{preview ? ' · testovací prístup' : ''}</Text>
      <View style={styles.headingRow}>
        <Text accessibilityLiveRegion="polite" style={[styles.muted, { flex: 1 }]}>{message}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Synchronizovať moje sny" onPress={sync} style={styles.iconButton}>
          <MaterialIcons name="sync" size={22} color={theme.primary} />
        </Pressable>
      </View>
      {!premium ? <Text style={styles.muted}>Nové miesta môžeš ukladať s Premium. Svoje uložené miesta môžeš naďalej prezerať, odstrániť alebo zaznamenať ako návštevu.</Text> : null}
      <Button disabled={!premium || !ready} onPress={() => { onClose(); onMap(); }}>+ Vybrať miesto na mape</Button>
      <TextInput accessibilityLabel="Hľadať v mojich snoch" style={styles.input} value={query} onChangeText={setQuery} placeholder="Hľadať v uložených miestach" />
      {!filtered.length ? <Text style={styles.muted}>{!ready ? 'Načítavam…' : query ? 'Žiadne zodpovedajúce miesta.' : 'Tvoje budúce dobrodružstvá začínajú tu. Vyber miesto na mape a ulož si ho.'}</Text> : null}
      {filtered.map(item => <View key={item.id} style={styles.card}>
        <View style={styles.headingRow}>
          <Text style={[styles.name, { flex: 1 }]}>{item.name}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Možnosti miesta ${item.name}`} style={styles.iconButton}
            onPress={() => Alert.alert(item.name, 'Možnosti miesta', [
              ...(premium ? [{ text: 'Upraviť', onPress: () => setEditing(item) }] : []),
              { text: 'Odstrániť', style: 'destructive', onPress: () => removeItem(item) },
              { text: 'Zrušiť', style: 'cancel' },
            ])}><MaterialIcons name="more-vert" size={24} color={theme.muted} /></Pressable>
        </View>
        <Text style={styles.muted}>{item.locationName || `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`}</Text>
        {item.notes ? <Text style={styles.muted}>{item.notes}</Text> : null}
        <View style={styles.cardActions}>
          <Pressable accessibilityRole="button" style={styles.mapLink} onPress={() => { onClose(); onMap(item); }}>
            <MaterialIcons name="place" size={20} color={theme.primary} /><Text style={styles.label}>Na mape</Text>
          </Pressable>
          <Button secondary onPress={() => setVisiting(item)}>Navštívil som</Button>
        </View>
      </View>)}

    </ScrollView>
  </Container>;
}
const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48, paddingRight: 10 },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
  secondaryText: { color: theme.primary },
  screen: { flex: 1, backgroundColor: theme.background }, content: { padding: 20, paddingBottom: 28, gap: 12 },
  title: { fontSize: 25, fontWeight: '800', color: theme.text }, name: { fontSize: 19, fontWeight: '700', color: theme.text },
  muted: { color: theme.muted, lineHeight: 21 }, label: { color: theme.primary, fontWeight: '700' },
  input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, fontSize: 16, color: theme.text },
  button: { padding: 14, backgroundColor: theme.primary, borderRadius: 12, alignItems: 'center' }, buttonText: { color: '#fff', fontWeight: '700' },
  card: { padding: 16, gap: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 18, backgroundColor: theme.surface },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }, link: { paddingVertical: 12, paddingHorizontal: 5 },
});
