import { theme } from '../theme';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { validLocation } from '../utils/mapVisits';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const ratingText = (rating) => (rating ? `${'★'.repeat(rating)}${'☆'.repeat(Math.max(0, 5 - rating))}` : 'Bez hodnotenia');

export default function TripDetailsModal({ visible, trip, onClose, onEdit, onDelete }) {
  if (!trip) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider><SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{trip.name}</Text>
        <Text style={styles.sectionTitle}>Lokalita</Text>
        <Text style={styles.text}>{trip.locationName || 'Neuvedené'}</Text>
        <Text style={styles.text}>
          {trip.location?.latitude}, {trip.location?.longitude}
        </Text>
        {visible && validLocation(trip.location) ? <View style={{ height: 180, borderRadius: 16, overflow: 'hidden' }}>
          <MapView key={trip.id} style={{ flex: 1 }}
            initialRegion={{ ...trip.location, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
            scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
            toolbarEnabled={false} zoomControlEnabled={false}>
            <Marker coordinate={trip.location} />
          </MapView>
        </View> : null}

        <Text style={styles.sectionTitle}>Dátum</Text>
        <Text style={styles.text}>{trip.date}</Text>

        <Text style={styles.sectionTitle}>Hodnotenie</Text>
        <Text style={styles.text}>{ratingText(trip.rating)}</Text>

        <Text style={styles.sectionTitle}>Popis</Text>
        <Text style={styles.text}>{trip.description || 'Bez popisu'}</Text>

        <Text style={styles.sectionTitle}>Poznámky</Text>
        <Text style={styles.text}>{trip.notes || 'Bez poznámok'}</Text>

        <Text style={styles.sectionTitle}>Fotogaléria</Text>
        <Text style={styles.placeholder}>Placeholder: sem budú patriť fotografie z výletu.</Text>

        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.secondary]} onPress={onClose}>
            <Text style={styles.secondaryText}>Zavrieť</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.edit]} onPress={onEdit}>
            <Text style={styles.primaryText}>Editovať</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.delete]} onPress={onDelete}>
            <Text style={styles.primaryText}>Zmazať</Text>
          </Pressable>
        </View>
      </ScrollView>
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: theme.background,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
  },
  sectionTitle: {
    marginTop: 8,
    fontWeight: '700',
    color: theme.text,
  },
  text: {
    color: theme.text,
    lineHeight: 22,
  },
  placeholder: {
    color: theme.muted,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: theme.border,
  },
  edit: {
    backgroundColor: theme.primary,
  },
  delete: {
    backgroundColor: '#dc2626',
  },
  secondaryText: {
    color: theme.text,
    fontWeight: '700',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
