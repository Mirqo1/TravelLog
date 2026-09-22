import { portableTrips } from './backup';

export const fingerprint = (trips) => JSON.stringify(portableTrips(trips).sort((a, b) => a.id.localeCompare(b.id)));
const same = (a, b) => fingerprint(a ? [a] : []) === fingerprint(b ? [b] : []);
const hash = (text) => { let n = 2166136261; for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return (n >>> 0).toString(36); };

// Three-way merge against the last server snapshot, not device clocks. Absence
// means deletion only if that ID existed in the baseline. Keep concurrent edits
// as a deterministic recovery copy rather than silently discarding either one.
export function mergeSync(base, local, remote) {
  const b = new Map(base.map(t => [t.id, t]));
  const l = new Map(local.map(t => [t.id, t]));
  const r = new Map(remote.map(t => [t.id, t]));
  const result = new Map();
  let conflicts = 0;
  for (const id of new Set([...b.keys(), ...l.keys(), ...r.keys()])) {
    const old = b.get(id), left = l.get(id), right = r.get(id);
    let chosen;
    if (same(left, right)) chosen = left;
    else if (same(left, old)) chosen = right;
    else if (same(right, old)) chosen = left;
    else {
      conflicts++;
      if (!left || !right) chosen = left || right; // edit wins over concurrent deletion
      else {
        // Stable ordering makes both devices produce the same original/copy.
        const ordered = [left, right].sort((x, y) => fingerprint([x]).localeCompare(fingerprint([y])));
        chosen = ordered[0];
        const copy = ordered[1];
        const copyId = `${id}-conflict-${hash(fingerprint([copy]))}`;
        if (!l.has(copyId) && !r.has(copyId)) result.set(copyId, { ...copy, id: copyId, name: `${copy.name} (súbežná úprava)` });
      }
    }
    if (chosen) result.set(id, { ...chosen, photos: left?.photos?.length ? left.photos : chosen.photos || [] });
  }
  return { trips: [...result.values()], conflicts };
}
