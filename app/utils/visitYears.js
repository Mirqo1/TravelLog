export const visitYear = trip => {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(trip?.date || '');
  return match && Number(match[1]) > 0 ? Number(match[1]) : null;
};
export const yearRange = (trips, current = new Date().getFullYear()) => ({
  min: trips.reduce((min, trip) => Math.min(min, visitYear(trip) || current), current), max: current,
});
export const yearAtPosition = (x, width, min, max) => Math.round(min + Math.max(0, Math.min(1, (x - 12) / Math.max(1, width - 24))) * (max - min));
// Input is the currently filtered chronological list. Never remove other years.
export function yearJumpIndex(trips, year, oldestFirst = false) {
  const exact = trips.findIndex(trip => visitYear(trip) === year);
  if (exact >= 0) return exact;
  const next = trips.findIndex(trip => visitYear(trip) && (oldestFirst ? visitYear(trip) >= year : visitYear(trip) <= year));
  if (next >= 0) return next;
  for (let i = trips.length - 1; i >= 0; i--) if (visitYear(trips[i])) return i;
  return -1;
}
