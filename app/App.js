import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './context/AuthContext';
import { TripsProvider } from './context/TripsContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Navigation from './components/Navigation';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <AuthProvider>
        <TripsProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#f9fafb' }}>
              <Navigation />
            </SafeAreaView>
          </NavigationContainer>
        </TripsProvider>
      </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
