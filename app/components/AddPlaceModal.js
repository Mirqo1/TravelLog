import React from 'react';
import { Modal } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TripEditor from './TripEditor';

export default function AddPlaceModal({ visible, coordinates, initialTrip, title = 'Pridať výlet', submitLabel = 'Uložiť výlet', onClose, onSave }) {
  if (!visible) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
          <TripEditor initialValues={initialTrip} coordinates={coordinates} title={title}
            submitLabel={submitLabel} onCancel={onClose} onSubmit={onSave} />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
