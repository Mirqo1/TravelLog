const timestamp = (value) => {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
};

export const compareTripsNewest = (left, right) =>
  String(right.date || '').localeCompare(String(left.date || '')) ||
  timestamp(right.createdAt) - timestamp(left.createdAt);
