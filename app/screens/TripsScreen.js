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
import AddPlaceModal from '../components/AddPlaceModal';
import PlaceListItem from '../components/PlaceListItem';
import TripDetailsModal from '../components/TripDetailsModal';
import { useTrips } from '../context/TripsContext';

const searchFieldValue = (trip, searchField) => {
  if (searchField === 'name') {
    return trip.name;
  }
  if (searchField === 'location') {
    return trip.locationName;
  }
  if (searchField === 'date') {
    return trip.date;
  }
  return `${trip.name} ${trip.locationName} ${trip.date} ${trip.description}`;
};

export default function TripsScreen() {
  const { trips, loading, refreshing, refreshTrips, updateTrip, deleteTrip } = useTrips();
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);

  const filteredTrips = useMemo(() => {
    const loweredSearch = search.trim().toLowerCase();
    const result = !loweredSearch
      ? [...trips]
      : trips.filter((trip) => searchFieldValue(trip, searchField).toLowerCase().includes(loweredSearch));

    result.sort((left, right) => {
      if (sortBy === 'oldest') {
        return String(left.date).localeCompare(String(right.date));
      }
      if (sortBy === 'rating') {
        return Number(right.rating || 0) - Number(left.rating || 0);
      }
      if (sortBy === 'location') {
        return String(left.locationName || '').localeCompare(String(right.locationName || ''));
      }
      return String(right.date).localeCompare(String(left.date));
    });

    return result;
  }, [search, searchField, sortBy, trips]);

  const requestDelete = (trip) => {
    Alert.alert('Zmazať výlet?', `Naozaj chceš vymazať ${trip.name}?`, [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Zmazať',
        style: 'destructive',
        onPress: async () => {
          await deleteTrip(trip.id);
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
      <TextInput
        style={styles.searchInput}
        placeholder="Vyhľadaj výlet"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.chipRow}>
        {[
          ['all', 'Všetko'],
          ['name', 'Názov'],
          ['location', 'Lokalita'],
          ['date', 'Dátum'],
        ].map(([value, label]) => (
          <Text
            key={value}
            onPress={() => setSearchField(value)}
            style={[styles.chip, searchField === value && styles.chipActive]}
          >
            {label}
          </Text>
        ))}
      </View>

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
        ListEmptyComponent={<Text style={styles.empty}>Zatiaľ nemáš žiadne výlety.</Text>}
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
    backgroundColor: '#f9fafb',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
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
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#111827',
  },
  chipActive: {
    backgroundColor: '#bfdbfe',
    color: '#1d4ed8',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 40,
  },
});
