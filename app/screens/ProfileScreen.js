import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripsContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { profile, stats, loading } = useTrips();
  const [loggingOut, setLoggingOut] = useState(false);
  const name = user?.displayName || profile?.name || 'Cestovateľ';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const signOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logout(); }
    catch (error) { Alert.alert('Odhlásenie zlyhalo', error.message); setLoggingOut(false); }
  };
  return <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
    <Text style={styles.title}>Môj profil</Text>
    <View style={styles.identity}>
      <View style={styles.avatar}><Text style={styles.initials}>{initials || 'T'}</Text></View>
      <Text style={styles.name}>{name}</Text>
      <Text selectable style={styles.email}>{user?.email || 'Email neuvedený'}</Text>
      <View style={styles.badge}><Text style={styles.badgeText}>Testovacia verzia</Text></View>
    </View>
    <Text style={styles.sectionTitle}>Moje cestovanie</Text>
    <View style={styles.card}>
      {[{ label: 'Uložené návštevy', value: stats.totalTrips, icon: 'place', route: 'Trips' },
        { label: 'Navštívené krajiny', value: stats.countriesVisited, icon: 'public', route: 'Map' }].map((item) => (
        <Pressable key={item.route} accessibilityRole="button" onPress={() => navigation.navigate(item.route)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
          <View style={styles.rowIcon}><MaterialIcons name={item.icon} color="#2563eb" size={22} /></View>
          <Text style={styles.rowLabel}>{item.label}</Text>
          {loading ? <ActivityIndicator /> : <Text style={styles.value}>{item.value}</Text>}
          <MaterialIcons name="chevron-right" color="#64748b" size={22} />
        </Pressable>
      ))}
    </View>
    <Text style={styles.sectionTitle}>Moje dáta</Text>
    <View style={styles.storage}>
      <View style={styles.storageHeader}><MaterialIcons name="phone-android" color="#2563eb" size={24} />
        <Text style={styles.storageTitle}>Uložené v telefóne</Text></View>
      <Text style={styles.description}>Návštevy si môžeš prezerať aj bez internetu. Na načítanie mapy a vyhľadávanie miest potrebuješ pripojenie.</Text>
      <Text style={styles.description}>Cloudová záloha a obnovenie na inom telefóne ešte nie sú dostupné. Samotné prihlásenie zatiaľ dáta nezálohuje.</Text>
    </View>
    <Pressable accessibilityRole="button" disabled={loggingOut} onPress={signOut}
      style={({ pressed }) => [styles.logout, (pressed || loggingOut) && { opacity: 0.6 }]}>
      <MaterialIcons name="logout" color="#b91c1c" size={20} />
      <Text style={styles.logoutText}>{loggingOut ? 'Odhlasujem…' : 'Odhlásiť sa'}</Text>
    </Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7fb' },
  container: { padding: 20, paddingBottom: 28, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#172554' },
  identity: { alignItems: 'center', padding: 24, borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  initials: { fontSize: 28, fontWeight: '700', color: '#1d4ed8' },
  name: { fontSize: 22, fontWeight: '700', color: '#172554', textAlign: 'center' },
  email: { color: '#64748b', textAlign: 'center' },
  badge: { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  badgeText: { color: '#1d4ed8', fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: '#172554', fontSize: 18, fontWeight: '700', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 18 },
  rowIcon: { padding: 8, borderRadius: 12, backgroundColor: '#eff6ff' },
  rowLabel: { flex: 1, color: '#334155', fontWeight: '500' },
  value: { fontSize: 20, fontWeight: '700', color: '#172554' },
  storage: { padding: 18, borderRadius: 20, backgroundColor: '#eef4ff', gap: 12 },
  storageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storageTitle: { color: '#172554', fontWeight: '700', flexShrink: 1 },
  description: { color: '#475569', lineHeight: 22 },
  logout: { minHeight: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff' },
  logoutText: { color: '#b91c1c', fontWeight: '600' },
});
