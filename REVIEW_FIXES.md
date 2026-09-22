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
