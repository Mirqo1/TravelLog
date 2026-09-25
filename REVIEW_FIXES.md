# Follow-up: account initialization and visit detail

- Upgrade Firebase 10 to pinned Firebase 12.19.0, as required by current Expo support. Use consistent static SDK imports. The reported Android failure was Auth component registration; the new exported bundle is exercised by a runtime smoke test.
- Profile ScrollView keeps keyboard taps for account buttons. Login/register validate input, show an alert on errors, and update the account immediately on success.
- Home uses the existing transparent compass foreground, leaving the contour background visible outside the compass.
- Visit detail: full-width untruncated title, date/rating summary, separate location card and read-only map, narrative/notes cards, no placeholder gallery.
- Map: preserve the native map while switching standard/hybrid, preserve marker identity by visit membership, and use hysteresis at overview/detail thresholds. Still recreate the map when returning to the tab to retain the prior satellite-return fix. Heatmap stays active at all levels; distant country counts stay enabled.

## Verification

- Android Expo JS export passed with source maps and bytecode disabled for runtime inspection.
- `node tests/firebase-android-bundle.cjs <export>/_expo/static/js/android`: executes the actual Metro-generated Firebase modules, initializes React Native Auth with in-memory persistence, waits for empty session restoration, signs out, then deletes the temporary app. No real credentials or network requests. This specifically checks the previous component registration failure; it does not prove real account creation or Firestore access.
- `node tests/map-navigation.test.mjs`: includes thresholds in both directions to prevent repeated mode changes around a boundary.
- Existing backup and search tests passed; npm clean-install dry run passed.
- Native APK installation, real Firebase login/registration, backup permissions and visual smoothness still require the phone check.

No local visits are migrated or deleted. Main app test login remains separate from the real cloud backup account in Profile.

## Follow-up: automatic protection and profile polish

- A signed-in cloud account now restores missing visits on startup and automatically replaces its cloud snapshot after local additions, edits or deletions. Failed writes retain local data, show `Čaká na pripojenie`, and retry while the app remains open or on its next start.
- The profile exposes the current sync state. Photos remain device-local.
- Registration accepts a chosen display name; Profile can edit it later and also updates the connected Firebase account.
- The active bottom tab uses a gold background with a darker icon and label.
- Long visit titles get the full content width and fit into at most two lines with a bounded font reduction.


## September 22 follow-up (supersedes older UI descriptions above)

- Home counters are centered and larger. Countries opens a sorted country/count list; selecting a country filters Trips. The separate map action fits all visited locations and country label points without changing satellite mode.
- Home now reads the global cloud sync state. Logged-out/local users see an account prompt; signed-in users see saving/pending/saved status. Photo backup is still not implemented; background execution while the app is closed is not promised.
- Visit dates accept `D.M.YYYY` or ISO and have an inline calendar. Validate actual days and leap years. New records use the device's local date/time, not UTC. Time is optional (`Čas nepoznám`); old visits retain unknown time. Date and visit time determine chronology; entry creation remains separately available via `Posledné pridané`. Unknown times sort after timed visits within a day in newest order, then entry creation breaks ties.
- `visitTime` survives local updates, cloud snapshot export and restore. Existing backups without it remain readable.
- Rating/location sort options replaced by recently added and title A–Z. Country filter can be cleared.
- Form/detail wording is now `Popis návštevy` and `Poznámky`.
- Android form uses resize/keyboard avoidance and scrolls the focused input above the keyboard; map dimensions stay stable while typing. Requires device verification on Xiaomi.
- A saved/geocoded country now wins over simplified country outlines; nearby-place lookup restricts to the local country. A searchable country selector lets users correct old incorrectly stored countries (including Kéked) without moving coordinates. No silent bulk rewrite of historical records.
- Added Expo-compatible `expo-splash-screen` config plugin using the existing transparent compass. Native prebuild verified `windowSplashScreenAnimatedIcon` points to the generated compass asset and `adjustResize` is present. JavaScript/export validation cannot confirm device startup visuals.

### Verification

Date/calendar/order/backup-roundtrip tests, backup service tests, map navigation/border tests, Android Metro export and isolated Android prebuild. Package lock changes consist only of the splash dependency and root dependency entry. No EAS APK was built here; EAS account authentication is required on the user's PC. Keep the existing Android application ID and signing key to update in place.

### Remaining notes

- Cross-tab swiping remains a proposed interaction, not enabled globally: map pans and Trips row actions must retain their gestures. Prefer a future dedicated header swipe zone after usability testing.
- Follow-up audit: cloud snapshot sync still needs robust conflict/delete semantics across devices and account-switch isolation before production release. This update does not replace it with a full synchronization engine.
- Premium wishlist, photo backup/gallery, sharing, translations and server-controlled admin/Premium access remain in the product roadmap.

References: https://docs.expo.dev/versions/latest/sdk/splash-screen/ and https://www.geonames.org/export/web-services.html

## Real accounts and durable automatic sync

Replaced the active mock login with Firebase email/password plus a labelled guest
mode. Preserved the existing guest notebook and cloud backup format. Each account
now has separate local storage; old local visits require an explicit confirmed
import. Added persistent three-way merge, deletion propagation, conflict recovery
copies, retry/foreground polling and a single-flight uploader that retains edits
made during requests. UI shows pending/error/confirmed states and last server save;
logout warns about unconfirmed changes. The Profile name editor uses the same real
account. Photo backup remains excluded and labelled. See CLOUD_BACKUP_SETUP.md for
migration and device checks. Existing Firebase rules and native build configuration
are unchanged; no prebuild/clean is needed for these JavaScript-only changes.

## Visit photos and photo cards

Added durable, resized local visit photographs with thumbnails, cover selection,
removal, full-screen gallery and single-photo system export. Home/Trips show photo
cards when photo access is available; otherwise retain text cards. Private preview
APK unlocks testing; production requires server-issued premium/admin claims.
Existing photos remain accessible in detail without an active entitlement.
Firebase snapshots still exclude images and UI explicitly says photos are local
only. Google Drive OAuth/transfer/restore is the next separate integration; see
PHOTO_FEATURE.md. Added Expo image manipulation/sharing dependencies and direct
filesystem/constants dependencies; existing Android project can use autolinking.

## Prevent false concurrent-edit copies when adding photos

Gallery-only updates now retain the shared visit's updatedAt timestamp. Three-way
conflict comparison checks portable user content instead of creation/update times;
serialization also normalizes coordinate map key order. Regression tests cover
photo-only changes with timestamp/key-order differences and simultaneous real
remote text edits, retaining local photos without an unnecessary duplicate. Real
content conflicts continue to preserve both versions. Existing conflict copies
are not automatically removed because they may contain distinct user data.

## Swipe through full-screen visit photos

Replaced the single full-screen image with a horizontally paged FlatList, opening
at the tapped thumbnail. Swiping updates the counter and the photo selected for
export; Previous/Next buttons scroll the same pager. Pages use the measured safe
viewport size and only a small window of images is rendered. No new dependencies.
JSX syntax was checked; physical Android gesture behaviour remains a device check.
Google Drive owner-side OAuth prerequisites are in GOOGLE_DRIVE_SETUP.md; photo
upload/restore remains unimplemented and is not claimed enabled by this change.


## Google Drive photo backup (2026-09-23)

- Added local Android Expo module using Google AuthorizationClient, appdata-only
  scope, account-pinned reauthorization, Wi-Fi detection and SHA-256 namespaces.
- Profile connection, account-specific settings, automatic all-tab foreground
  backup and explicit non-destructive restore. No OAuth secrets/tokens in storage.
- Persistent upload journal; checksum-based blob reuse; complete album publication;
  per-device manifests; integrity-checked temporary downloads and atomic photo-only
  restore that preserves existing galleries and never revives deleted visits.
- Updated photo/text backup UI wording and documented real-device acceptance and
  limits (no suspended-app worker, remote deletion, partial-gallery repair yet).
- Service regression tests, notebook restore tests, native autolinking and Android
  Metro/Hermes export passed. Full APK and real Google Drive still require testing.


## Cold-start crash hotfix (2026-09-23)

- Reproduced a synchronous DriveBackupProvider render error with account=null and
  saved=null: both optional UIDs were undefined, so equality passed and accessing
  saved.config threw TypeError before the first screen rendered.
- Require a nonempty active UID before treating settings as loaded. Cold start,
  signed-out and guest states now expose config=null and ready=false.
- Regression test starts without a Firebase account, restores the account, runs
  existing backup/isolation checks, and signs out again. The original code fails
  this test; the fix passes. No local data, signing or OAuth configuration changed.
- Recorded the request to add the app name alongside the compass on startup.


## Native splash wordmark (2026-09-23)

- Retain compass and sand background; add TravelLog in brown/ochre using Android
  12+ `android:windowSplashScreenBrandingImage` (200x80 dp vector drawable).
  Text is outlined and has a transparent background. No runtime font loading,
  timers, additional launch activity or authentication changes.
- Expo plugin registered before expo-splash-screen because mods run in reverse
  registration order; Expo introspection confirms branding survives generation.
- Existing local signed projects use `node scripts/apply-splash-branding.cjs`:
  updates matching splash themes and copies drawable only. Verified twice against
  normal/v31 fixture themes; existing app theme, icon and signing file preserved.
- SVG preview inspected; physical Android splash layout still needs device check.
- Second-phone Drive recovery remains deferred, explicitly not marked verified.


## Centered startup mark and Premium wishlist (2026-09-23)

- Replace bottom splash wordmark with one centered, mask-safe vector stack.
  Existing native-project script still preserves Gradle/signing configuration.
- Add wishlist accessible in Home and Map. Save a selected place, edit text,
  search, reopen its map location, remove, or convert into a completed visit.
  Conversion retry reuses a stable visit ID. Planned items stay outside stats.
- Account-scoped durable local storage; owner-only Firestore documents with
  tombstones and transactional latest-change merging. App-wide foreground sync.
  Read/remove/convert remains available without Premium; private preview unlocks
  creation/editing. Production access uses the existing premium/admin claims.
- Firebase rule deployment is a separate required user step (WISHLIST.md).
  No billing integration or second-phone recovery acceptance claimed.
- Regression tests cover storage failure, account switches, offline deletion,
  access gates, foreground sync, conversion retries. Android Hermes export passed.


## Quieter actions and more content space (2026-09-23)

- Wishlist: one filled add-place action; per-card map link, outlined visited action
  and accessible overflow menu for edit/remove (deletion still confirmed). Close
  and manual sync move to labelled 44 px icon targets. Editor cancel is a text action.
- Map: visit and wishlist actions share one row with distinct filled/outlined
  styles, flexible equal widths and wrapping labels. Existing safe-area tab bar
  is unchanged.
- Trips: title/add/search/sort/country controls live inside FlatList's scrolling
  header, without sticky indices or nested ScrollView. Country filter has 16 px
  separation from Add Visit. Selecting a different country resets list offset.
- Profile: three collapsed settings sections with visible short backup statuses;
  account setup starts expanded for guests. One section opens at a time. Folded
  forms stay mounted to preserve drafts/operations; accessibility hides their
  children. Sync providers remain app-wide. Secondary backup actions use outlines.
- Android Hermes export verified; physical phone layout still needs acceptance,
  especially enlarged font sizes and narrow displays. No dependency, native,
  Firebase rules or storage schema changes in this UI update.

## Persistent Premium map action and planned-place markers (2026-09-23)

- Chcem navštíviť is shown whenever Premium/test access is active, even without
  a selected coordinate. With no point, it enters explicit pick mode; map/POI/
  search selection then opens the editor. Press again to cancel pick mode.
- Wishlist entry now uses the shared surface/border/brown palette, bookmark icon,
  count and a minimum 44 px touch target. Existing saved places remain accessible
  without Premium, as before.
- Extra task: map displays planned places with outlined star markers, clustered
  at intermediate zoom and hidden in country overview to avoid the previously
  reported map clutter. Co-located wishes open a chooser. Saved-point selection
  preserves wishlist ID/notes when editing; it does not create a duplicate wish.
  Planned places remain excluded from visit heat and statistics.
- Actual MapScreen behavior checked with mocked native hosts: initial action,
  cancel/retry pick, POI editor, overview/nearby markers, saved-item reuse and Free
  list access. Existing map-navigation regression checks and Android export pass.
  Native marker appearance and touch handling still need phone acceptance.

## Year navigation, Moje sny in Trips, unified Home mark (2026-09-23)

- User explicitly selected jumping through the full visit list, not year filtering.
  Timeline spans oldest activity year to current year, displays year continuously
  at the thumb while dragging and jumps on release, keeping all matching visits.
  Gaps go to the next available year in list order with an explanatory message.
  Nonchronological sorting switches to newest; country/text filters stay active.
- Year headings make continued browsing across years clear. Timeline remains in
  the scrolling header. Deep FlatList jumps retry estimated offsets until cells
  are measured, with bounded retries; manual list scrolling cancels pending jumps.
- Trips gains Visits / Moje sny sections; dreams content is embedded, not another
  bottom tab. Home shortcut opens that section. Map list button is removed while
  Premium add/pick action and planned markers stay available.
- User-facing Wishlist text renamed to Moje sny. Existing storage keys, cloud
  paths, entitlement policy and saved data are unchanged.
- Home uses the same outlined compass/wordmark artwork as the approved splash,
  tightly cropped with transparent background. Slogan retained with 12 px spacing.
  PNG generation source is scripts/generate-home-brand.cjs; font license retained.
- Actual component harness checks slider live feedback and release-only commit,
  year jumps without filtering, retry cancellation and section switching. Existing
  map/wishlist regression checks and Android Hermes export pass. Physical-device
  gesture and long-list layout acceptance remain to be checked in the signed APK.

## Timeline copy and section-switch styling (2026-09-24)

- Remove the instructional sentence above the year axis and the routine successful
  jump caption below it. Keep year labels/live thumb feedback and screen-reader
  announcement; exceptional empty-year/jump-failure information remains available.
- Style Visits / Moje sny like the existing Map / Satellite control: rounded
  buttons, brown selected background, neutral inactive background, no underline.
- Scrollbar appearance was not customized in these changes; leave native scroll
  indicators unchanged per the user's instruction. The earlier layout moved
  controls into the list header but did not set indicator styling.
- Existing year-navigation component regression check passes.


## Trips action-style sections and counts (2026-09-24)

- Match Visits / Moje sny to the map's add-visit / planned-place action pair:
  equal flexible widths, 10 px gap/corners, 48 px minimum touch height, filled
  active brown button and outlined surface inactive button. Labels can wrap.
- Small additional improvement: show total visit and dream counts in the section
  labels. Counts describe the entire section, independent of visit search/country
  filters. Pending dream loading displays an ellipsis rather than a misleading zero.
- Year-navigation/section-switch regression check passed; no native dependencies
  or storage changes. Phone visual acceptance remains to be checked.
