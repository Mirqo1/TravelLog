import { theme } from '../theme';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const { loginWithEmail, registerWithEmail, signInWithGoogleIdToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [message, setMessage] = useState('');

  const handleAction = async (action, registering = false) => {
    try {
      if (registering && displayName.trim().length < 2) throw new Error('Zadaj svoje meno alebo prezývku.');
      await action(email.trim(), password, registering ? displayName.trim() : undefined);
      setMessage('Prihlásenie/registrácia úspešná.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogleIdToken(googleToken.trim());
      setMessage('Google Sign-In úspešný.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <View style={styles.authContainer}>
      <Text style={styles.authHeader}>TravelLog</Text>
      <Text style={styles.authSubheader}>Prihlás sa a spravuj svoje výlety na mape aj offline.</Text>
      <TextInput
        style={styles.input}
        placeholder="Tvoje meno alebo prezývka (pri registrácii)"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Heslo"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <View style={styles.actions}>
        <Pressable style={styles.authButton} onPress={() => handleAction(loginWithEmail)}>
          <Text style={styles.authButtonText}>Prihlásiť</Text>
        </Pressable>
        <Pressable style={styles.authButton} onPress={() => handleAction(registerWithEmail, true)}>
          <Text style={styles.authButtonText}>Registrovať</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Google ID token (test)"
        value={googleToken}
        onChangeText={setGoogleToken}
      />
      <Pressable style={styles.googleButton} onPress={handleGoogleSignIn}>
        <Text style={styles.authButtonText}>Google Sign-In</Text>
      </Pressable>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
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
