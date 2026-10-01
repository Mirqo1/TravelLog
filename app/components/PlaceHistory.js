import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { displayVisitDate } from '../utils/visitDate';
import { theme } from '../theme';
import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
export default function PlaceHistory({ visits }) {
  useLanguage();
  const [open, setOpen] = useState(false);
  if (!visits.length) return null;
  return <>
    <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={{ paddingVertical: 10 }}>
      <Text style={{ color: theme.primary }}>{t(visits.length === 1 ? 'Tu si už bol · 1 návšteva' : visits.length < 5 ? 'Tu si už bol · {0} návštevy' : 'Tu si už bol · {0} návštev', { 0: visits.length })} · {t('História návštev')}</Text>
    </Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaProvider><SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: theme.background }}>
        <Text style={{ fontSize: 22, color: theme.text, fontWeight: '700' }}>{t('História návštev')}</Text>
        <ScrollView style={{ flex: 1 }}>
          {visits.map(visit => <View key={visit.id} style={{ paddingVertical: 16, borderBottomWidth: 1, borderColor: theme.border, gap: 6 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{visit.name}</Text>
            <Text style={{ color: theme.muted }}>{displayVisitDate(visit)}</Text>
            {visit.description ? <Text style={{ color: theme.text }}>{visit.description}</Text> : null}
          </View>)}
        </ScrollView>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ padding: 16 }}>
          <Text style={{ color: theme.primary, textAlign: 'center' }}>{t('Zavrieť')}</Text>
        </Pressable>
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  </>;
}
