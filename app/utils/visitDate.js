// Dates and visit times are local wall-clock values, never UTC conversions.
const pad = (value) => String(value).padStart(2, '0');
export const localDate = (now = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
export const localTime = (now = new Date()) => `${pad(now.getHours())}:${pad(now.getMinutes())}`;
export function parseVisitDate(value) {
  const text = String(value || '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const human = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/.exec(text);
  if (!iso && !human) return null;
  const [year, month, day] = iso ? iso.slice(1).map(Number) : [Number(human[3]), Number(human[2]), Number(human[1])];
  const date = new Date(year, month - 1, day, 12);
  if (year < 1000 || year > 9999 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}
export const validVisitTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');
export const displayDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('.') : value || '';
export const displayVisitDate = (trip) => displayDate(trip.date) + (validVisitTime(trip.visitTime) ? ` · ${trip.visitTime}` : '');
export function calendarDays(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => i >= offset && i < offset + count ? i - offset + 1 : null);
}
