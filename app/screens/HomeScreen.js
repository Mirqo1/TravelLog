import React from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { APP_COLORS } from '../components/AppBackground';
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
      <View style={styles.hero}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.heroEyebrow}>Travel memories in one place</Text>
        <Text style={styles.heroTitle}>TravelLog</Text>
      </View>

      <View style={styles.introCard}>
        <Text style={styles.subheader}>Prehľad tvojich výletov, krajín a obľúbených miest.</Text>
      </View>

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
            ? 'Niektoré zmeny čakajú na synchronizáciu s Firebase.'
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
    paddingTop: 20,
    paddingBottom: 28,
    gap: 14,
  },
  hero: {
    minHeight: 220,
    borderRadius: 28,
    backgroundColor: APP_COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 28,
    justifyContent: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 18,
    borderRadius: 16,
  },
  heroEyebrow: {
    color: APP_COLORS.accentDark,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  introCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  subheader: {
    color: APP_COLORS.muted,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: APP_COLORS.accentDark,
  },
  statLabel: {
    marginTop: 4,
    color: '#6B7280',
  },
  panel: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    gap: 10,
  },
  panelTitle: {
    fontWeight: '700',
    color: APP_COLORS.text,
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
    color: APP_COLORS.text,
  },
  tripMeta: {
    color: '#6B7280',
    marginTop: 2,
  },
  empty: {
    color: '#6B7280',
  },
});
