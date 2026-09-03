import React from 'react';
import { Alert, Modal, StyleSheet, View } from 'react-native';
import TripForm from './TripForm';

export default function AddPlaceModal({
  visible,
  coordinates,
  initialTrip,
  title = 'Pridať výlet',
  submitLabel = 'Uložiť výlet',
  onClose,
  onSave,
}) {
  const handleSubmit = async (trip) => {
    try {
      await onSave(trip);
    } catch (error) {
      Alert.alert('Uloženie zlyhalo', error.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TripForm
            title={title}
            submitLabel={submitLabel}
            initialValues={initialTrip}
            externalLocation={coordinates}
            onCancel={onClose}
            onSubmit={handleSubmit}
          />
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
});
