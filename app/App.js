import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import MapboxGL from '@react-native-mapbox-gl/maps';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './context/AuthContext';
import { TripsProvider } from './context/TripsContext';
import Navigation from './components/Navigation';

const MAPBOX_ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  'pk.eyJ1IjoibWlydWxpIiwiYSI6ImNtdGx0amo3ajAwZXMyeHIzdHllYWN4Z3oifQ.vswbqwimIIjtF7PRxd-h6A';
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <TripsProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Navigation />
          </NavigationContainer>
        </TripsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
