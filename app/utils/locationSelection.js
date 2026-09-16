// An enrichment response shares selectionId with its original map tap.
// It must not reset fields the user typed while the lookup was pending.
export const applyLocationSelection = (current, previous, next) => {
  const sameSelection = previous && (next.selectionId != null
    ? previous.selectionId === next.selectionId
    : previous.latitude === next.latitude && previous.longitude === next.longitude);
  const unchangedCoordinates = Number(current.latitude) === next.latitude && Number(current.longitude) === next.longitude;
  return {
    ...current,
    name: sameSelection ? current.name : next.name || '',
    countryCode: sameSelection
      ? current.countryCode || (unchangedCoordinates && !current.locationName ? next.countryCode || '' : '')
      : next.countryCode || '',
    locationName: sameSelection ? current.locationName || (unchangedCoordinates ? next.locationName || '' : '') : next.locationName || '',
    latitude: sameSelection ? current.latitude : String(next.latitude),
    longitude: sameSelection ? current.longitude : String(next.longitude),
  };
};
