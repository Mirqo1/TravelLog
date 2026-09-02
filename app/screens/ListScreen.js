import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import PlaceListItem from '../components/PlaceListItem';
import { deletePlaceVisit, listPlacesByUser, updatePlaceVisit } from '../services/placesService';
import { useAuth } from '../context/AuthContext';

let adsModule = null;
try {
  adsModule = require('react-native-google-mobile-ads');
} catch (error) {
  adsModule = null;
}

const Banner = adsModule?.BannerAd;
const BannerAdSize = adsModule?.BannerAdSize;
const TestIds = adsModule?.TestIds;

const MOCK_PLACES = [
  {
    id: '1',
    name: 'Bratislava',
    type: 'Mesto',
    country: 'Slovensko',
    visitDate: '2026-08-10',
    notes: 'Historické centrum',
  },
  {
    id: '2',
    name: 'Karlštejn',
    type: 'Hrad',
    country: 'Česko',
    visitDate: '2026-07-01',
    notes: 'Skvelý výhľad',
  },
];

export default function ListScreen() {
  const { user } = useAuth();
  const [places, setPlaces] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const loadPlaces = async () => {
      if (!user) {
        setPlaces(MOCK_PLACES);
        return;
      }

      try {
        const remotePlaces = await listPlacesByUser(user.uid);
        setPlaces(remotePlaces.length ? remotePlaces : MOCK_PLACES);
      } catch (error) {
        setPlaces(MOCK_PLACES);
      }
    };

    loadPlaces();
  }, [user]);

  const filtered = useMemo(() => {
    const result = typeFilter === 'all' ? [...places] : places.filter((item) => item.type === typeFilter);
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'country') {
        return a.country.localeCompare(b.country);
      }
      return String(b.visitDate).localeCompare(String(a.visitDate));
    });
    return result;
  }, [places, sortBy, typeFilter]);

  const handleDelete = async (placeId) => {
    try {
      if (user) {
        await deletePlaceVisit(placeId, user.uid);
      }
      setPlaces((prev) => prev.filter((item) => item.id !== placeId));
    } catch (error) {
      Alert.alert('Zmazanie zlyhalo', error.message);
    }
  };

  const handleEdit = async (place) => {
    const updatedDate = new Date().toISOString().slice(0, 10);
    try {
      if (user) {
        await updatePlaceVisit(place.id, user.uid, {
          visitDate: updatedDate,
          notes: `${place.notes || ''} • Upravené`,
        });
      }
      setPlaces((prev) =>
        prev.map((item) =>
          item.id === place.id
            ? {
                ...item,
                visitDate: updatedDate,
                notes: `${item.notes || ''} • Upravené`,
              }
            : item,
        ),
      );
    } catch (error) {
      Alert.alert('Editácia zlyhala', error.message);
    }
  };

  const handleDetail = (place) => {
    Alert.alert(
      place.name,
      `Typ: ${place.type}\nKrajina: ${place.country}\nDátum: ${place.visitDate}\nPoznámky: ${
        place.notes || 'Bez poznámky'
      }`,
    );
  };

  const renderItem = ({ item, index }) => (
    <View>
      <PlaceListItem
        place={item}
        onDetail={() => handleDetail(item)}
        onEdit={() => handleEdit(item)}
        onDelete={() => handleDelete(item.id)}
      />
      {!user?.isPremium && Banner && BannerAdSize && TestIds && (index + 1) % 3 === 0 ? (
        <Banner unitId={TestIds.BANNER} size={BannerAdSize.BANNER} />
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Zoznam Miest</Text>
      <View style={styles.controls}>
        <Pressable style={styles.controlBtn} onPress={() => setSortBy('date')}>
          <Text>Dátum</Text>
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={() => setSortBy('name')}>
          <Text>Názov</Text>
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={() => setSortBy('country')}>
          <Text>Krajina</Text>
        </Pressable>
      </View>
      <View style={styles.controls}>
        <Pressable style={styles.controlBtn} onPress={() => setTypeFilter('all')}>
          <Text>Všetko</Text>
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={() => setTypeFilter('Mesto')}>
          <Text>Mesto</Text>
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={() => setTypeFilter('Hrad')}>
          <Text>Hrad</Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      {!user?.isPremium && Banner && BannerAdSize && TestIds ? (
        <Banner unitId={TestIds.BANNER} size={BannerAdSize.BANNER} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  controlBtn: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  list: {
    paddingBottom: 16,
  },
});
