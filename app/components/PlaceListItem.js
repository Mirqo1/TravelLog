import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

const renderRating = (rating) => {
  if (!rating) {
    return 'Bez hodnotenia';
  }

  return `${'★'.repeat(rating)}${'☆'.repeat(Math.max(0, 5 - rating))}`;
};

export default function PlaceListItem({ trip, onDetail, onEdit, onDelete }) {
  const renderLeftActions = () => (
    <Pressable style={[styles.swipeAction, styles.detailAction]} onPress={onDetail}>
      <Text style={styles.swipeText}>Detail</Text>
    </Pressable>
  );

  const renderRightActions = () => (
    <View style={styles.rightActions}>
      <Pressable style={[styles.swipeAction, styles.editAction]} onPress={onEdit}>
        <Text style={styles.swipeText}>Edit</Text>
      </Pressable>
      <Pressable style={[styles.swipeAction, styles.deleteAction]} onPress={onDelete}>
        <Text style={styles.swipeText}>Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable renderLeftActions={renderLeftActions} renderRightActions={renderRightActions}>
      <Pressable style={styles.card} onPress={onDetail}>
        <Text style={styles.name}>{trip.name}</Text>
        <Text style={styles.meta}>{trip.locationName || 'Bez lokality'}</Text>
        <Text style={styles.meta}>
          {trip.date} • {renderRating(trip.rating)}
        </Text>
        <Text style={styles.notes}>{trip.description || trip.notes || 'Bez poznámky'}</Text>
        {trip.syncStatus && trip.syncStatus !== 'synced' ? <Text style={styles.pending}>Čaká na synchronizáciu</Text> : null}
      </Pressable>
    </Swipeable>
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
  pending: {
    marginTop: 6,
    color: '#b45309',
    fontWeight: '600',
  },
  rightActions: {
    flexDirection: 'row',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    marginBottom: 10,
    borderRadius: 12,
  },
  detailAction: {
    backgroundColor: '#2563eb',
  },
  editAction: {
    backgroundColor: '#0f766e',
  },
  deleteAction: {
    backgroundColor: '#dc2626',
  },
  swipeText: {
    color: '#fff',
    fontWeight: '700',
  },
});
