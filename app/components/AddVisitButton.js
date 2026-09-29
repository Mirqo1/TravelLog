import { theme } from '../theme';
import React, { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import AddPlaceModal from './AddPlaceModal';
import { useTrips } from '../context/TripsContext';

export default function AddVisitButton({ appearance }) {
  const [visible, setVisible] = useState(false);
  const { addTrip } = useTrips();
  return <>
    <Pressable accessibilityRole="button" onPress={() => setVisible(true)}
      style={{ backgroundColor: appearance === 'modern' ? '#744916' : theme.primary,
        borderRadius: appearance === 'modern' ? 10 : 12, padding: 14, alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ color: '#fff', fontWeight: '700' }}>+ Pridať návštevu</Text>
    </Pressable>
    <AddPlaceModal visible={visible} title="Pridať návštevu" onClose={() => setVisible(false)}
      onSave={async (trip) => { await addTrip(trip); setVisible(false); Alert.alert('Hotovo', 'Návšteva bola uložená.'); }} />
  </>;
}
