import { t } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import TripEditor from '../components/TripEditor';
import { useTrips } from '../context/TripsContext';

export default function AddTripScreen() {
  useLanguage();
  const { addTrip } = useTrips();
  const [formKey, setFormKey] = useState(0);
  return <TripEditor key={formKey} title={t("Pridať výlet")} onSubmit={async (trip) => {
    await addTrip(trip);
    setFormKey((current) => current + 1);
    Alert.alert('Hotovo', t("Výlet bol uložený."));
  }} />;
}
