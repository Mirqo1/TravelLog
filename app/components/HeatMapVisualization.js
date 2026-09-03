import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const getShade = (value) => {
  if (value >= 8) return '#1d4ed8';
  if (value >= 5) return '#2563eb';
  if (value >= 3) return '#3b82f6';
  if (value >= 1) return '#93c5fd';
  return '#dbeafe';
};

export default function HeatMapVisualization({ countryData, selectedCountry, onSelectCountry }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Heat Mapa (placeholder)</Text>
      <Text style={styles.subtitle}>Klikni na krajinu pre detail.</Text>
      <View style={styles.mapLikeGrid}>
        {countryData.map((country) => (
          <Pressable
            key={country.country}
            onPress={() => onSelectCountry(country)}
            style={[
              styles.country,
              { backgroundColor: getShade(country.count) },
              selectedCountry?.country === country.country && styles.selected,
            ]}
          >
            <Text style={styles.countryText}>{country.country}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.legend}>Legenda: svetlá = menej návštev, tmavá = viac návštev.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#4b5563' },
  mapLikeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  country: {
    minWidth: 90,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selected: {
    borderWidth: 2,
    borderColor: '#111827',
  },
  countryText: {
    color: '#111827',
    fontWeight: '600',
  },
  legend: {
    marginTop: 2,
    color: '#4b5563',
  },
});
