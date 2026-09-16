# TravelLog: Android preview

This branch prepares a standalone APK for the Add Trip and Map checks.
It does not fix Expo Go itself. The minimal map test failed in Expo Go
57.0.7 and 57.0.9 but worked in a standalone APK with the user's key.
The complete TravelLog APK still needs to be built and tested.

## Configuration

- Maps uses the documented androidGoogleMapsApiKey plugin option.
- EXPO_PUBLIC_GOOGLE_MAPS_API_KEY supplies the native Maps plugin key.
- The previously committed key is removed from app.json (not from Git history).
- EAS project metadata added to app.json is preserved by the dynamic config.
- Android preview package: com.miroslavu19.travellog.preview.
- Expo owner: miroslavu19.
- The installed Google Mobile Ads native library requires an App ID even
  though the active navigation does not display ads. Its plugin uses Google's
  Android sample App ID for this preview. This is not a production ad setup.
- Dependencies and lockfile are unchanged.
- This preview is not configured for store release or iOS.

Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in the EAS preview environment with
Sensitive visibility. EAS must receive it for both config resolution and the
remote build. A local ignored .env file alone is insufficient. Do not paste keys into logs
or pull request comments. Before distribution beyond this test, restrict the
key to the actual package and signing SHA-1.

## Windows CMD

Run in the checkout of this branch (not MapTest57):

```cmd
npm ci
npx eas-cli@latest init
npx eas-cli@latest env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --environment preview --visibility sensitive
npx eas-cli@latest build --platform android --profile preview
```

Create/link a new TravelLog project under miroslavu19, not map-test-57.
EAS init should add extra.eas.projectId to app.json; keep that change locally
for subsequent builds. If asked about a new Android keystore, generate one.
Do not merge the branch before checking both maps on the device.

Install the completed APK directly on Android. Expo Go and a Metro server
are not required. This separate package has its own storage; Expo Go's
locally saved trips are not automatically transferred.

## Device checks

1. Open Add Trip: confirm streets and place names appear.
2. Tap a location: confirm the marker and form coordinates update.
3. Save a test trip, then open Map: confirm the map and trip overlay appear.
4. Restart the APK and verify the saved trip persists.

Map currently draws circles instead of clickable trip markers. That existing
UI issue is outside this configuration change.

## Validation

Configuration regression checks cover environment-key resolution, existing
and missing plugin entries, preservation of EAS metadata and unrelated plugin
options, and the missing-key Android build error. APK compilation and device
testing of the complete app remain required.
