import 'react-native-gesture-handler';
import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { theme } from './theme';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './context/AuthContext';
import { TripsProvider } from './context/TripsContext';
import { DriveBackupProvider } from './context/DriveBackupContext';
import { CloudSyncProvider } from './context/CloudSyncContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Navigation from './components/Navigation';
import { WishlistProvider } from './context/WishlistContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <AuthProvider>
        <TripsProvider>
          <CloudSyncProvider>
          <DriveBackupProvider>
          <WishlistProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
              <Image source={require('../assets/contours.png')} pointerEvents="none" resizeMode="cover" style={StyleSheet.absoluteFill} />
              <Navigation />
            </SafeAreaView>
          </NavigationContainer>
          </WishlistProvider>
          </DriveBackupProvider>
          </CloudSyncProvider>
        </TripsProvider>
      </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
