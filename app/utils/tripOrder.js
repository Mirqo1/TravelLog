const timestamp = (value) => {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
};

export const compareTripsNewest = (left, right) =>
  String(right.date || '').localeCompare(String(left.date || '')) ||
  String(right.visitTime || '').localeCompare(String(left.visitTime || '')) ||
  timestamp(right.createdAt) - timestamp(left.createdAt);
