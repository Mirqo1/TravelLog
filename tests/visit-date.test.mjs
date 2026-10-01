import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const load = async (path) => import('data:text/javascript;base64,' + Buffer.from(await readFile(new URL(path, import.meta.url), 'utf8')).toString('base64'));
const { parseVisitDate, localDate, localTime, validVisitTime, calendarDays } = await load('../app/utils/visitDate.js');
const { compareTripsNewest } = await load('../app/utils/tripOrder.js');
const { portableTrips, mergeBackup } = await load('../app/utils/backup.js');
assert.equal(parseVisitDate('29.2.2024'), '2024-02-29');
assert.equal(parseVisitDate('2026-09-22'), '2026-09-22');
for (const invalid of ['315.14.2026', '31.2.2026', '29.2.2026', '0.1.2026', '2026-13-01', '2026-04-31', 'abc']) assert.equal(parseVisitDate(invalid), null, invalid);
assert.equal(localDate(new Date(2026, 8, 22, 0, 5)), '2026-09-22');
assert.equal(localTime(new Date(2026, 8, 22, 0, 5)), '00:05');
for (const time of ['00:00', '23:59', '14:30']) assert.ok(validVisitTime(time));
for (const time of ['24:00', '12:60', '4:30', 'abc']) assert.ok(!validVisitTime(time));
assert.equal(calendarDays(2024, 1).filter(Boolean).length, 29);
assert.equal(calendarDays(2026, 1).filter(Boolean).length, 28);
const trips = [
 { id: 'morning', date: '2026-09-21', visitTime: '08:30', createdAt: '2026-09-23T12:00:00Z' },
 { id: 'evening', date: '2026-09-21', visitTime: '18:00', createdAt: '2026-09-22T12:00:00Z' },
 { id: 'later-day', date: '2026-09-22', createdAt: '2026-09-22T12:00:00Z' },
 { id: 'unknown', date: '2026-09-21', createdAt: '2026-09-24T12:00:00Z' },
];
assert.deepEqual([...trips].sort(compareTripsNewest).map((t) => t.id), ['later-day', 'evening', 'morning', 'unknown']);
assert.equal(mergeBackup([], portableTrips(trips), 'user').find((t) => t.id === 'evening').visitTime, '18:00');
assert.equal(portableTrips(trips).find((t) => t.id === 'unknown').visitTime, '');
console.log('PASS: real dates/leap years, local clock defaults, calendar cells, visit chronology and time backup roundtrip.');
