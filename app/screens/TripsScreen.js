import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../context/WishlistContext';
import WishlistModal from '../components/WishlistModal';
import VisitYearTimeline from '../components/VisitYearTimeline';
import { visitYear, yearRange, yearJumpIndex } from '../utils/visitYears';
import { theme } from '../theme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Alert,
  FlatList,
  RefreshControl,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AddVisitButton from '../components/AddVisitButton';
import AddPlaceModal from '../components/AddPlaceModal';
import PlaceListItem from '../components/PlaceListItem';
import TripDetailsModal from '../components/TripDetailsModal';
import { useTrips } from '../context/TripsContext';

import { countries, countryDisplayName, countryForTrip } from '../utils/mapVisits';
import { displayVisitDate } from '../utils/visitDate';
import { compareTripsNewest } from '../utils/tripOrder';

const normalizeSearch = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function TripsScreen({ route, navigation }) {
  useLanguage();
  const { trips, loading, refreshing, refreshTrips, updateTrip, deleteTrip } = useTrips();
  const { items: dreams, ready: dreamsReady } = useWishlist();
  const countryCode = route.params?.countryCode;
  const listRef = useRef(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10 });
  useEffect(() => { setSearch(''); listRef.current?.scrollToOffset({ offset: 0, animated: false }); }, [countryCode]);
  const [section, setSection] = useState(route.params?.section || 'visits');
  useEffect(() => { setSection(route.params?.section || 'visits'); }, [route.params?.section, route.params?.sectionRequest, countryCode]);
  const [draggingYear, setDraggingYear] = useState(false);
  const [visibleYear, setVisibleYear] = useState(new Date().getFullYear());
  const [jumpRequest, setJumpRequest] = useState(null);
  const [jumpMessage, setJumpMessage] = useState('');
  const jump = useRef(null), retryTimer = useRef(null);
  const cancelJump = () => { jump.current = null; clearTimeout(retryTimer.current); };
  useEffect(() => cancelJump, []);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);

  const filteredTrips = useMemo(() => {
    const loweredSearch = normalizeSearch(search.trim());
    const scopedTrips = countryCode ? trips.filter((trip) => countryForTrip(trip)?.code === countryCode) : trips;
    const result = !loweredSearch
      ? [...scopedTrips]
      : scopedTrips.filter((trip) => {
        const text = normalizeSearch([trip.name, trip.locationName, trip.date, displayVisitDate(trip), trip.description, trip.notes, ...(trip.tags || [])].filter(Boolean).join(' '));
        return loweredSearch.split(/\s+/).every((word) => text.includes(word));
      });

    result.sort((left, right) => {
      if (sortBy === 'oldest') {
        return -compareTripsNewest(left, right);
      }
      if (sortBy === 'added') {
        return String(right.createdAt || '').localeCompare(String(left.createdAt || '')) || compareTripsNewest(left, right);
      }
      if (sortBy === 'name') {
        return String(left.name || '').localeCompare(String(right.name || ''), 'sk') || compareTripsNewest(left, right);
      }
      return compareTripsNewest(left, right);
    });

    return result;
  }, [search, sortBy, trips, countryCode]);

  const range = useMemo(() => yearRange(trips), [trips]);
  const listData = useRef(filteredTrips); listData.current = filteredTrips;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const first = viewableItems.find(entry => entry.isViewable && entry.item);
    const year = visitYear(first?.item);
    if (year) setVisibleYear(year);
    if (jump.current && viewableItems.some(entry => entry.item?.id === jump.current.id)) {
      jump.current = null; clearTimeout(retryTimer.current);
    }
  }).current;
  const attemptJump = () => {
    const pending = jump.current;
    if (!pending) return;
    const index = listData.current.findIndex(item => item.id === pending.id);
    if (index < 0) { cancelJump(); return; }
    listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0 });
  };
  const retryJump = info => {
    const pending = jump.current;
    if (!pending) return;
    if (++pending.attempts > 12) {
      cancelJump(); setJumpMessage(t("Presný skok sa nepodaril. Môžeš pokračovať posúvaním zoznamu.")); return;
    }
    listRef.current?.scrollToOffset({ offset: Math.max(0, info.averageItemLength * info.index), animated: false });
    clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(attemptJump, 180);
  };
  useEffect(() => {
    cancelJump();
    if (!jumpRequest || section !== 'visits') return;
    const index = yearJumpIndex(filteredTrips, jumpRequest.year, sortBy === 'oldest');
    if (index < 0) { setJumpMessage(t("Pre aktuálne filtre nie sú dostupné žiadne návštevy.")); return; }
    const actualYear = visitYear(filteredTrips[index]);
    const message = actualYear === jumpRequest.year ? t("Návštevy v roku {0}", {0: actualYear})
      : t("Rok {0} nemá zodpovedajúce návštevy. Presúvam na rok {1}.", {0: jumpRequest.year, 1: actualYear});
    setJumpMessage(actualYear === jumpRequest.year ? '' : message); AccessibilityInfo.announceForAccessibility(message);
    jump.current = { id: filteredTrips[index].id, attempts: 0 };
    retryTimer.current = setTimeout(attemptJump, 80);
    return cancelJump;
  }, [jumpRequest]);
  useEffect(() => { cancelJump(); setJumpRequest(null); setJumpMessage(''); }, [search, countryCode, section]);
  const selectYear = year => {
    if (sortBy !== 'newest' && sortBy !== 'oldest') setSortBy('newest');
    setJumpRequest({ year, request: Date.now() });
  };
  const sectionTabs = <View style={styles.sectionTabs} accessibilityRole="tablist">
    {[['visits', t("Návštevy")], ['dreams', t("Moje sny")]].map(([key, label]) =>
      <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: section === key }}
        onPress={() => { cancelJump(); setSection(key); navigation.setParams({ section: key }); }}
        style={[styles.sectionTab, section === key && styles.sectionTabActive]}>
        <Text style={[styles.sectionLabel, section === key && { color: '#fff' }]}>{label} · {key === 'visits' ? trips.length : dreamsReady ? dreams.length : '…'}</Text>
      </Pressable>)}
  </View>;

  const requestDelete = (trip) => {
    Alert.alert(t("Zmazať výlet?"), t("Naozaj chceš vymazať {0}?", {0: trip.name}), [
      { text: t("Zrušiť"), style: 'cancel' },
      {
        text: t("Zmazať"),
        style: 'destructive',
        onPress: async () => {
          try { await deleteTrip(trip.id); }
          catch (error) { Alert.alert(t("Vymazanie zlyhalo"), t(error.message)); return; }
          if (selectedTrip?.id === trip.id) {
            setSelectedTrip(null);
          }
        },
      },
    ]);
  };

  const handleEditSave = async (trip) => {
    await updateTrip(editingTrip.id, trip);
    setEditingTrip(null);
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {section === 'dreams' ? <WishlistModal visible embedded header={sectionTabs} onClose={() => {}}
        onMap={item => navigation.navigate('Map', { wishRequest: Date.now(), wishPlace: item || null })} /> : <FlatList
        scrollEnabled={!draggingYear}
        onScrollBeginDrag={cancelJump}
        onScrollToIndexFailed={retryJump}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        ref={listRef}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={<View style={styles.listHeader}>
      {sectionTabs}
      {countryCode ? <Pressable onPress={() => navigation.setParams({ countryCode: null, countryName: null })} accessibilityRole="button" accessibilityLabel={t("Zrušiť filter krajiny")} style={[styles.chip, styles.countryFilter]}>
        <Text>{countryDisplayName(countries.find(country => country.code === countryCode)) || route.params.countryName || countryCode}{' '}{t("· Zrušiť filter ×")}</Text>
      </Pressable> : null}
      <AddVisitButton />
      <TextInput
        style={styles.searchInput}
        placeholder={t("Hľadať názov, lokalitu alebo dátum")}
        value={search}
        onChangeText={setSearch}
      />

      <Text style={{ marginBottom: 6, color: theme.muted }}>{t("Zoradiť podľa")}</Text>
      <View style={styles.chipRow}>
        {[
          ['newest', t("Najnovšie")],
          ['oldest', t("Najstaršie")],
          ['added', t("Posledné pridané")],
          ['name', t("Názov A–Z")],
        ].map(([value, label]) => (
          <Text
            key={value}
            onPress={() => { cancelJump(); setJumpRequest(null); setJumpMessage(''); setSortBy(value); }}
            style={[styles.chip, sortBy === value && styles.chipActive]}
          >
            {label}
          </Text>
        ))}
      </View>

      {trips.length > 0 ? <VisitYearTimeline min={range.min} max={range.max} value={visibleYear}
        onSelect={selectYear} onDragging={setDraggingYear} /> : null}
      {jumpMessage ? <Text accessibilityLiveRegion="polite" style={styles.jumpMessage}>{t(jumpMessage)}</Text> : null}
        </View>}
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View>
          {visitYear(item) !== visitYear(filteredTrips[index - 1]) && (sortBy === 'newest' || sortBy === 'oldest') ?
            <Text style={styles.yearHeading}>{visitYear(item) || t("Bez dátumu")}</Text> : null}
          <PlaceListItem
            trip={item}
            onDetail={() => setSelectedTrip(item)}
            onEdit={() => setEditingTrip(item)}
            onDelete={() => requestDelete(item)}
          />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{search.trim() ? t("Žiadna návšteva nezodpovedá hľadaniu.") : t("Zatiaľ nemáš žiadne výlety.")}</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshTrips} />}
        contentContainerStyle={styles.listContent}
      />}

      <TripDetailsModal
        visible={Boolean(selectedTrip)}
        trip={selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onEdit={() => {
          setEditingTrip(selectedTrip);
          setSelectedTrip(null);
        }}
        onDelete={() => requestDelete(selectedTrip)}
      />

      <AddPlaceModal
        visible={Boolean(editingTrip)}
        initialTrip={editingTrip}
        onClose={() => setEditingTrip(null)}
        onSave={handleEditSave}
        title={t("Upraviť výlet")}
        submitLabel={t("Uložiť zmeny")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTabs: { flexDirection: 'row', gap: 10, alignItems: 'stretch', marginBottom: 16 },
  sectionTab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 8, borderRadius: 10, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.primary },
  sectionTabActive: { backgroundColor: theme.primary }, sectionLabel: { color: theme.primary, fontWeight: '700', textAlign: 'center' },
  yearHeading: { fontSize: 20, fontWeight: '800', color: theme.primary, paddingTop: 8, paddingBottom: 12 },
  jumpMessage: { color: theme.muted, paddingBottom: 12 },
  listHeader: { paddingBottom: 12 },
  countryFilter: { alignSelf: 'flex-start', marginBottom: 16, minHeight: 44, justifyContent: 'center' },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: theme.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.text,
  },
  chipActive: {
    backgroundColor: theme.primarySoft,
    color: theme.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    color: theme.muted,
    marginTop: 40,
  },
});
