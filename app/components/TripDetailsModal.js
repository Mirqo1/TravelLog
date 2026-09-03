import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const ratingText = (rating) => (rating ? `${'★'.repeat(rating)}${'☆'.repeat(Math.max(0, 5 - rating))}` : 'Bez hodnotenia');

export default function TripDetailsModal({ visible, trip, onClose, onEdit, onDelete }) {
  if (!trip) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{trip.name}</Text>
        <Text style={styles.sectionTitle}>Lokalita</Text>
        <Text style={styles.text}>{trip.locationName || 'Neuvedené'}</Text>
        <Text style={styles.text}>
          {trip.location?.latitude}, {trip.location?.longitude}
        </Text>

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
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9fafb',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  sectionTitle: {
    marginTop: 8,
    fontWeight: '700',
    color: '#1f2937',
  },
  text: {
    color: '#374151',
    lineHeight: 22,
  },
  placeholder: {
    color: '#6b7280',
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
    backgroundColor: '#e5e7eb',
  },
  edit: {
    backgroundColor: '#2563eb',
  },
  delete: {
    backgroundColor: '#dc2626',
  },
  secondaryText: {
    color: '#111827',
    fontWeight: '700',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
