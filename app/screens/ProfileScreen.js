import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { APP_COLORS } from '../components/AppBackground';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripsContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { profile, stats, trips, updateProfile } = useTrips();
  const isPremium = Boolean(profile?.isPremium || user?.isPremium);
  const name = profile?.name || user?.displayName || 'Hosť';
  const email = user?.email || 'neprihlásený';

  const handlePlanChange = async () => {
    try {
      const nextPremium = !isPremium;
      await updateProfile({ isPremium: nextPremium });
      Alert.alert('Plán upravený', nextPremium ? 'Premium plán je aktívny.' : 'Prepnuté späť na Free plán.');
    } catch (error) {
      Alert.alert('Zmena plánu zlyhala', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.header}>Profil</Text>
        <View style={styles.heroIdentity}>
          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroMeta}>{email}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Účet</Text>
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Meno</Text>
          <Text style={styles.value}>{name}</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{email}</Text>
        </View>
        {profile?.homeBase ? (
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Domovská lokalita</Text>
            <Text style={styles.value}>{profile.homeBase}</Text>
          </View>
        ) : null}
        {profile?.bio ? <Text style={styles.note}>{profile.bio}</Text> : null}
      </View>

      <View style={[styles.card, styles.planCard]}>
        <View style={styles.planHeader}>
          <View style={styles.planContent}>
            <Text style={styles.sectionTitle}>Plan {isPremium ? 'Premium' : 'Free'}</Text>
            <Text style={styles.planNote}>
              {isPremium ? 'Bez reklám a pripravené pre ďalšie benefity.' : 'Reklamy sú aktívne vo free verzii.'}
            </Text>
          </View>
          <Pressable style={styles.planButton} onPress={handlePlanChange}>
            <Text style={styles.planButtonText}>{isPremium ? 'Change Plan' : 'Upgrade'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cestovateľské štatistiky</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Celkom výletov</Text>
          <Text style={styles.value}>{stats.totalTrips}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Navštívené krajiny</Text>
          <Text style={styles.value}>{stats.countriesVisited}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Obľúbená lokalita</Text>
          <Text style={styles.value}>{stats.favoriteLocation}</Text>
        </View>
        <Text style={styles.note}>
          {trips.some((trip) => trip.syncStatus && trip.syncStatus !== 'synced')
            ? 'Niektoré zmeny čakajú na online synchronizáciu.'
            : 'Dáta sú pripravené aj pre offline použitie cez lokálnu cache.'}
        </Text>
      </View>

      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Odhlásiť sa</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 14,
  },
  hero: {
    borderRadius: 28,
    backgroundColor: APP_COLORS.accent,
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  header: {
    fontSize: 16,
    fontWeight: '700',
    color: APP_COLORS.accentDark,
    marginBottom: 10,
  },
  heroIdentity: {
    gap: 4,
  },
  heroName: {
    fontSize: 30,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  heroMeta: {
    marginTop: 6,
    color: APP_COLORS.muted,
  },
  card: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    gap: 12,
  },
  infoBlock: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    color: APP_COLORS.text,
    fontWeight: '600',
  },
  note: {
    color: APP_COLORS.muted,
    lineHeight: 20,
  },
  planCard: {
    borderColor: 'rgba(124, 90, 0, 0.2)',
    backgroundColor: APP_COLORS.accentSoft,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  planContent: {
    flex: 1,
    minWidth: 180,
  },
  planNote: {
    marginTop: 4,
    color: APP_COLORS.muted,
    lineHeight: 20,
  },
  planButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: APP_COLORS.accent,
    borderWidth: 1,
    borderColor: 'rgba(124, 90, 0, 0.18)',
  },
  planButtonText: {
    color: APP_COLORS.accentDark,
    fontWeight: '700',
  },
  button: {
    marginTop: 4,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
