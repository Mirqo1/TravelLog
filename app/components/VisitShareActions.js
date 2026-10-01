import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
import { theme } from '../theme';
export default function VisitShareActions({ visible, onChoose, onClose }) {
  useLanguage();
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <SafeAreaProvider><View style={styles.overlay}><SafeAreaView edges={['bottom']} style={styles.sheet}>
      <Text style={styles.title}>{t('Zdieľať návštevu')}</Text>
      {[
        ['card', 'image', 'Obrázok s popisom', 'Karta návštevy pre sociálne siete'],
        ['copy', 'file-upload', 'Celá návšteva', 'Kópia s vybranými údajmi a fotkami'],
        ['invitation', 'person-add', 'Pozvať do návštevy', 'Príjemca potvrdí prijatie pozvánky'],
      ].map(([mode, icon, title, subtitle]) => <Pressable key={mode} accessibilityRole="button" onPress={() => onChoose(mode)} style={styles.row}>
        <MaterialIcons name={icon} size={24} color={theme.primary} />
        <View style={{ flex: 1, gap: 4 }}><Text style={styles.label}>{t(title)}</Text><Text style={styles.note}>{t(subtitle)}</Text></View>
        <MaterialIcons name="chevron-right" size={22} color={theme.muted} />
      </Pressable>)}
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.row}><Text style={styles.label}>{t('Zrušiť')}</Text></Pressable>
    </SafeAreaView></View></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: theme.background, paddingHorizontal: 20, paddingTop: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  title: { color: theme.text, fontWeight: '800', fontSize: 21, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  label: { color: theme.primary, fontWeight: '700', fontSize: 16 }, note: { color: theme.muted, lineHeight: 19 },
});
