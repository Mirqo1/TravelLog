import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addTrip, deleteTrip, getTrips, getUserProfile, updateTrip, restoreTripsBackup, importGuestNotebook } from '../services/tripsService';
import { useAuth } from './AuthContext';

import { summarizeCountries } from '../utils/mapVisits';
import { compareTripsNewest } from '../utils/tripOrder';

const TripsContext = createContext(null);

const sortTrips = (trips) => [...trips].sort(compareTripsNewest);

const buildStats = (trips) => {
  const totalTrips = trips.length;
  const countriesVisited = summarizeCountries(trips).groups.length;
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
  const { notebookId, loading: authLoading } = useAuth();
  const activeId = useRef(notebookId);
  activeId.current = notebookId;
  const readVersion = useRef(0);
  const [loadedFor, setLoadedFor] = useState(null);
  const [trips, setTrips] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadTrips = useCallback(
    async (showRefreshing = false) => {
      if (authLoading) return;
      if (!notebookId) {
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

      const version = ++readVersion.current;
      try {
        const [nextTrips, nextProfile] = await Promise.all([getTrips(notebookId), getUserProfile(notebookId)]);
        if (activeId.current !== notebookId || version !== readVersion.current) return;
        setLoadedFor(notebookId);
        setTrips(sortTrips(nextTrips));
        setProfile(nextProfile);
        setError('');
      } catch (loadError) {
        if (activeId.current === notebookId) setError(loadError.message || 'Návštevy sa nepodarilo načítať.');
      } finally {
        if (activeId.current === notebookId) { setLoading(false); setRefreshing(false); }
      }
    },
    [notebookId, authLoading],
  );

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const refreshAfterSync = useCallback(async () => {
    const version = ++readVersion.current;
    const current = await getTrips(notebookId);
    if (activeId.current === notebookId && version === readVersion.current) setTrips(sortTrips(current));
    return current;
  }, [notebookId]);
  const createTrip = useCallback(async (data, wishlistId = null) => {
    if (!notebookId) throw new Error('Najprv otvor profil.');
    const result = await addTrip(notebookId, data, wishlistId);
    await refreshAfterSync(); return result;
  }, [notebookId, refreshAfterSync]);
  const editTrip = useCallback(async (id, data) => {
    if (!notebookId) throw new Error('Najprv otvor profil.');
    const result = await updateTrip(notebookId, id, data);
    await refreshAfterSync(); return result;
  }, [notebookId, refreshAfterSync]);
  const removeTrip = useCallback(async (id) => {
    if (!notebookId) throw new Error('Najprv otvor profil.');
    await deleteTrip(notebookId, id); await refreshAfterSync();
  }, [notebookId, refreshAfterSync]);

  const applySnapshot = useCallback(async (operation) => {
    if (!notebookId) throw new Error('Najprv otvor profil.');
    await operation(notebookId);
    // Read after queued edits rather than displaying an older in-flight snapshot.
    return refreshAfterSync();
  }, [notebookId, refreshAfterSync]);
  const restoreBackup = useCallback(incoming => applySnapshot(id => restoreTripsBackup(id, incoming)), [applySnapshot]);
  const importGuest = useCallback(guestId => applySnapshot(id => importGuestNotebook(id, guestId)), [applySnapshot]);
  const visibleTrips = loadedFor === notebookId ? trips : [];
  const value = useMemo(() => ({
    trips: visibleTrips, profile: loadedFor === notebookId ? profile : null,
    loading: authLoading || loading || (!error && !!notebookId && loadedFor !== notebookId),
    refreshing, error, notebookId, loadedFor,
    stats: buildStats(visibleTrips), refreshTrips: () => loadTrips(true),
    addTrip: createTrip, updateTrip: editTrip, deleteTrip: removeTrip,
    restoreBackup, importGuest, refreshAfterSync,
  }), [visibleTrips, profile, authLoading, loading, refreshing, error, notebookId, loadedFor,
    loadTrips, createTrip, editTrip, removeTrip, restoreBackup, importGuest, refreshAfterSync]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
};

export const useTrips = () => {
  const context = useContext(TripsContext);
  if (!context) throw new Error('useTrips must be used inside TripsProvider');
  return context;
};
