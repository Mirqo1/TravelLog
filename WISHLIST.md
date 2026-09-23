# Premium wishlist — Chcem navštíviť

## User flow

- Home → Chcem navštíviť. Also accessible through Wishlist ☆ in Map.
- Choose a search result or any map position → ☆ Chcem navštíviť.
- Confirm/edit name, locality and notes, then save. Coordinates are retained.
- Wishlist supports accent-insensitive search, editing, confirmed removal and
  opening a saved position on the map without changing the selected map style.
- Navštívil som opens the normal visit editor with location/name/notes filled in
  and today's date/current time. Only a successful visit save removes the wish.
  Stable conversion IDs prevent a retry creating a duplicate visit.
- Wishlist places never contribute to visit statistics, countries or heat maps.

Premium/admin custom claims enable adding/editing, matching the photo feature's
access policy. The private `.preview` package unlocks this for testing. Existing
items remain readable, removable and convertible into visits after expiry.
This release does not implement subscription billing. As with photos, the client
feature gate is not an anti-tampering boundary: owner-only cloud persistence is
available regardless of plan, including after expiry. Enforce commercial creation
entitlements through a trusted backend before a public paid launch.

## Storage and automatic sync

Local durable storage is separate for each notebook/account. It works offline.
With a signed-in Firebase account, sync runs after changes, when returning to the
foreground and every 30 seconds while active, regardless of the selected tab.
This is not an OS background service. Guest wishlist data stays in the guest
notebook; automatic cross-account migration is intentionally not performed.

Firestore location: `users/{uid}/wishlist/{itemId}`. Visit backups and Google Drive
photos remain separate and unchanged. Removal is a retained tombstone so an
older offline device cannot resurrect an unchanged deleted entry. Edits to one
item use a deterministic latest-change merge; simultaneous competing edits do
not create copies. Device timestamps are used, so clocks should be accurate.
One item per document avoids the visit backup's single-document size limit.
Each foreground poll reads the wishlist documents; these are billable Firestore
reads beyond the applicable free quota. No photo data is stored in these records.

## Required Firebase setup

The repository includes the complete updated **firestore.rules**. In the Firebase
console for **travellog-80759**, open **Firestore Database → Rules**, replace the
editor contents with that file, then **Publish**. This is Firestore, not Realtime
Database. Existing visit-backup rules are preserved. No public `allow true` rule
is needed. Repository changes alone do not deploy Firebase rules.

Until these rules are published, the wishlist still saves locally and shows that
cloud rules need updating; it does not claim the data is backed up. We could not
deploy rules from this workspace because it has no authenticated Firebase admin
session. Do not uninstall the app to update it.

## Checks

- `node tests/wishlist.test.mjs`: durable writes and failed-write recovery,
  concurrent edits, tombstones, validation, account isolation, null-account cold
  start, foreground-only autosync, Premium gate, expired-Premium removal,
  in-flight account change and sign-out.
- `node tests/account-sync.test.mjs`: existing visit/Drive boundary regressions
  and idempotent wishlist-to-visit retry.
- Android Hermes export checks packaging. Native APK build and actual second
  device restoration still require device acceptance; they are not claimed tested.

Phone acceptance: save a searched POI and a blank map point; restart; edit notes;
open the saved location; cancel then complete a visit; verify no extra visit or
country count before conversion. After publishing rules, check the saved status
and later restore on another phone signed into the same Firebase account.

### Map interaction update

The Premium map action is always visible. Without a selected point, press it to
start choosing, then tap the map/POI or select a search result. Press it again to
cancel selection. Planned places appear as outlined stars at closer zoom levels;
nearby places cluster, while country overview remains free of wishlist pins.
The styled Wishlist entry opens the full list even after Premium expires.
