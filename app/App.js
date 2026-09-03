import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/Navigation';

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Navigation />
      </NavigationContainer>
    </AuthProvider>
  );
}
