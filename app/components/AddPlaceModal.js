import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PlaceType } from '../services/placesService';

const defaultPlace = {
  name: '',
  type: PlaceType.MESTO,
  country: '',
  visitDate: new Date().toISOString().slice(0, 10),
  notes: '',
};

export default function AddPlaceModal({ visible, coordinates, onClose, onSave }) {
  const [form, setForm] = useState(defaultPlace);

  useEffect(() => {
    if (!visible) {
      setForm(defaultPlace);
    }
  }, [visible]);

  const handleSave = () => {
    if (!form.name.trim()) {
      return;
    }

    onSave({
      ...form,
      coordinates,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Pridať miesto</Text>
          <TextInput
            style={styles.input}
            placeholder="Názov"
            value={form.name}
            onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Typ (Mesto, Hrad...)"
            value={form.type}
            onChangeText={(type) => setForm((prev) => ({ ...prev, type }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Krajina"
            value={form.country}
            onChangeText={(country) => setForm((prev) => ({ ...prev, country }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Dátum návštevy (YYYY-MM-DD)"
            value={form.visitDate}
            onChangeText={(visitDate) => setForm((prev) => ({ ...prev, visitDate }))}
          />
          <TextInput
            style={[styles.input, styles.notes]}
            placeholder="Poznámky"
            multiline
            value={form.notes}
            onChangeText={(notes) => setForm((prev) => ({ ...prev, notes }))}
          />

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.secondary]} onPress={onClose}>
              <Text>Zrušiť</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.primary]} onPress={handleSave}>
              <Text style={styles.primaryText}>Uložiť</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  notes: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondary: {
    backgroundColor: '#f3f4f6',
  },
  primary: {
    backgroundColor: '#2563eb',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
