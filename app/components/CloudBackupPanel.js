import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTrips } from '../context/TripsContext';
import { theme } from '../theme';
import { cloudConfigured, watchCloudAccount, cloudLogin, cloudLogout, cloudResetPassword,
  readCloudBackup, saveCloudBackup } from '../services/cloudBackupService';

export default function CloudBackupPanel() {
  const { trips, restoreBackup } = useTrips();
  const [account, setAccount] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!cloudConfigured) return;
    try { return watchCloudAccount((user) => { setAccount(user); setMessage(''); }); }
    catch (error) { setMessage(error.message); }
  }, []);
  const run = async (action) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await action(); }
    catch (error) {
      const text = error.message || 'Operácia sa nepodarila.';
      setMessage(text);
      Alert.alert('Účet a záloha', text);
    }
    finally { setBusy(false); }
  };
  const confirm = (title, text, action) => Alert.alert(title, text, [
    { text: 'Zrušiť', style: 'cancel' }, { text: 'Pokračovať', onPress: () => run(action) },
  ]);
  const backup = () => run(async () => {
    const previous = await readCloudBackup();
    confirm('Uložiť zálohu?', `Uloží sa ${trips.length} návštev do účtu ${account.email}. ` +
      (previous ? `Nahradí sa predchádzajúca záloha s ${previous.trips.length} návštevami. Ak je z iného telefónu, najprv ju obnov.` : 'Vytvorí sa prvá záloha.') +
      ' Fotografie sa v tejto verzii nezálohujú.', async () => {
      await saveCloudBackup(trips, previous?.revision || null);
      setMessage('Záloha návštev bola uložená. Ďalšie zmeny treba znova zálohovať.');
    });
  });
  const restore = () => run(async () => {
    const snapshot = await readCloudBackup();
    if (!snapshot) { setMessage('Tento účet zatiaľ nemá zálohu.'); return; }
    confirm('Obnoviť návštevy?', `Záloha z ${snapshot.savedAt || 'neznámeho dátumu'} obsahuje ${snapshot.trips.length} návštev. ` +
      'Doplnia sa chýbajúce záznamy. Existujúce návštevy a fotografie v tomto telefóne zostanú nezmenené.', async () => {
      await restoreBackup(snapshot.trips);
      setMessage('Chýbajúce návštevy boli obnovené do tohto telefónu.');
    });
  });
  const button = (label, action) => <Pressable accessibilityRole="button" disabled={busy} onPress={action}
    style={[styles.button, busy && { opacity: 0.5 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
  return <View style={styles.panel}>
    <Text style={styles.title}>Účet a záloha návštev</Text>
    {!cloudConfigured ? <Text style={styles.text}>Cloudová záloha ešte nie je aktivovaná. Návštevy zostávajú uložené v tomto telefóne.</Text> : <>
      <Text style={styles.text}>Záloha je manuálna a zahŕňa údaje návštev bez fotografií. Na novom telefóne sa prihlás do rovnakého účtu a zvoľ Obnoviť.</Text>
      {account ? <>
        <Text selectable style={styles.text}>{account.email}</Text>
        {button('Zálohovať teraz', backup)}
        {button('Obnoviť zo zálohy', restore)}
        {button('Odpojiť účet zálohy', () => run(cloudLogout))}
      </> : <>
        <Text style={styles.text}>Vytvor si skutočný účet pre zálohu. Testovacie prihlásenie do aplikácie sa sem neprenáša.</Text>
        <TextInput accessibilityLabel="Email pre zálohu" style={styles.input} placeholder="Email" autoCapitalize="none"
          keyboardType="email-address" value={email} onChangeText={setEmail} editable={!busy} />
        <TextInput accessibilityLabel="Heslo pre zálohu" style={styles.input} placeholder="Heslo (aspoň 6 znakov)" secureTextEntry
          value={password} onChangeText={setPassword} editable={!busy} />
        {button('Prihlásiť účet', () => run(async () => {
          if (!email.trim() || !password) throw new Error('Vyplň email a heslo.');
          const result = await cloudLogin(email, password); setAccount(result.user); setPassword('');
        }))}
        {button('Vytvoriť účet', () => run(async () => {
          if (!email.trim() || password.length < 6) throw new Error('Vyplň email a heslo s aspoň 6 znakmi.');
          const result = await cloudLogin(email, password, true); setAccount(result.user); setPassword('');
        }))}
        {button('Zabudnuté heslo', () => run(async () => { await cloudResetPassword(email); setMessage('Ak účet existuje, dostaneš email na obnovu hesla.'); }))}
      </>}
    </>}
    {busy ? <Text style={styles.text}>Pracujem…</Text> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 18, gap: 12, borderRadius: 20, backgroundColor: theme.primarySoft },
  title: { fontWeight: '700', color: theme.text, fontSize: 17 },
  text: { color: theme.muted, lineHeight: 21 },
  input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 12, borderRadius: 10 },
  button: { backgroundColor: theme.primary, padding: 13, borderRadius: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
