import { fingerprint } from '../utils/syncMerge';

// Each runner belongs to one immutable account/notebook. Triggers arriving while
// a request is running are retained; stop prevents stale responses touching UI.
export function createNotebookSync({ uid, notebookId, readRemote, saveRemote, mergeRemote, acknowledge, readLocal, refresh, report, isAccountCurrent }) {
  let stopped = false, running = false, requested = false;
  const active = () => !stopped && isAccountCurrent(uid);
  async function request() {
    requested = true;
    if (running || !active()) return;
    running = true;
    let timer;
    try {
      do {
        requested = false;
        report({ status: 'syncing', message: 'Kontrolujem a ukladám návštevy…' });
        timer = setTimeout(() => { if (active()) report({ status: 'pending', message: 'Čakám na server. Zmeny sú zatiaľ uložené v telefóne.' }); }, 15000);
        const remote = await readRemote(uid);
        if (!active()) break;
        const merged = await mergeRemote(notebookId, remote);
        if (!active()) break;
        await refresh();
        if (!active()) break;
        let saved = remote;
        if (!remote || fingerprint(merged.trips) !== fingerprint(remote.trips)) {
          saved = await saveRemote(merged.trips, remote?.revision || null, uid);
          if (!active()) break;
        }
        await acknowledge(notebookId, saved);
        if (!active()) break;
        const latest = await readLocal(notebookId);
        if (!active()) break;
        const dirty = fingerprint(latest.trips) !== fingerprint(saved.trips);
        requested ||= dirty;
        report({ status: dirty ? 'pending' : 'synced', lastSaved: saved.savedAt,
          message: dirty ? 'Ďalšie zmeny čakajú na uloženie.' : latest.conflicts
            ? 'Návštevy sú uložené. Pri súbežných zmenách sme zachovali upravenú návštevu alebo obe verzie; skontroluj ich v zozname.'
            : 'Návštevy sú automaticky uložené.' });
        clearTimeout(timer);
      } while (requested && active());
    } catch (error) {
      if (active()) {
        const transient = ['unavailable', 'deadline-exceeded', 'aborted', 'sync/conflict', 'network-request-failed'].some(code => error.code?.endsWith(code));
        report({ status: transient ? 'pending' : 'error', message: transient
          ? 'Uloženie zopakujem automaticky. Zmeny zostali v telefóne.'
          : error.code === 'permission-denied' ? 'Cloud odmietol prístup. Skontroluj prihlásenie a pravidlá databázy. Lokálne údaje zostali zachované.'
          : error.message || 'Uloženie sa nepodarilo. Lokálne údaje zostali zachované.' });
      }
    } finally { clearTimeout(timer); running = false; }
  }
  return { request, stop: () => { stopped = true; } };
}
