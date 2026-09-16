import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import TripForm from './TripForm';
import { findLocationName } from '../services/geonamesService';

export default function TripEditor({ initialValues, coordinates, title = 'Nový výlet', submitLabel = 'Uložiť výlet', onSubmit, onCancel }) {
  const [selection, setSelection] = useState(coordinates || null);
  const [hint, setHint] = useState('Ťukni na mapu alebo na názov múzea či iného miesta.');
  const request = useRef(0);
  const { height } = useWindowDimensions();
  const start = coordinates || initialValues?.location || { latitude: 48.1486, longitude: 17.1077 };
  useEffect(() => () => { request.current += 1; }, []);
  const selectLocation = async (coordinate, name) => {
    const id = ++request.current;
    const next = { ...coordinate, ...(name ? { name } : {}), locationName: '' };
    setSelection(next);
    setHint('Dohľadávam obec a krajinu…');
    try {
      const locationName = await findLocationName(coordinate);
      if (id !== request.current) return;
      setSelection({ ...next, locationName });
      setHint('Poloha vybraná. Skontroluj názov a lokalitu pred uložením.');
    } catch {
      if (id === request.current) setHint('Poloha je vybraná. Lokalitu sa nepodarilo dohľadať; doplň ju ručne.');
    }
  };
  useEffect(() => {
    if (coordinates) selectLocation(coordinates, coordinates.name);
  }, [coordinates]);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
        <View style={[styles.mapCard, { height: Math.max(280, Math.min(460, height * 0.45)) }]}>
          <MapView style={StyleSheet.absoluteFillObject}
            initialRegion={{ ...start, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
            onPress={(event) => {
              if (event.nativeEvent.action !== 'marker-press') selectLocation(event.nativeEvent.coordinate);
            }}
            onPoiClick={(event) => selectLocation(event.nativeEvent.coordinate, event.nativeEvent.name)}>
            {(selection || initialValues?.location) ? (
              <Marker coordinate={selection || initialValues.location} draggable
                onDragEnd={(event) => selectLocation(event.nativeEvent.coordinate)} />
            ) : null}
          </MapView>
        </View>
        <TripForm initialValues={initialValues} externalLocation={selection}
          title="Údaje o návšteve" submitLabel={submitLabel} onSubmit={onSubmit} onCancel={onCancel} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 24, backgroundColor: '#f9fafb' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  hint: { color: '#4b5563', lineHeight: 20 },
  mapCard: { overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
});
