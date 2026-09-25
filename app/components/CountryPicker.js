import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { countries, countryDisplayName } from '../utils/mapVisits';
import { theme } from '../theme';
const normalize = (text) => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const choices = [...new Map(countries.map((country) => [country.code, country])).values()]
  .sort((a, b) => countryDisplayName(a).localeCompare(countryDisplayName(b), 'sk'));
export default function CountryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = countries.find((country) => country.code === value);
  const matches = useMemo(() => choices.filter((country) => normalize([countryDisplayName(country), country.code, ...country.names].join(' ')).includes(normalize(query.trim()))), [query]);
  return <>
    <Pressable accessibilityRole="button" style={styles.field} onPress={() => { setQuery(''); setOpen(true); }}>
      <Text style={styles.label}>{selected ? countryDisplayName(selected) : 'Vybrať krajinu'}  ▾</Text>
    </Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaProvider><SafeAreaView style={styles.screen}>
        <View style={styles.header}><Text style={styles.title}>Krajina návštevy</Text>
          <Pressable style={styles.close} onPress={() => setOpen(false)}><Text style={styles.label}>Zrušiť</Text></Pressable></View>
        <TextInput value={query} onChangeText={setQuery} placeholder="Hľadať krajinu" accessibilityLabel="Hľadať krajinu" style={styles.field} />
        <FlatList data={matches} keyboardShouldPersistTaps="handled" keyExtractor={(country) => country.code}
          ListEmptyComponent={<Text style={styles.label}>Krajina sa nenašla.</Text>}
          renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: item.code === value }} style={styles.option}
            onPress={() => { onChange(item.code); setOpen(false); }}><Text style={styles.label}>{countryDisplayName(item)}{item.code === value ? ' ✓' : ''}</Text></Pressable>} />
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background, padding: 20, gap: 12 },
  field: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, backgroundColor: theme.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: theme.text },
  label: { color: theme.text, fontSize: 16 }, close: { paddingVertical: 14 },
  option: { paddingVertical: 16, borderBottomWidth: 1, borderColor: theme.border },
});
