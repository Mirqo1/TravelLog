import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTrips } from '../context/TripsContext';

const StatCard = ({ label, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function HomeScreen() {
  const { loading, stats, trips } = useTrips();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>TravelLog Dashboard</Text>
      <Text style={styles.subheader}>Prehľad tvojich výletov, krajín a obľúbených miest.</Text>

      <View style={styles.statsGrid}>
        <StatCard label="Výlety" value={stats.totalTrips} />
        <StatCard label="Krajiny" value={stats.countriesVisited} />
        <StatCard label="Priemerné ★" value={stats.averageRating} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Obľúbená lokalita</Text>
        <Text style={styles.panelValue}>{stats.favoriteLocation}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Posledné výlety</Text>
        {stats.recentTrips.length ? (
          stats.recentTrips.map((trip) => (
            <View key={trip.id} style={styles.tripRow}>
              <Text style={styles.tripName}>{trip.name}</Text>
              <Text style={styles.tripMeta}>
                {trip.locationName || 'Bez lokality'} • {trip.date}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Zatiaľ nemáš uložený žiadny výlet.</Text>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Offline stav</Text>
        <Text style={styles.panelValue}>
          {trips.some((trip) => trip.syncStatus && trip.syncStatus !== 'synced')
            ? 'Niektoré zmeny čakajú na synchronizáciu.'
            : 'Všetky zmeny sú synchronizované alebo uložené v cache.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 16,
    gap: 14,
    backgroundColor: '#f9fafb',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subheader: {
    color: '#4b5563',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
  },
  statLabel: {
    marginTop: 4,
    color: '#6b7280',
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  panelTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  panelValue: {
    color: '#374151',
    lineHeight: 22,
  },
  tripRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tripName: {
    fontWeight: '600',
    color: '#111827',
  },
  tripMeta: {
    color: '#6b7280',
    marginTop: 2,
  },
  empty: {
    color: '#6b7280',
  },
});
