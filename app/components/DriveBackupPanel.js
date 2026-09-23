import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useDriveBackup } from '../context/DriveBackupContext';
import { theme } from '../theme';

export default function DriveBackupPanel() {
  const drive = useDriveBackup();
  const action = fn => () => Promise.resolve().then(fn).catch(error => Alert.alert('Google Disk', error.message));
  const button = (text, fn, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled || drive.busy}
    onPress={action(fn)} style={[styles.button, (disabled || drive.busy) && { opacity: 0.45 }]}><Text style={styles.buttonText}>{text}</Text></Pressable>;
  return <View style={styles.card}>
    <Text style={styles.title}>Fotografie · Google Disk</Text>
    <Text style={styles.note}>Zálohy využívajú miesto na tvojom Google Disku. Sú súkromné a nezobrazujú sa medzi bežnými súbormi.</Text>
    {!drive.signedIn ? <Text style={styles.note}>Najprv sa prihlás do účtu TravelLog. Potom môžeš pripojiť svoj Google Disk.</Text>
      : !drive.available ? <Text style={styles.note}>Pre túto funkciu nainštaluj nový Android build aplikácie.</Text>
      : <>
        {drive.config ? <>
          <Text selectable style={styles.email}>{drive.config.email}</Text>
          <View style={styles.row}><Text style={[styles.note, { flex: 1 }]}>Prenášať fotky iba cez Wi-Fi</Text>
            <Switch accessibilityLabel="Fotografie iba cez Wi-Fi" value={drive.config.wifiOnly !== false} disabled={drive.busy}
              onValueChange={value => action(() => drive.setWifiOnly(value))()} trackColor={{ true: theme.primary }} /></View>
          <Text accessibilityLiveRegion="polite" style={styles.note}>{drive.message}</Text>
          {drive.config.lastSaved ? <Text style={styles.note}>Posledná dokončená kontrola: {new Date(drive.config.lastSaved).toLocaleString()}</Text> : null}
          {button('Zálohovať teraz', drive.backup, !drive.canUpload)}
          {button('Obnoviť fotografie', () => Alert.alert('Obnoviť fotografie z Disku?',
            'Prihlás sa do rovnakého účtu TravelLog aj Google ako na pôvodnom telefóne. Najprv počkaj na načítanie návštev. Doplníme fotky do návštev bez fotografií; existujúce galérie ani texty neprepíšeme.',
            [{ text: 'Zrušiť', style: 'cancel' }, { text: 'Obnoviť', onPress: action(drive.restore) }]))}
          {button('Obnoviť pripojenie', drive.connect)}
          {button('Odpojiť Disk', () => Alert.alert('Odpojiť Google Disk?', 'Zastaví sa zálohovanie v tomto telefóne. Fotky v telefóne aj zálohy na Disku zostanú zachované.',
            [{ text: 'Zrušiť', style: 'cancel' }, { text: 'Odpojiť', onPress: action(drive.disconnect) }]))}
          {!drive.canUpload ? <Text style={styles.note}>Nové zálohy vyžadujú Premium. Existujúce si môžeš obnoviť aj bez neho.</Text> : null}
        </> : <>
          <Text style={styles.note}>Vyber Google účet pre fotografie tohto účtu TravelLog. Môže byť iný než tvoj prihlasovací e-mail.</Text>
          {button('Pripojiť Google Disk', drive.connect, !drive.ready)}
          {!!drive.message && <Text style={styles.note}>{drive.message}</Text>}
        </>}
        <Text style={styles.note}>Automatické zálohovanie funguje vo všetkých záložkách, kým je aplikácia otvorená. Po jej zatvorení alebo bez siete fotky čakajú na ďalšie otvorenie. Stav „zálohované“ sa zobrazí až po dokončení prenosu.</Text>
        <Text style={styles.note}>Odstránenie fotky v aplikácii zatiaľ neuvoľní jej miesto v zálohe na Disku. Odpojenie Disku zálohu nevymaže.</Text>
      </>}
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 18, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: theme.border, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: theme.text },
  note: { color: theme.muted, lineHeight: 20, fontSize: 13 }, email: { color: theme.text, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: { minHeight: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 12, padding: 10, backgroundColor: theme.primarySoft },
  buttonText: { fontWeight: '700', color: theme.primary },
});
