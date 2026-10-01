import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTrips } from '../context/TripsContext';
import { getTrips, getNotebookState } from '../services/tripsService';
import { theme } from '../theme';
import { useCloudSync } from '../context/CloudSyncContext';
import { useAuth } from '../context/AuthContext';
import { cloudConfigured, cloudResetPassword } from '../services/cloudBackupService';

const STATUS = {
  local: 'Účet nie je pripojený',
  connecting: 'Pripájam účet…',
  syncing: 'Ukladám návštevy…',
  pending: 'Čaká na pripojenie',
  synced: 'Automaticky uložené',
  error: 'Cloud nie je dostupný',
  unavailable: 'Cloud nie je nakonfigurovaný',
};

export default function CloudBackupPanel() {
  useLanguage();
  const { account, status, message, lastSaved, retry } = useCloudSync();
  const { guest, loginWithEmail, registerWithEmail } = useAuth();
  const { notebookId, importGuest } = useTrips();
  const [guestCount, setGuestCount] = useState(0);
  const [imported, setImported] = useState(false);
  useEffect(() => {
    let active = true;
    setGuestCount(0); setImported(false);
    if (account && guest?.uid && notebookId) Promise.all([getTrips(guest.uid), getNotebookState(notebookId)])
      .then(([visits, state]) => { if (active) { setGuestCount(visits.length); setImported(state.imports.includes(guest.uid)); } })
      .catch(() => { if (active) setFormMessage(t("Staré lokálne návštevy sa nepodarilo načítať. Zostali zachované.")); });
    return () => { active = false; };
  }, [account?.uid, guest?.uid, notebookId]);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const run = async (action) => {
    if (busy) return;
    setBusy(true); setFormMessage('');
    try { await action(); }
    catch (error) {
      const text = error.message || t("Operácia sa nepodarila.");
      setFormMessage(text);
      Alert.alert(t("Účet a synchronizácia"), t(text));
    } finally { setBusy(false); }
  };
  const button = (label, action, secondary = false) => <Pressable accessibilityRole="button" disabled={busy}
    onPress={action} style={[styles.button, secondary && styles.secondaryButton, busy && { opacity: 0.5 }]}>
    <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{t(label)}</Text>
  </Pressable>;

  return <View style={styles.panel}>
    <Text style={styles.title}>{t("Účet a automatické uloženie")}</Text>
    {!cloudConfigured ? <Text style={styles.text}>{t("Cloudové uloženie ešte nie je aktivované. Návštevy zostávajú v tomto telefóne.")}</Text> : <>
      {account ? <>
        <View style={styles.statusRow}><View style={[styles.dot, status === 'synced' && styles.dotSynced,
          status === 'pending' && styles.dotPending]} /><Text style={styles.status}>{t(STATUS[status] || status)}</Text></View>
        <Text style={styles.accountName}>{account.displayName || t("Meno nie je nastavené")}</Text>
        <Text selectable style={styles.text}>{account.email}</Text>
        <Text style={styles.text}>{t(message || t("Po pridaní, úprave alebo vymazaní návštevy sa cloudová kópia aktualizuje automaticky."))}</Text>
        <Text style={styles.note}>{t("Táto synchronizácia ukladá texty návštev. Zálohovanie fotografií na Google Disk zapni v sekcii Fotografie a Google Disk.")}</Text>
        {lastSaved ? <Text style={styles.note}>{t("Posledné potvrdené uloženie:")}{' '}{new Date(lastSaved).toLocaleString()}</Text> : null}
        {button(t("Skontrolovať uloženie"), retry, true)}
        {guestCount > 0 && !imported ? <>
          <Text style={styles.text}>{t("V telefóne máš ešte")}{' '}{guestCount}{' '}{t("návštev z pôvodného lokálneho profilu. Do tohto účtu sa neprenášajú bez tvojho výberu.")}</Text>
          {button(t("Preniesť moje lokálne návštevy"), () => Alert.alert(t("Preniesť návštevy?"),
            t("Skopírovať {0} návštev do účtu {1}? Pôvodná lokálna kópia zostane zachovaná.", {0: guestCount, 1: account.email}),
            [{ text: t("Zrušiť"), style: 'cancel' }, { text: t("Preniesť"), onPress: () => run(async () => {
              await importGuest(guest.uid); setImported(true);
            }) }]), true)}
        </> : null}
        {imported ? <Text style={styles.note}>{t("Pôvodné lokálne návštevy boli prenesené. Ďalšie zmeny rob už v tomto účte.")}</Text> : null}
      </> : <>
        <Text style={styles.text}>{t("Prihlás sa do svojho účtu. Jeho návštevy sa obnovia automaticky; prenos návštev z tohto lokálneho profilu si vyberieš osobitne.")}</Text>
        <TextInput accessibilityLabel={t("Zobrazované meno")} style={styles.input} placeholder={t("Tvoje meno alebo prezývka")}
          value={displayName} onChangeText={setDisplayName} editable={!busy} />
        <TextInput accessibilityLabel="Email" style={styles.input} placeholder="Email" autoCapitalize="none"
          keyboardType="email-address" value={email} onChangeText={setEmail} editable={!busy} />
        <TextInput accessibilityLabel={t("Heslo")} style={styles.input} placeholder={t("Heslo (aspoň 6 znakov)")} secureTextEntry
          value={password} onChangeText={setPassword} editable={!busy} />
        {button(t("Prihlásiť účet"), () => run(async () => {
          if (!email.trim() || !password) throw new Error(t("Vyplň email a heslo."));
          await loginWithEmail(email, password);
          setPassword('');
        }))}
        {button(t("Vytvoriť účet"), () => run(async () => {
          if (displayName.trim().length < 2) throw new Error(t("Zadaj svoje meno alebo prezývku."));
          if (!email.trim() || password.length < 6) throw new Error(t("Vyplň email a heslo s aspoň 6 znakmi."));
          await registerWithEmail(email, password, displayName);
          setPassword('');
        }), true)}
        <Pressable disabled={busy} onPress={() => run(async () => {
          if (!email.trim()) throw new Error(t("Najprv zadaj email."));
          await cloudResetPassword(email); setFormMessage(t("Ak účet existuje, dostaneš email na obnovu hesla."));
        })}><Text style={styles.link}>{t("Zabudnuté heslo")}</Text></Pressable>
      </>}
    </>}
    {busy ? <Text style={styles.text}>{t("Pracujem…")}</Text> : null}
    {formMessage ? <Text accessibilityLiveRegion="polite" style={styles.text}>{t(formMessage)}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 18, gap: 12, borderRadius: 20, backgroundColor: theme.primarySoft },
  title: { fontWeight: '700', color: theme.text, fontSize: 17 },
  text: { color: theme.muted, lineHeight: 21 },
  note: { color: theme.muted, fontSize: 12, lineHeight: 18 },
  accountName: { color: theme.text, fontSize: 18, fontWeight: '700' },
  statusRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  status: { color: theme.text, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.muted },
  dotSynced: { backgroundColor: '#3f7d45' },
  dotPending: { backgroundColor: '#c47d17' },
  input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 12, borderRadius: 10 },
  button: { backgroundColor: theme.primary, padding: 13, borderRadius: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  secondaryButton: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  secondaryButtonText: { color: theme.text },
  link: { color: theme.primary, fontWeight: '600', textAlign: 'center', padding: 8 },
});
