import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const today = () => new Date().toISOString().slice(0, 10);

const toDraft = (trip = {}) => ({
  name: trip.name || '',
  description: trip.description || '',
  locationName: trip.locationName || '',
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
  date: trip.date || today(),
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
}) {
  const [form, setForm] = useState(() => toDraft(initialValues));

  useEffect(() => {
    setForm(toDraft(initialValues));
  }, [initialValues]);

  useEffect(() => {
    if (externalLocation) {
      setForm((current) => ({
        ...current,
        latitude: String(externalLocation.latitude),
        longitude: String(externalLocation.longitude),
      }));
    }
  }, [externalLocation]);

  const coordinatesPreview = useMemo(() => {
    if (!form.latitude || !form.longitude) {
      return 'Vyber miesto na mape alebo zadaj súradnice ručne.';
    }

    return `Lat: ${form.latitude}, Lng: ${form.longitude}`;
  }, [form.latitude, form.longitude]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async () => {
    try {
      const latitude = Number(form.latitude);
      const longitude = Number(form.longitude);

      if (!form.name.trim()) {
        throw new Error('Názov výletu je povinný.');
      }

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('Vyber platnú polohu.');
      }

      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        locationName: form.locationName.trim(),
        location: { latitude, longitude },
        date: form.date || today(),
        rating: form.rating,
        notes: form.notes.trim(),
        photos: [],
      });
    } catch (error) {
      Alert.alert('Formulár', error.message);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <TextInput
        style={styles.input}
        placeholder="Názov výletu"
        value={form.name}
        onChangeText={(value) => updateField('name', value)}
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        multiline
        placeholder="Popis"
        value={form.description}
        onChangeText={(value) => updateField('description', value)}
      />
      <TextInput
        style={styles.input}
        placeholder="Lokalita (napr. Bratislava, Slovensko)"
        value={form.locationName}
        onChangeText={(value) => updateField('locationName', value)}
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Latitude"
          keyboardType="numeric"
          value={form.latitude}
          onChangeText={(value) => updateField('latitude', value)}
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Longitude"
          keyboardType="numeric"
          value={form.longitude}
          onChangeText={(value) => updateField('longitude', value)}
        />
      </View>
      <Text style={styles.helper}>{coordinatesPreview}</Text>
      <TextInput
        style={styles.input}
        placeholder="Dátum (YYYY-MM-DD)"
        value={form.date}
        onChangeText={(value) => updateField('date', value)}
      />
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
        style={[styles.input, styles.multiline]}
        multiline
        placeholder="Poznámky"
        value={form.notes}
        onChangeText={(value) => updateField('notes', value)}
      />
      <Text style={styles.helper}>Fotogaléria: placeholder pripravený pre budúce nahrávanie fotiek.</Text>
      <View style={styles.actions}>
        {onCancel ? (
          <Pressable style={[styles.button, styles.secondary]} onPress={onCancel}>
            <Text style={styles.secondaryText}>Zrušiť</Text>
          </Pressable>
        ) : null}
        <Pressable style={[styles.button, styles.primary]} disabled={isSubmitting} onPress={handleSubmit}>
          <Text style={styles.primaryText}>{isSubmitting ? 'Ukladám...' : submitLabel}</Text>
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
    borderColor: '#e5e7eb',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
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
    color: '#6b7280',
    fontSize: 13,
  },
  sectionLabel: {
    fontWeight: '600',
    color: '#111827',
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
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  ratingText: {
    color: '#2563eb',
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
    backgroundColor: '#e5e7eb',
  },
  primary: {
    backgroundColor: '#2563eb',
  },
  secondaryText: {
    color: '#111827',
    fontWeight: '600',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
