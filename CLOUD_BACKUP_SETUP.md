# Accounts and automatic visit backup

The app now uses **real Firebase email/password authentication** at entry and in
Profile. The old mock email/token login is no longer used. A clearly labelled
**Continue without an account** mode keeps a local notebook only.

## Existing installation / first update

- Install the APK as an **update**, using the existing application ID and signing
  key. Do not uninstall the only copy of local visits.
- Existing Firebase sessions are restored. Previously uploaded visits are read
  from the same `users/{uid}/backups/notebook` document; no server migration is
  necessary. The existing `firestore.rules` and four Firebase environment values
  remain compatible.
- Old local visits remain under their original notebook ID. Signing into an
  account never silently assigns those visits to it. Profile offers **Preniesť
  moje lokálne návštevy**, shows the target email, and asks for confirmation.
  Import is once per local notebook per account; the original stays on the phone.
  Local photos are retained by import but are NOT uploaded by Firebase; enable the separate Google Drive photo backup in Profile.
- If the previous profile was a mock login, its password was never an account
  password. Use the real account previously created in the backup panel, reset
  its password, or create a real account.
- Update all test devices before testing multi-device editing. Old APKs used an
  additive restore and do not implement this merge protocol.

## Behaviour

- Each Firebase UID has its own local notebook (`cloud-{uid}`). Logging out keeps
  its pending changes on disk; they are accessible again after signing into that
  same account. A different account sees its own data only.
- Local mutations are serialized and written before reporting success. The local
  notebook stores visits, the last server baseline, and import markers together
  in one AsyncStorage value. Corrupt data is not silently replaced.
- While the app is open, visit changes trigger sync after 900 ms; the foreground
  app checks again every 30 seconds and on returning to the foreground. This is
  independent of the selected tab. Android termination/background suspension can
  pause execution: pending data resumes next time the app opens. Data not yet
  sent cannot be recovered from a lost phone.
- Each cycle reads the server, merges local/server changes against the stored
  baseline, and conditionally uploads with a Firestore revision transaction.
  Independent edits are combined. Deletions propagate without reappearing after
  reconnect. Concurrent edits to one visit keep a deterministic recovery copy;
  a concurrent edit wins over deletion. The UI flags such conflicts for review.
- A change arriving during upload is sent in another cycle. A stale revision is
  retried from a fresh read. Network/pending state is distinguished from denied
  access, payload limits and invalid data. "Saved" means the most recently
  checked local portable data matches a confirmed server snapshot, not merely
  that a request has started.
- Delayed requests are bound to an immutable UID/path. Account changes prevent
  stale operations from refreshing another account's UI or targeting its backup.
- Signing out with unconfirmed changes shows a warning. Guest mode always says
  it is local only. Password reset is available from the entry screen and Profile.

## Scope and limitations

Visits include names, descriptions, notes, coordinates, country, date/time,
ratings and original IDs/timestamps. **Firebase does not contain photos.** Visit photo backup/restore now uses the
user's Google Drive after explicit connection in Profile; see GOOGLE_DRIVE_SETUP.md.
Profile photos remain local-only. Wishlist remains planned.

The existing one-document version-1 backup and conservative 700,000 URI-encoded
character guard remain. Large production notebooks should migrate to per-visit
storage rather than simply increasing this limit. This implementation is sync
with conflict recovery, not historical/immutable versioned backup. Account
verification/deletion and production premium entitlements remain separate work.

## Verification

- `node tests/account-sync.test.mjs`: actual local service and sync runner with
  storage/network doubles: offline deletion and restart, independent device edits,
  concurrent same-record recovery, edits during upload, account switch during a
  delayed fetch, explicit repeated import, corrupt/failed storage, revision retry.
- `node tests/backup.test.mjs`: portable format validation, original photo retention,
  additive manual restore, concurrent restore/add, corruption handling.
- Android Metro export and Firebase Auth initialization from the resulting real
  Android bundle are smoke checks, not a native APK/device test.

Device acceptance: confirm original visits after update; explicitly import any
remaining local visits; add/edit/delete offline and reopen online; sign into the
same account on a second phone; check both directions including deletion; edit a
single record on both devices; sign out and into another account; confirm original
account's pending changes remain available when returning. Verify password reset
and restored login after process restart. These live checks require the owner's
Firebase project/device and are not claimed by the automated tests.
