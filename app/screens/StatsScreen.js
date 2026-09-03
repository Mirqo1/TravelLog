import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { listPlacesByUser } from '../services/placesService';
import { useAuth } from '../context/AuthContext';

const MOCK_PLACES = [
  { id: '1', country: 'Slovensko', type: 'Mesto', visitDate: '2026-08-10', name: 'Bratislava' },
  { id: '2', country: 'Česko', type: 'Hrad', visitDate: '2026-07-01', name: 'Karlštejn' },
  { id: '3', country: 'Slovensko', type: 'Pamiatka', visitDate: '2026-08-25', name: 'Spišský hrad' },
];

export default function StatsScreen() {
  const { user } = useAuth();
  const [places, setPlaces] = useState(MOCK_PLACES);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        return;
      }

      try {
        const remotePlaces = await listPlacesByUser(user.uid);
        if (remotePlaces.length) {
          setPlaces(remotePlaces);
        }
      } catch (error) {
        setPlaces(MOCK_PLACES);
      }
    };

    load();
  }, [user]);

  const stats = useMemo(() => {
    const totalPlaces = places.length;
    const countriesCount = new Set(places.map((item) => item.country)).size;

    const typeCount = places.reduce((acc, place) => {
      acc[place.type] = (acc[place.type] || 0) + 1;
      return acc;
    }, {});

    const countryCount = places.reduce((acc, place) => {
      acc[place.country] = (acc[place.country] || 0) + 1;
      return acc;
    }, {});

    const mostVisitedCountry =
      Object.entries(countryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const lastVisited =
      [...places].sort((a, b) => String(b.visitDate).localeCompare(String(a.visitDate)))[0]?.name || 'N/A';

    return {
      totalPlaces,
      countriesCount,
      typeCount,
      mostVisitedCountry,
      lastVisited,
    };
  }, [places]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Štatistiky</Text>
      <Text style={styles.item}>Počet miest: {stats.totalPlaces}</Text>
      <Text style={styles.item}>Počet krajín: {stats.countriesCount}</Text>
      <Text style={styles.item}>Posledne navštívené: {stats.lastVisited}</Text>
      <Text style={styles.item}>Najčastejšia krajina: {stats.mostVisitedCountry}</Text>
      <Text style={styles.section}>Rozdelenie podľa typu</Text>
      {Object.entries(stats.typeCount).map(([type, count]) => (
        <Text key={type} style={styles.item}>
          {type}: {count}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  section: {
    marginTop: 8,
    fontWeight: '700',
  },
  item: {
    marginBottom: 6,
    color: '#1f2937',
  },
});
