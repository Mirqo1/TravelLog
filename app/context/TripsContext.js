import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addTrip, deleteTrip, getTrips, getUserProfile, updateTrip } from '../services/tripsService';
import { useAuth } from './AuthContext';

const TripsContext = createContext(null);

const sortTrips = (trips) => [...trips].sort((left, right) => String(right.date).localeCompare(String(left.date)));

const buildStats = (trips) => {
  const totalTrips = trips.length;
  const countriesVisited = new Set(
    trips.map((trip) => trip.locationName.split(',').at(-1)?.trim()).filter(Boolean),
  ).size;
  const averageRating = totalTrips
    ? (trips.reduce((total, trip) => total + Number(trip.rating || 0), 0) / totalTrips).toFixed(1)
    : '0.0';

  const locationCounts = trips.reduce((accumulator, trip) => {
    const key = trip.locationName || 'Neznáme miesto';
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const favoriteLocation =
    Object.entries(locationCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || 'Zatiaľ žiadne';

  return {
    totalTrips,
    countriesVisited,
    averageRating,
    favoriteLocation,
    recentTrips: sortTrips(trips).slice(0, 3),
  };
};

export const TripsProvider = ({ children }) => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadTrips = useCallback(
    async (showRefreshing = false) => {
      if (!user?.uid) {
        setTrips([]);
        setProfile(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [nextTrips, nextProfile] = await Promise.all([getTrips(user.uid), getUserProfile(user.uid)]);
        setTrips(sortTrips(nextTrips));
        setProfile(nextProfile);
        setError('');
      } catch (loadError) {
        setError(loadError.message || 'Trips could not be loaded.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.uid],
  );

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const createTrip = useCallback(
    async (tripData) => {
      if (!user?.uid) {
        throw new Error('Musíš byť prihlásený.');
      }

      const createdTrip = await addTrip(user.uid, tripData);
      setTrips((current) => sortTrips([...current, createdTrip]));
      return createdTrip;
    },
    [user?.uid],
  );

  const editTrip = useCallback(
    async (tripId, tripData) => {
      if (!user?.uid) {
        throw new Error('Musíš byť prihlásený.');
      }

      const updatedTrip = await updateTrip(user.uid, tripId, tripData);
      setTrips((current) => sortTrips(current.map((trip) => (trip.id === tripId ? updatedTrip : trip))));
      return updatedTrip;
    },
    [user?.uid],
  );

  const removeTrip = useCallback(
    async (tripId) => {
      if (!user?.uid) {
        throw new Error('Musíš byť prihlásený.');
      }

      await deleteTrip(user.uid, tripId);
      setTrips((current) => current.filter((trip) => trip.id !== tripId));
    },
    [user?.uid],
  );

  const value = useMemo(
    () => ({
      trips,
      profile,
      loading,
      refreshing,
      error,
      stats: buildStats(trips),
      refreshTrips: () => loadTrips(true),
      addTrip: createTrip,
      updateTrip: editTrip,
      deleteTrip: removeTrip,
    }),
    [createTrip, editTrip, error, loadTrips, loading, profile, refreshing, removeTrip, trips],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
};

export const useTrips = () => {
  const context = useContext(TripsContext);
  if (!context) {
    throw new Error('useTrips must be used inside TripsProvider');
  }
  return context;
};
