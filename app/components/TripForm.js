import { theme } from '../theme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import VisitPhotoEditor from './VisitPhotoEditor';
import { useTrips } from '../context/TripsContext';
import { getTrips } from '../services/tripsService';
import { photoList, MAX_VISIT_PHOTOS } from '../utils/visitPhotos';
import { importVisitPhoto, discardUnusedDrafts, deleteManagedPhoto } from '../services/visitPhotoService';
import CountryPicker from './CountryPicker';
import VisitCalendar from './VisitCalendar';
import { displayDate, localDate, localTime, parseVisitDate, validVisitTime } from '../utils/visitDate';
import { countries } from '../utils/mapVisits';
import { applyLocationSelection } from '../utils/locationSelection';

const today = localDate;

const toDraft = (trip = {}) => ({
  name: trip.name || '',
  description: trip.description || '',
  locationName: trip.locationName || '',
  countryCode: trip.countryCode || '',
  latitude:
    trip.location?.latitude === 0 || trip.location?.latitude
      ? String(trip.location.latitude)
      : trip.latitude
        ? String(trip.latitude)
        : '',
  longitude:
    trip.location?.longitude === 0 || trip.location?.longitude
      ? String(trip.location.longitude)
      : trip.longitude
        ? String(trip.longitude)
        : '',
  date: displayDate(trip.date || today()),
  visitTime: trip.visitTime || (trip.id || trip.date ? '' : localTime()),
  rating: Number(trip.rating || 0),
  notes: trip.notes || '',
});

export default function TripForm({
  initialValues,
  externalLocation,
  title,
  submitLabel,
  onSubmit,
  onCancel,
  isSubmitting = false,
  onInputFocus,
}) {
  const { notebookId } = useTrips();
  const draftOwner = useRef(notebookId);
  const mounted = useRef(true);
  const createdPhotos = useRef([]);
  const [photos, setPhotos] = useState(() => photoList(initialValues?.photos));
  const [photosBusy, setPhotosBusy] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      discardUnusedDrafts([...createdPhotos.current], () => getTrips(draftOwner.current));
    };
  }, []);
  const importPhotos = async (assets) => {
    const imported = [];
    try {
      for (const asset of assets) {
        if (!mounted.current) break;
        const photo = await importVisitPhoto(asset);
        if (!mounted.current) { await deleteManagedPhoto(photo); break; }
        createdPhotos.current.push(photo); imported.push(photo);
      }
    } finally {
      // Successfully processed selections remain available even if one file fails.
      if (mounted.current) setPhotos(current => [...current, ...imported].slice(0, MAX_VISIT_PHOTOS));
      else await Promise.all(imported.map(deleteManagedPhoto));
    }
  };
  const [calendarOpen, setCalendarOpen] = useState(false);
  const submitLock = useRef(false);
  const lastSelection = useRef(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => toDraft(initialValues));

  useEffect(() => {
    setForm(toDraft(initialValues));
    setPhotos(photoList(initialValues?.photos));
  }, [initialValues]);

  useEffect(() => {
    if (externalLocation) {
      const previous = lastSelection.current;
      lastSelection.current = externalLocation;
      setForm((current) => applyLocationSelection(current, previous, externalLocation));
    }
  }, [externalLocation]);

  const coordinatesPreview = useMemo(() => {
    if (!form.latitude || !form.longitude) {
      return 'Vyber miesto na mape alebo zadaj súradnice ručne.';
    }

    return `Lat: ${form.latitude}, Lng: ${form.longitude}`;
  }, [form.latitude, form.longitude]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value,
    ...(['latitude', 'longitude', 'locationName'].includes(field) ? { countryCode: '' } : {}),
  }));

  const handleSubmit = async () => {
    if (submitLock.current || isSubmitting || photosBusy) return;
    submitLock.current = true;
    setSaving(true);
    try {
      const latitude = Number(form.latitude);
      const longitude = Number(form.longitude);

      if (!form.name.trim()) {
        throw new Error('Názov výletu je povinný.');
      }

      if (!form.latitude.trim() || !form.longitude.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        throw new Error('Vyber platnú polohu.');
      }

      const date = parseVisitDate(form.date);
      if (!date) throw new Error('Zadaj existujúci dátum, napr. 22.9.2026, alebo ho vyber v kalendári.');
      if (form.visitTime && !validVisitTime(form.visitTime)) throw new Error('Čas musí byť vo formáte HH:MM, napr. 14:30.');
      if (form.countryCode && !countries.some((country) => country.code === form.countryCode.toUpperCase())) throw new Error('Zadaj platný dvojpísmenový kód krajiny, napr. SK alebo HU.');

      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        locationName: form.locationName.trim(),
        countryCode: form.countryCode.toUpperCase(),
        location: { latitude, longitude },
        date,
        visitTime: form.visitTime || '',
        rating: form.rating,
        notes: form.notes.trim(),
        photos,
      });
    } catch (error) {
      Alert.alert('Formulár', error.message);
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <TextInput
        onFocus={onInputFocus}
        style={styles.input}
        placeholder="Názov výletu"
        value={form.name}
        onChangeText={(value) => updateField('name', value)}
      />
      <TextInput
        onFocus={onInputFocus}
        style={[styles.input, styles.multiline]}
        multiline
        placeholder="Popis návštevy"
        value={form.description}
        onChangeText={(value) => updateField('description', value)}
      />
      <TextInput
        onFocus={onInputFocus}
        style={styles.input}
        placeholder="Lokalita (napr. Bratislava, Slovensko)"
        value={form.locationName}
        onChangeText={(value) => updateField('locationName', value)}
      />
      <View style={styles.row}>
        <TextInput
        onFocus={onInputFocus}
          style={[styles.input, styles.halfInput]}
          placeholder="Latitude"
          keyboardType="numeric"
          value={form.latitude}
          onChangeText={(value) => updateField('latitude', value)}
        />
        <TextInput
        onFocus={onInputFocus}
          style={[styles.input, styles.halfInput]}
          placeholder="Longitude"
          keyboardType="numeric"
          value={form.longitude}
          onChangeText={(value) => updateField('longitude', value)}
        />
      </View>
      <Text style={styles.helper}>{coordinatesPreview}</Text>
      <Text style={styles.sectionLabel}>Krajina</Text>
      <CountryPicker value={form.countryCode} onChange={(value) => updateField('countryCode', value)} />
      <Text style={styles.helper}>Ak automaticky určená krajina nesedí, vyber správnu.</Text>
      <Text style={styles.sectionLabel}>Dátum návštevy</Text>
      <View style={styles.row}>
        <TextInput onFocus={onInputFocus} style={[styles.input, styles.halfInput]} placeholder="DD.MM.RRRR" value={form.date}
          accessibilityLabel="Dátum návštevy" onChangeText={(value) => updateField('date', value)} />
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: calendarOpen }} style={[styles.button, styles.secondary]}
          onPress={() => { Keyboard.dismiss(); setCalendarOpen((open) => !open); }}><Text style={styles.secondaryText}>Kalendár</Text></Pressable>
      </View>
      {calendarOpen ? <VisitCalendar value={form.date} onSelect={(date) => { updateField('date', displayDate(date)); setCalendarOpen(false); }} /> : null}
      <Text style={styles.sectionLabel}>Čas návštevy</Text>
      <TextInput onFocus={onInputFocus} style={styles.input} placeholder="HH:MM (nepovinné)" value={form.visitTime}
        accessibilityLabel="Čas návštevy" maxLength={5} onChangeText={(value) => updateField('visitTime', value)} />
      <Pressable accessibilityRole="button" onPress={() => updateField('visitTime', '')} style={{ paddingVertical: 8 }}><Text style={{ color: theme.primary }}>Čas nepoznám</Text></Pressable>
      <View style={styles.ratingRow}>
        <Text style={styles.sectionLabel}>Hodnotenie</Text>
        <View style={styles.ratingButtons}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              style={[styles.ratingButton, form.rating === value && styles.ratingButtonActive]}
              onPress={() => updateField('rating', value)}
            >
              <Text style={form.rating === value ? styles.ratingTextActive : styles.ratingText}>{value}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <TextInput
        onFocus={onInputFocus}
        style={[styles.input, styles.multiline]}
        multiline
        placeholder="Poznámky"
        value={form.notes}
        onChangeText={(value) => updateField('notes', value)}
      />
      <VisitPhotoEditor photos={photos} onChange={setPhotos} onImport={importPhotos}
        disabled={saving || isSubmitting} onBusy={setPhotosBusy} />
      <View style={styles.actions}>
        {onCancel ? (
          <Pressable style={[styles.button, styles.secondary]} disabled={saving} onPress={onCancel}>
            <Text style={styles.secondaryText}>Zrušiť</Text>
          </Pressable>
        ) : null}
        <Pressable style={[styles.button, styles.primary]} disabled={isSubmitting || saving || photosBusy} onPress={handleSubmit}>
          <Text style={styles.primaryText}>{isSubmitting || saving ? 'Ukladám...' : submitLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  helper: {
    color: theme.muted,
    fontSize: 13,
  },
  sectionLabel: {
    fontWeight: '600',
    color: theme.text,
  },
  ratingRow: {
    gap: 8,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  ratingButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  ratingText: {
    color: theme.primary,
    fontWeight: '700',
  },
  ratingTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  button: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondary: {
    backgroundColor: theme.border,
  },
  primary: {
    backgroundColor: theme.primary,
  },
  secondaryText: {
    color: theme.text,
    fontWeight: '600',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
