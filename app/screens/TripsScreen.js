import { theme } from '../theme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Pressable,
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

import { countryForTrip } from '../utils/mapVisits';
import { displayVisitDate } from '../utils/visitDate';
import { compareTripsNewest } from '../utils/tripOrder';

const normalizeSearch = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function TripsScreen({ route, navigation }) {
  const { trips, loading, refreshing, refreshTrips, updateTrip, deleteTrip } = useTrips();
  const countryCode = route.params?.countryCode;
  const listRef = useRef(null);
  useEffect(() => { setSearch(''); listRef.current?.scrollToOffset({ offset: 0, animated: false }); }, [countryCode]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);

  const filteredTrips = useMemo(() => {
    const loweredSearch = normalizeSearch(search.trim());
    const scopedTrips = countryCode ? trips.filter((trip) => countryForTrip(trip)?.code === countryCode) : trips;
    const result = !loweredSearch
      ? [...scopedTrips]
      : scopedTrips.filter((trip) => {
        const text = normalizeSearch([trip.name, trip.locationName, trip.date, displayVisitDate(trip), trip.description, trip.notes].filter(Boolean).join(' '));
        return loweredSearch.split(/\s+/).every((word) => text.includes(word));
      });

    result.sort((left, right) => {
      if (sortBy === 'oldest') {
        return -compareTripsNewest(left, right);
      }
      if (sortBy === 'added') {
        return String(right.createdAt || '').localeCompare(String(left.createdAt || '')) || compareTripsNewest(left, right);
      }
      if (sortBy === 'name') {
        return String(left.name || '').localeCompare(String(right.name || ''), 'sk') || compareTripsNewest(left, right);
      }
      return compareTripsNewest(left, right);
    });

    return result;
  }, [search, sortBy, trips, countryCode]);

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

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={<View style={styles.listHeader}>
      <Text style={styles.header}>Návštevy</Text>
      {countryCode ? <Pressable onPress={() => navigation.setParams({ countryCode: null, countryName: null })} accessibilityRole="button" accessibilityLabel="Zrušiť filter krajiny" style={[styles.chip, styles.countryFilter]}>
        <Text>{route.params.countryName || countryCode} · Zrušiť filter ×</Text>
      </Pressable> : null}
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
          ['added', 'Posledné pridané'],
          ['name', 'Názov A–Z'],
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

        </View>}
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
  listHeader: { paddingBottom: 12 },
  countryFilter: { alignSelf: 'flex-start', marginBottom: 16, minHeight: 44, justifyContent: 'center' },
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
