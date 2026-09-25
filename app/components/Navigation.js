import { theme } from '../theme';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import HomeScreen from '../screens/HomeScreen';
import TripsScreen from '../screens/TripsScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const TAB_ICONS = {
  Home: 'home',
  Trips: 'format-list-bulleted',
  Map: 'map',
  Profile: 'person',
};

function AuthScreen() {
  const { loginWithEmail, registerWithEmail, resetPassword, continueAsGuest, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (action) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.authContainer, { flex: undefined, flexGrow: 1 }]}>
      <Text style={styles.authHeader}>TravelLog</Text>
      <Text style={styles.authSubheader}>Účet uchová tvoje návštevy aj pri zmene telefónu. Fotografie zatiaľ zostávajú v zariadení.</Text>
      <TextInput style={styles.input} placeholder="Tvoje meno (pri registrácii)" value={displayName} onChangeText={setDisplayName} maxLength={50} editable={!busy} />
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} editable={!busy} />
      <TextInput style={styles.input} placeholder="Heslo" secureTextEntry value={password} onChangeText={setPassword} editable={!busy} />
      <View style={styles.actions}>
        <Pressable disabled={busy} style={styles.authButton} onPress={() => run(() => loginWithEmail(email, password))}><Text style={styles.authButtonText}>Prihlásiť</Text></Pressable>
        <Pressable disabled={busy} style={styles.authButton} onPress={() => run(async () => {
          if (displayName.trim().length < 2) throw new Error('Zadaj svoje meno alebo prezývku.');
          await registerWithEmail(email, password, displayName);
        })}><Text style={styles.authButtonText}>Vytvoriť účet</Text></Pressable>
      </View>
      <Pressable disabled={busy} style={{ padding: 16 }} onPress={() => run(async () => {
        if (!email.trim()) throw new Error('Najprv zadaj email.');
        await resetPassword(email); setMessage('Ak účet existuje, dostaneš email na obnovu hesla.');
      })}><Text style={{ color: theme.primary, textAlign: 'center' }}>Zabudnuté heslo</Text></Pressable>
      <Pressable disabled={busy} style={{ padding: 16 }} onPress={() => run(continueAsGuest)}><Text style={{ color: theme.primary, textAlign: 'center' }}>Pokračovať bez účtu</Text></Pressable>
      <Text style={styles.authSubheader}>Bez účtu sú návštevy uložené iba v tomto telefóne.</Text>
      {busy ? <ActivityIndicator /> : null}
      {message || authError ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message || authError}</Text> : null}
    </ScrollView>
  </KeyboardAvoidingView>;
}

export default function Navigation() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Tab.Navigator
      key={user.uid}
      safeAreaInsets={{ bottom: insets.bottom + 8 }}
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        // Let the navigator include the device's bottom safe-area inset.
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        tabBarShowIcon: true,
        tabBarActiveTintColor: '#3B2D1F',
        tabBarInactiveTintColor: '#918678',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={TAB_ICONS[route.name] || 'circle'} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Trips" component={TripsScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: theme.background,
  },
  authHeader: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  authSubheader: {
    color: theme.muted,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  authButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: 'center',
    paddingVertical: 10,
  },
  googleButton: {
    borderRadius: 8,
    backgroundColor: theme.text,
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  authButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  message: {
    color: theme.muted,
  },
});
