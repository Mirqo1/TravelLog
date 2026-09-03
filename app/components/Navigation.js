import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TripsScreen from '../screens/TripsScreen';
import AddTripScreen from '../screens/AddTripScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

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
    <View style={styles.authContainer}>
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
        <Text style={styles.authButtonText}>Google Sign-In</Text>
      </Pressable>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
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
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Trips" component={TripsScreen} />
      <Tab.Screen name="Add Trip" component={AddTripScreen} />
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
    backgroundColor: '#f9fafb',
  },
  authHeader: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  authSubheader: {
    color: '#4b5563',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
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
    backgroundColor: '#2563eb',
    alignItems: 'center',
    paddingVertical: 10,
  },
  googleButton: {
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  authButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  message: {
    color: '#4b5563',
  },
});
