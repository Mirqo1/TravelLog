import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
import { displayVisitDate } from '../utils/visitDate';
import { theme } from '../theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VisitPhotoCover } from './VisitPhotos';
import { Swipeable } from 'react-native-gesture-handler';

const renderRating = (rating) => {
  if (!rating) {
    return t("Bez hodnotenia");
  }

  return `${'★'.repeat(rating)}${'☆'.repeat(Math.max(0, 5 - rating))}`;
};

export default function PlaceListItem({ trip, onDetail, onEdit, onDelete }) {
  useLanguage();
  const renderLeftActions = () => (
    <Pressable style={[styles.swipeAction, styles.detailAction]} onPress={onDetail}>
      <Text style={styles.swipeText}>{t("Detail")}</Text>
    </Pressable>
  );

  const renderRightActions = () => (
    <View style={styles.rightActions}>
      <Pressable style={[styles.swipeAction, styles.editAction]} onPress={onEdit}>
        <Text style={styles.swipeText}>{t("Upraviť")}</Text>
      </Pressable>
      <Pressable style={[styles.swipeAction, styles.deleteAction]} onPress={onDelete}>
        <Text style={styles.swipeText}>{t("Vymazať")}</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable renderLeftActions={renderLeftActions} renderRightActions={renderRightActions}>
      <Pressable style={styles.card} onPress={onDetail}>
        <Text style={styles.name}>{trip.name}</Text>
        <Text style={styles.meta}>{trip.locationName || t("Bez lokality")}</Text>
        <Text style={styles.meta}>
          {displayVisitDate(trip)} • {t(renderRating(trip.rating))}
        </Text>
        <VisitPhotoCover photos={trip.photos} />
        <Text numberOfLines={3} style={styles.notes}>{trip.description || trip.notes || t("Bez poznámky")}</Text>
        {trip.syncStatus && trip.syncStatus !== 'synced' ? <Text style={styles.pending}>{t("Čaká na synchronizáciu")}</Text> : null}
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: theme.text,
    marginTop: 2,
  },
  notes: {
    color: theme.muted,
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
    backgroundColor: theme.primary,
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
