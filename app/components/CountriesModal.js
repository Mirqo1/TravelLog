import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { summarizeCountries, countryDisplayName } from '../utils/mapVisits';
import { theme } from '../theme';
export default function CountriesModal({ visible, trips, onClose, onCountry, onMap }) {
  useLanguage();
  const summary = useMemo(() => summarizeCountries(trips), [trips]);
  const groups = [...summary.groups].sort((a, b) => b.trips.length - a.trips.length || countryDisplayName(a.country).localeCompare(countryDisplayName(b.country), 'sk'));
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaProvider><SafeAreaView style={styles.screen}>
      <View style={styles.row}><Text style={styles.title}>{t("Navštívené krajiny")}</Text>
        <Pressable style={styles.touch} onPress={onClose}><Text style={styles.link}>{t("Zavrieť")}</Text></Pressable></View>
      <Text style={styles.hint}>{t("Vyber krajinu a zobraz jej návštevy.")}</Text>
      <ScrollView style={{ flex: 1 }}>
        {groups.map(({ country, trips: visits }) => <Pressable key={country.code} accessibilityRole="button"
          style={styles.country} onPress={() => onCountry(country)}>
          <Text style={styles.name}>{countryDisplayName(country)}</Text><Text style={styles.count}>{visits.length}×  ›</Text>
        </Pressable>)}
        {!groups.length ? <Text style={styles.hint}>{t("Zatiaľ nemáš žiadnu navštívenú krajinu.")}</Text> : null}
        {summary.unmatched ? <Text style={styles.hint}>{t("Návštevy bez určenej krajiny:")}{' '}{summary.unmatched}{t(". Krajinu môžeš doplniť pri úprave návštevy.")}</Text> : null}
      </ScrollView>
      <Pressable accessibilityRole="button" style={styles.button} onPress={onMap}><Text style={styles.buttonText}>{t("Zobraziť na mape")}</Text></Pressable>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background, padding: 20, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 23, fontWeight: '700', color: theme.text, flex: 1 },
  touch: { paddingVertical: 14 }, link: { color: theme.primary }, hint: { color: theme.muted, lineHeight: 21 },
  country: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: 14, padding: 18, marginBottom: 10 },
  name: { flex: 1, fontSize: 17, color: theme.text }, count: { fontWeight: '700', fontSize: 20, color: theme.primary },
  button: { backgroundColor: theme.primary, padding: 16, borderRadius: 14, alignItems: 'center' }, buttonText: { color: '#fff', fontWeight: '700' },
});
