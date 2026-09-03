import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AppBackground, { APP_COLORS } from './AppBackground';
import HomeScreen from '../screens/HomeScreen';
import TripsScreen from '../screens/TripsScreen';
import AddTripScreen from '../screens/AddTripScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const TAB_ICONS = {
  Home: 'home',
  Trips: 'format-list-bulleted',
  'Add Trip': 'add-circle-outline',
  Map: 'map',
  Profile: 'person',
};

function AuthScreen() {
  const { loginWithEmail, registerWithEmail, signInWithGoogleIdToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [message, setMessage] = useState('');

  const handleAction = async (action) => {
    try {
      await action(email.trim(), password);
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
    <AppBackground>
      <View style={styles.authContainer}>
        <View style={styles.authCard}>
          <Text style={styles.authHeader}>TravelLog</Text>
          <Text style={styles.authSubheader}>Prihlás sa a spravuj svoje výlety na mape aj offline.</Text>
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
            <Pressable style={styles.authButton} onPress={() => handleAction(registerWithEmail)}>
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
            <Text style={styles.googleButtonText}>Google Sign-In</Text>
          </Pressable>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </AppBackground>
  );
}

export default function Navigation() {
  const { user, loading } = useAuth();

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
    <AppBackground>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' },
          tabBarShowIcon: true,
          tabBarActiveTintColor: APP_COLORS.accentDark,
          tabBarInactiveTintColor: 'rgba(124, 90, 0, 0.65)',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name={TAB_ICONS[route.name] || 'circle'} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Trips" component={TripsScreen} />
        <Tab.Screen name="Add Trip" component={AddTripScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </AppBackground>
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
  },
  authCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  authHeader: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    color: APP_COLORS.text,
  },
  authSubheader: {
    color: APP_COLORS.muted,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  authButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: APP_COLORS.accent,
    alignItems: 'center',
    paddingVertical: 12,
  },
  googleButton: {
    borderRadius: 12,
    backgroundColor: APP_COLORS.accentSoft,
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 90, 0, 0.18)',
  },
  authButtonText: {
    color: APP_COLORS.accentDark,
    fontWeight: '700',
  },
  googleButtonText: {
    color: APP_COLORS.text,
    fontWeight: '600',
  },
  message: {
    color: APP_COLORS.muted,
  },
  tabBar: {
    height: 68,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: APP_COLORS.accent,
    borderTopColor: 'rgba(124, 90, 0, 0.18)',
  },
  tabBarLabel: {
    fontWeight: '600',
  },
});
