import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const isPremium = Boolean(user?.isPremium);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profil</Text>
      <Text style={styles.row}>Meno: {user?.displayName || 'Hosť'}</Text>
      <Text style={styles.row}>Email: {user?.email || 'neprihlásený'}</Text>
      <Text style={styles.row}>Plán: {isPremium ? 'Premium' : 'Free'}</Text>
      <Text style={styles.note}>{isPremium ? 'Bez reklám' : 'Reklamy sú aktívne vo free verzii.'}</Text>
      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Odhlásiť sa</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    marginBottom: 6,
    color: '#111827',
  },
  note: {
    marginTop: 6,
    color: '#4b5563',
  },
  button: {
    marginTop: 14,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
