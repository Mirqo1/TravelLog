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
