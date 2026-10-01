import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { openVisitTransfer, discardVisitTransfer } from '../services/visitTransferService';
import VisitReceiveModal from './VisitReceiveModal';
import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
import { theme } from '../theme';
export default function VisitTransferPanel() {
  useLanguage();
  const { notebookId } = useAuth();
  const [received, setReceived] = useState(null), [busy, setBusy] = useState(false);
  const live = useRef(null), preview = useRef(null), lock = useRef(false), alive = useRef(true);
  live.current = notebookId; preview.current = received;
  const close = () => { const old = preview.current; preview.current = null; setReceived(null); discardVisitTransfer(old); };
  useEffect(() => { close(); }, [notebookId]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; discardVisitTransfer(preview.current); }; }, []);
  const open = async () => {
    if (lock.current || !notebookId) return;
    lock.current = true; setBusy(true);
    const identity = notebookId;
    try {
      const data = await openVisitTransfer();
      if (!alive.current || live.current !== identity) { await discardVisitTransfer(data); return; }
      if (data) { preview.current = data; setReceived(data); }
    } catch (error) { if (alive.current && live.current === identity) Alert.alert(t('Zdieľaná návšteva'), t(error.message)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  return <View style={styles.panel}>
    <Text style={styles.note}>{t('Stiahni prijatý súbor ZIP a otvor ho tu. Návšteva ani pozvánka sa neprijmú automaticky.')}</Text>
    <Pressable accessibilityRole="button" disabled={busy || !notebookId} onPress={open} style={styles.button}>
      {busy ? <ActivityIndicator color={theme.primary} /> : <Text style={styles.label}>{t('Otvoriť prijatú návštevu')}</Text>}
    </Pressable>
    <VisitReceiveModal data={received} onClose={close} />
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 16, gap: 14 }, note: { color: theme.muted, lineHeight: 21 },
  button: { minHeight: 48, borderWidth: 1, borderColor: theme.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { color: theme.primary, fontWeight: '700' },
});
