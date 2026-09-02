import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import HeatMapVisualization from '../components/HeatMapVisualization';

const PLACE_COUNTS = [
  { country: 'Slovensko', count: 5 },
  { country: 'Česko', count: 3 },
  { country: 'Rakúsko', count: 2 },
  { country: 'Poľsko', count: 1 },
  { country: 'Taliansko', count: 6 },
];

export default function HeatMapScreen() {
  const [selectedCountry, setSelectedCountry] = useState(null);

  const selectedDetails = useMemo(() => {
    if (!selectedCountry) {
      return 'Vyber krajinu na mape pre detail.';
    }
    return `${selectedCountry.country}: ${selectedCountry.count} navštívených miest`;
  }, [selectedCountry]);

  return (
    <View style={styles.container}>
      <HeatMapVisualization
        countryData={PLACE_COUNTS}
        selectedCountry={selectedCountry}
        onSelectCountry={setSelectedCountry}
      />
      <Text style={styles.details}>{selectedDetails}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  details: {
    marginTop: 12,
    fontSize: 16,
    color: '#111827',
  },
});
