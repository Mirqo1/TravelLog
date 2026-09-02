import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function PlaceListItem({ place, onDetail, onEdit, onDelete }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{place.name}</Text>
      <Text style={styles.meta}>
        {place.type} • {place.country} • {place.visitDate}
      </Text>
      <Text style={styles.notes}>{place.notes || 'Bez poznámky'}</Text>
      <View style={styles.actions}>
        <Pressable onPress={onDetail} style={styles.actionBtn}>
          <Text>Detail</Text>
        </Pressable>
        <Pressable onPress={onEdit} style={styles.actionBtn}>
          <Text>Editovať</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.actionBtn}>
          <Text>Zmazať</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: '#374151',
    marginTop: 2,
  },
  notes: {
    color: '#4b5563',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
});
