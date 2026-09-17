import { theme } from '../theme';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { cloudConfigured, cloudLogout, updateCloudDisplayName } from '../services/cloudBackupService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripsContext';
import CloudBackupPanel from '../components/CloudBackupPanel';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateDisplayName } = useAuth();
  const { profile, stats, loading } = useTrips();
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [choosingPhoto, setChoosingPhoto] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  useEffect(() => {
    let active = true;
    setAvatar(null);
    AsyncStorage.getItem(`travellog/avatar/${user.uid}`).then((value) => { if (active) setAvatar(value); })
      .catch(() => {});
    return () => { active = false; };
  }, [user.uid]);
  const chooseAvatar = async () => {
    if (choosingPhoto) return;
    setChoosingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true,
        aspect: [1, 1], quality: 0.35, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64 || asset.base64.length > 700000) throw new Error('Vyber menšiu fotografiu pre profil.');
      const uri = `data:image/jpeg;base64,${asset.base64}`;
      await AsyncStorage.setItem(`travellog/avatar/${user.uid}`, uri);
      setAvatar(uri);
    } catch (error) { Alert.alert('Profilová fotografia', error.message); }
    finally { setChoosingPhoto(false); }
  };
  const name = user?.displayName || profile?.name || 'Cestovateľ';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const signOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { if (cloudConfigured) await cloudLogout(); await logout(); }
    catch (error) { Alert.alert('Odhlásenie zlyhalo', error.message); setLoggingOut(false); }
  };
  const saveName = async () => {
    if (savingName) return;
    setSavingName(true);
    try {
      const nextName = nameDraft.trim();
      await updateDisplayName(nextName);
      setEditingName(false);
      if (cloudConfigured) {
        try { await updateCloudDisplayName(nextName); }
        catch (error) { Alert.alert('Meno je uložené v telefóne', 'Do cloudu sa ho teraz nepodarilo odoslať. Skús to znova po pripojení.'); }
      }
    } catch (error) { Alert.alert('Meno sa nepodarilo uložiť', error.message); }
    finally { setSavingName(false); }
  };
  return <ScrollView keyboardShouldPersistTaps="handled" style={styles.screen} contentContainerStyle={styles.container}>
    <Text style={styles.title}>Môj profil</Text>
    <View style={styles.identity}>
      <Pressable onPress={chooseAvatar} disabled={choosingPhoto} accessibilityRole="button" accessibilityLabel="Zmeniť profilovú fotografiu">
        {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.initials}>{initials || 'T'}</Text></View>}
      </Pressable>
      <Pressable onPress={chooseAvatar} disabled={choosingPhoto} style={{ padding: 8 }}><Text style={{ color: theme.primary }}>Zmeniť fotografiu</Text></Pressable>
      {editingName ? <View style={styles.nameEditor}>
        <TextInput autoFocus accessibilityLabel="Zobrazované meno" value={nameDraft} onChangeText={setNameDraft}
          editable={!savingName} maxLength={50} style={styles.nameInput} placeholder="Tvoje meno alebo prezývka" />
        <View style={styles.nameActions}>
          <Pressable onPress={() => setEditingName(false)} style={styles.nameAction}><Text style={styles.cancelName}>Zrušiť</Text></Pressable>
          <Pressable onPress={saveName} disabled={savingName} style={[styles.nameAction, styles.saveName]}>
            <Text style={styles.saveNameText}>{savingName ? 'Ukladám…' : 'Uložiť meno'}</Text>
          </Pressable>
        </View>
      </View> : <>
        <Text style={styles.name}>{name}</Text>
        <Pressable onPress={() => { setNameDraft(name); setEditingName(true); }} style={styles.editNameButton}>
          <Text style={styles.editNameText}>Upraviť meno</Text>
        </Pressable>
      </>}
      <Text selectable style={styles.email}>{user?.email || 'Email neuvedený'}</Text>
      <View style={styles.badge}><Text style={styles.badgeText}>Testovacia verzia</Text></View>
    </View>
    <Text style={styles.sectionTitle}>Moje cestovanie</Text>
    <View style={styles.card}>
      {[{ label: 'Uložené návštevy', value: stats.totalTrips, icon: 'place', route: 'Trips' },
        { label: 'Navštívené krajiny', value: stats.countriesVisited, icon: 'public', route: 'Map' }].map((item) => (
        <Pressable key={item.route} accessibilityRole="button" onPress={() => navigation.navigate(item.route)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
          <View style={styles.rowIcon}><MaterialIcons name={item.icon} color={theme.primary} size={22} /></View>
          <Text style={styles.rowLabel}>{item.label}</Text>
          {loading ? <ActivityIndicator /> : <Text style={styles.value}>{item.value}</Text>}
          <MaterialIcons name="chevron-right" color={theme.muted} size={22} />
        </Pressable>
      ))}
    </View>
    <Text style={styles.sectionTitle}>Moje dáta</Text>
    <View style={styles.storage}>
      <View style={styles.storageHeader}><MaterialIcons name="phone-android" color={theme.primary} size={24} />
        <Text style={styles.storageTitle}>Uložené v telefóne</Text></View>
      <Text style={styles.description}>Návštevy si môžeš prezerať aj bez internetu. Na načítanie mapy a vyhľadávanie miest potrebuješ pripojenie.</Text>
      <Text style={styles.description}>Po pripojení cloudového účtu sa návštevy ukladajú automaticky. Stav synchronizácie nájdeš nižšie.</Text>
    </View>
    <CloudBackupPanel />
    <Pressable accessibilityRole="button" disabled={loggingOut} onPress={signOut}
      style={({ pressed }) => [styles.logout, (pressed || loggingOut) && { opacity: 0.6 }]}>
      <MaterialIcons name="logout" color="#b91c1c" size={20} />
      <Text style={styles.logoutText}>{loggingOut ? 'Odhlasujem…' : 'Odhlásiť sa'}</Text>
    </Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  container: { padding: 20, paddingBottom: 28, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: theme.text },
  identity: { alignItems: 'center', padding: 24, borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.border, gap: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primarySoft, justifyContent: 'center', alignItems: 'center' },
  initials: { fontSize: 28, fontWeight: '700', color: theme.primary },
  name: { fontSize: 22, fontWeight: '700', color: theme.text, textAlign: 'center' },
  editNameButton: { paddingHorizontal: 12, paddingVertical: 5 },
  editNameText: { color: theme.primary, fontWeight: '600' },
  nameEditor: { alignSelf: 'stretch', gap: 10 },
  nameInput: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, color: theme.text },
  nameActions: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  nameAction: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  cancelName: { color: theme.muted, fontWeight: '600' },
  saveName: { backgroundColor: theme.primary },
  saveNameText: { color: '#fff', fontWeight: '700' },
  email: { color: theme.muted, textAlign: 'center' },
  badge: { backgroundColor: theme.primarySoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  badgeText: { color: theme.primary, fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 18 },
  rowIcon: { padding: 8, borderRadius: 12, backgroundColor: theme.primarySoft },
  rowLabel: { flex: 1, color: '#334155', fontWeight: '500' },
  value: { fontSize: 20, fontWeight: '700', color: theme.text },
  storage: { padding: 18, borderRadius: 20, backgroundColor: theme.primarySoft, gap: 12 },
  storageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storageTitle: { color: theme.text, fontWeight: '700', flexShrink: 1 },
  description: { color: theme.muted, lineHeight: 22 },
  logout: { minHeight: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff' },
  logoutText: { color: '#b91c1c', fontWeight: '600' },
});
