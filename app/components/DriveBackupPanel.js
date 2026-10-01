import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useDriveBackup } from '../context/DriveBackupContext';
import { theme } from '../theme';

export default function DriveBackupPanel() {
  useLanguage();
  const drive = useDriveBackup();
  const action = fn => () => Promise.resolve().then(fn).catch(error => Alert.alert(t("Google Disk"), t(error.message)));
  const button = (text, fn, disabled = false, primary = false) => <Pressable accessibilityRole="button" disabled={disabled || drive.busy}
    onPress={action(fn)} style={[styles.button, primary && styles.primaryButton, (disabled || drive.busy) && { opacity: 0.45 }]}><Text style={[styles.buttonText, primary && { color: '#fff' }]}>{text}</Text></Pressable>;
  return <View style={styles.card}>
    <Text style={styles.title}>{t("Fotografie · Google Disk")}</Text>
    <Text style={styles.note}>{t("Zálohy využívajú miesto na tvojom Google Disku. Sú súkromné a nezobrazujú sa medzi bežnými súbormi.")}</Text>
    {!drive.signedIn ? <Text style={styles.note}>{t("Najprv sa prihlás do účtu TravelLog. Potom môžeš pripojiť svoj Google Disk.")}</Text>
      : !drive.available ? <Text style={styles.note}>{t("Pre túto funkciu nainštaluj nový Android build aplikácie.")}</Text>
      : <>
        {drive.config ? <>
          <Text selectable style={styles.email}>{drive.config.email}</Text>
          <View style={styles.row}><Text style={[styles.note, { flex: 1 }]}>{t("Prenášať fotky iba cez Wi-Fi")}</Text>
            <Switch accessibilityLabel={t("Fotografie iba cez Wi-Fi")} value={drive.config.wifiOnly !== false} disabled={drive.busy}
              onValueChange={value => action(() => drive.setWifiOnly(value))()} trackColor={{ true: theme.primary }} /></View>
          <Text accessibilityLiveRegion="polite" style={styles.note}>{t(drive.message)}</Text>
          {drive.config.lastSaved ? <Text style={styles.note}>{t("Posledná dokončená kontrola:")}{' '}{new Date(drive.config.lastSaved).toLocaleString()}</Text> : null}
          {button(t("Zálohovať teraz"), drive.backup, !drive.canUpload)}
          {button(t("Obnoviť fotografie"), () => Alert.alert(t("Obnoviť fotografie z Disku?"),
            t("Prihlás sa do rovnakého účtu TravelLog aj Google ako na pôvodnom telefóne. Najprv počkaj na načítanie návštev. Doplníme fotky do návštev bez fotografií; existujúce galérie ani texty neprepíšeme."),
            [{ text: t("Zrušiť"), style: 'cancel' }, { text: t("Obnoviť"), onPress: action(drive.restore) }]))}
          {button(t("Obnoviť pripojenie"), drive.connect)}
          {button(t("Vyhľadať nepotrebné nahrané fotky"), drive.cleanupPreview)}
          {drive.cleanupPlan?.count > 0 ? <View style={styles.cleanup}>
            <Text style={styles.note}>{t("Našli sme")}{' '}{drive.cleanupPlan.count}{' '}{t("nahraných fotiek bez odkazu z galérie (")}{(drive.cleanupPlan.bytes / (1024 * 1024)).toFixed(1)}{' '}{t("MB). Fotky používané v iných návštevách sa nemažú. Súbory mladšie ako 7 dní zatiaľ ponechávame.")}</Text>
            {button(t("Uvoľniť toto miesto"), () => Alert.alert(t("Natrvalo vymazať nepotrebné súbory?"),
              t("Nepoužívané fotky sa natrvalo vymažú z Google Disku. Odstránené fotky sa neobnovia zo starších galérií. Pred vymazaním znovu overíme, či ich nepoužíva iná návšteva."),
              [{ text: t("Zrušiť"), style: 'cancel' }, { text: t("Vymazať"), style: 'destructive', onPress: action(drive.cleanup) }]))}
          </View> : null}
          {button(t("Odpojiť Disk"), () => Alert.alert(t("Odpojiť Google Disk?"), t("Zastaví sa zálohovanie v tomto telefóne. Fotky v telefóne aj zálohy na Disku zostanú zachované."),
            [{ text: t("Zrušiť"), style: 'cancel' }, { text: t("Odpojiť"), onPress: action(drive.disconnect) }]))}
          {!drive.canUpload ? <Text style={styles.note}>{t("Nové zálohy vyžadujú Premium. Existujúce si môžeš obnoviť aj bez neho.")}</Text> : null}
        </> : <>
          <Text style={styles.note}>{t("Vyber Google účet pre fotografie tohto účtu TravelLog. Môže byť iný než tvoj prihlasovací e-mail.")}</Text>
          {button(t("Pripojiť Google Disk"), drive.connect, !drive.ready, true)}
          {!!drive.message && <Text style={styles.note}>{t(drive.message)}</Text>}
        </>}
        <Text style={styles.note}>{t("Automatické zálohovanie funguje vo všetkých záložkách, kým je aplikácia otvorená. Po jej zatvorení alebo bez siete fotky čakajú na ďalšie otvorenie. Stav „zálohované“ sa zobrazí až po dokončení prenosu.")}</Text>
        <Text style={styles.note}>{t("Uložené odstránenie fotky alebo návštevy sa po pripojení prenesie na Disk aj ostatné telefóny s touto verziou aplikácie. Platí to aj bez Premium. Fotka sa nevráti pri obnove. Miesto na Disku uvoľníš po kontrole a potvrdení; odpojenie Disku zálohu nevymaže.")}</Text>
      </>}
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 18, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: theme.border, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: theme.text },
  note: { color: theme.muted, lineHeight: 20, fontSize: 13 }, email: { color: theme.text, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cleanup: { gap: 8 },
  button: { minHeight: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  primaryButton: { backgroundColor: theme.primary, borderColor: theme.primary },
  buttonText: { fontWeight: '700', color: theme.primary },
});
