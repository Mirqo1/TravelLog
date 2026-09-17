import { theme } from '../theme';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AddVisitButton from '../components/AddVisitButton';
import AddPlaceModal from '../components/AddPlaceModal';
import PlaceListItem from '../components/PlaceListItem';
import TripDetailsModal from '../components/TripDetailsModal';
import { useTrips } from '../context/TripsContext';

import { compareTripsNewest } from '../utils/tripOrder';

const normalizeSearch = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function TripsScreen() {
  const { trips, loading, refreshing, refreshTrips, updateTrip, deleteTrip } = useTrips();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);

  const filteredTrips = useMemo(() => {
    const loweredSearch = normalizeSearch(search.trim());
    const result = !loweredSearch
      ? [...trips]
      : trips.filter((trip) => {
        const text = normalizeSearch([trip.name, trip.locationName, trip.date, trip.description, trip.notes].filter(Boolean).join(' '));
        return loweredSearch.split(/\s+/).every((word) => text.includes(word));
      });

    result.sort((left, right) => {
      if (sortBy === 'oldest') {
        return -compareTripsNewest(left, right);
      }
      if (sortBy === 'rating') {
        return Number(right.rating || 0) - Number(left.rating || 0);
      }
      if (sortBy === 'location') {
        return String(left.locationName || '').localeCompare(String(right.locationName || ''));
      }
      return compareTripsNewest(left, right);
    });

    return result;
  }, [search, sortBy, trips]);

  const requestDelete = (trip) => {
    Alert.alert('Zmazať výlet?', `Naozaj chceš vymazať ${trip.name}?`, [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Zmazať',
        style: 'destructive',
        onPress: async () => {
          try { await deleteTrip(trip.id); }
          catch (error) { Alert.alert('Vymazanie zlyhalo', error.message); return; }
          if (selectedTrip?.id === trip.id) {
            setSelectedTrip(null);
          }
        },
      },
    ]);
  };

  const handleEditSave = async (trip) => {
    await updateTrip(editingTrip.id, trip);
    setEditingTrip(null);
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Trips</Text>
      <AddVisitButton />
      <TextInput
        style={styles.searchInput}
        placeholder="Hľadať názov, lokalitu alebo dátum"
        value={search}
        onChangeText={setSearch}
      />

      <Text style={{ marginBottom: 6, color: theme.muted }}>Zoradiť podľa</Text>
      <View style={styles.chipRow}>
        {[
          ['newest', 'Najnovšie'],
          ['oldest', 'Najstaršie'],
          ['rating', 'Rating'],
          ['location', 'Lokalita'],
        ].map(([value, label]) => (
          <Text
            key={value}
            onPress={() => setSortBy(value)}
            style={[styles.chip, sortBy === value && styles.chipActive]}
          >
            {label}
          </Text>
        ))}
      </View>

      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlaceListItem
            trip={item}
            onDetail={() => setSelectedTrip(item)}
            onEdit={() => setEditingTrip(item)}
            onDelete={() => requestDelete(item)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>{search.trim() ? 'Žiadna návšteva nezodpovedá hľadaniu.' : 'Zatiaľ nemáš žiadne výlety.'}</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshTrips} />}
        contentContainerStyle={styles.listContent}
      />

      <TripDetailsModal
        visible={Boolean(selectedTrip)}
        trip={selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onEdit={() => {
          setEditingTrip(selectedTrip);
          setSelectedTrip(null);
        }}
        onDelete={() => requestDelete(selectedTrip)}
      />

      <AddPlaceModal
        visible={Boolean(editingTrip)}
        initialTrip={editingTrip}
        onClose={() => setEditingTrip(null)}
        onSave={handleEditSave}
        title="Upraviť výlet"
        submitLabel="Uložiť zmeny"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: theme.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.text,
  },
  chipActive: {
    backgroundColor: theme.primarySoft,
    color: theme.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    color: theme.muted,
    marginTop: 40,
  },
});
