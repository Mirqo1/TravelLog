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
      .catch(() => { if (active) setFormMessage('Staré lokálne návštevy sa nepodarilo načítať. Zostali zachované.'); });
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
      const text = error.message || 'Operácia sa nepodarila.';
      setFormMessage(text);
      Alert.alert('Účet a synchronizácia', text);
    } finally { setBusy(false); }
  };
  const button = (label, action, secondary = false) => <Pressable accessibilityRole="button" disabled={busy}
    onPress={action} style={[styles.button, secondary && styles.secondaryButton, busy && { opacity: 0.5 }]}>
    <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
  </Pressable>;

  return <View style={styles.panel}>
    <Text style={styles.title}>Účet a automatické uloženie</Text>
    {!cloudConfigured ? <Text style={styles.text}>Cloudové uloženie ešte nie je aktivované. Návštevy zostávajú v tomto telefóne.</Text> : <>
      {account ? <>
        <View style={styles.statusRow}><View style={[styles.dot, status === 'synced' && styles.dotSynced,
          status === 'pending' && styles.dotPending]} /><Text style={styles.status}>{STATUS[status] || status}</Text></View>
        <Text style={styles.accountName}>{account.displayName || 'Meno nie je nastavené'}</Text>
        <Text selectable style={styles.text}>{account.email}</Text>
        <Text style={styles.text}>{message || 'Po pridaní, úprave alebo vymazaní návštevy sa cloudová kópia aktualizuje automaticky.'}</Text>
        <Text style={styles.note}>Táto synchronizácia ukladá texty návštev. Zálohovanie fotografií na Google Disk zapni v samostatnej časti nižšie.</Text>
        {lastSaved ? <Text style={styles.note}>Posledné potvrdené uloženie: {new Date(lastSaved).toLocaleString()}</Text> : null}
        {button('Skontrolovať uloženie', retry, true)}
        {guestCount > 0 && !imported ? <>
          <Text style={styles.text}>V telefóne máš ešte {guestCount} návštev z pôvodného lokálneho profilu. Do tohto účtu sa neprenášajú bez tvojho výberu.</Text>
          {button('Preniesť moje lokálne návštevy', () => Alert.alert('Preniesť návštevy?',
            `Skopírovať ${guestCount} návštev do účtu ${account.email}? Pôvodná lokálna kópia zostane zachovaná.`,
            [{ text: 'Zrušiť', style: 'cancel' }, { text: 'Preniesť', onPress: () => run(async () => {
              await importGuest(guest.uid); setImported(true);
            }) }]), true)}
        </> : null}
        {imported ? <Text style={styles.note}>Pôvodné lokálne návštevy boli prenesené. Ďalšie zmeny rob už v tomto účte.</Text> : null}
      </> : <>
        <Text style={styles.text}>Prihlás sa do svojho účtu. Jeho návštevy sa obnovia automaticky; prenos návštev z tohto lokálneho profilu si vyberieš osobitne.</Text>
        <TextInput accessibilityLabel="Zobrazované meno" style={styles.input} placeholder="Tvoje meno alebo prezývka"
          value={displayName} onChangeText={setDisplayName} editable={!busy} />
        <TextInput accessibilityLabel="Email" style={styles.input} placeholder="Email" autoCapitalize="none"
          keyboardType="email-address" value={email} onChangeText={setEmail} editable={!busy} />
        <TextInput accessibilityLabel="Heslo" style={styles.input} placeholder="Heslo (aspoň 6 znakov)" secureTextEntry
          value={password} onChangeText={setPassword} editable={!busy} />
        {button('Prihlásiť účet', () => run(async () => {
          if (!email.trim() || !password) throw new Error('Vyplň email a heslo.');
          await loginWithEmail(email, password);
          setPassword('');
        }))}
        {button('Vytvoriť účet', () => run(async () => {
          if (displayName.trim().length < 2) throw new Error('Zadaj svoje meno alebo prezývku.');
          if (!email.trim() || password.length < 6) throw new Error('Vyplň email a heslo s aspoň 6 znakmi.');
          await registerWithEmail(email, password, displayName);
          setPassword('');
        }))}
        <Pressable disabled={busy} onPress={() => run(async () => {
          if (!email.trim()) throw new Error('Najprv zadaj email.');
          await cloudResetPassword(email); setFormMessage('Ak účet existuje, dostaneš email na obnovu hesla.');
        })}><Text style={styles.link}>Zabudnuté heslo</Text></Pressable>
      </>}
    </>}
    {busy ? <Text style={styles.text}>Pracujem…</Text> : null}
    {formMessage ? <Text accessibilityLiveRegion="polite" style={styles.text}>{formMessage}</Text> : null}
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
