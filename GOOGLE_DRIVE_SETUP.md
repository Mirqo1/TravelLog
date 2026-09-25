# Google Drive photo backup — owner-side setup

Status: Android authorization, foreground automatic uploads and explicit photo
restore are implemented on `fix/trip-entry-safe-area`. A NEW native APK is required.
Real OAuth/upload/second-phone restore still need device acceptance testing.
The owner confirmed Drive API enabled, Android client created, and appdata scope saved.

## Project

Use the existing Google Cloud project `travellog-80759` used by Firebase.
Enable Google Drive API:
https://console.cloud.google.com/apis/library/drive.googleapis.com?project=travellog-80759

Open Google Auth Platform:
https://console.cloud.google.com/auth/overview?project=travellog-80759

If not initialized, configure app branding (TravelLog, support/contact email), an
External audience for personal Google accounts, and Testing mode. Add the Google
accounts used on the test phones as test users. Do not publish to production yet.
For the intended private app-data backup, add this permission in Data Access:
`https://www.googleapis.com/auth/drive.appdata`
Do not request access to all Drive files just for backup.

## Android client

Create an OAuth client of type Android under Google Auth Platform → Clients.
Name: TravelLog Android preview
Package: `com.miroslavu19.travellog.preview`

SHA-1 from the EAS keystore previously downloaded and used for the working APK:
`3E:D2:18:57:90:65:00:7B:BB:CA:65:83:6A:25:5F:8B:51:94:A0:96`

If signing has changed, use the current APK certificate fingerprint instead.
The native AuthorizationClient implementation will use the Android client binding;
additional client types should only be created if the selected SDK actually needs
them. Never embed an OAuth client secret or a service-account private key in an APK.
The existing Maps API key is not a replacement for user authorization to Drive.

## Behaviour and limits

- Profile → Photographs / Google Drive → Connect opens the native Google consent
  flow through `AuthorizationClient` (Play Services Auth 22.0.0). Android OAuth
  binding is sufficient: no Web client, client secret, or service account needed.
- After consent, Drive `about.user.permissionId` is verified and stored with email
  under the Firebase UID. Reauthorization pins the chosen account and rejects a
  changed permissionId. Users can disconnect and explicitly choose another Drive.
  The Firebase login and Google authorization are separate flows.
- Only `drive.appdata` is requested. Tokens live only in memory; Play Services
  reacquires them. File and manifest namespaces use SHA-256 of Firebase UID.
- Default Wi-Fi only applies to automatic uploads AND manual upload/restore.
  Small authorization/account requests can use any connection. Toggle off to
  allow mobile data. Photos consume the user's Drive quota, not Firebase Storage.
- Automatic checks run after gallery changes, foregrounding, and every 60 seconds
  while open, from every tab. This is NOT an Android scheduled background worker;
  killed/suspended apps resume work on next launch. No unattended login prompts.
- The persisted notebook is the durable pending queue. A per-UID/per-Drive journal
  records only completed album fingerprints and a stable device ID. A retry finds
  existing JPEG blobs by checksum, and publishes an album only after all uploads
  pass server MD5/size verification. Transfer timeouts and account changes stop
  further work. Already-started server requests may finish for the original UID.
- There is one replaceable album manifest per visit per device. Different devices
  cannot overwrite each other's manifests. Restore selects the newest server
  modification time for each visit, preserves ordering, verifies size/MD5, writes
  via a temporary file, and attaches the complete gallery atomically. It never
  recreates deleted visits or changes text/timestamps. Text visits must first be
  restored by the existing Firebase sync. No historical album selection UI yet.
- Explicit restore fills only visits with EMPTY galleries. Existing galleries
  (including partially missing files) are skipped, not merged or overwritten.
  Interrupted restores can be rerun; verified downloaded files are reused.
- New uploads require Premium/admin or this preview app's test access. Connecting
  and restoring existing backups remain available without Premium.
- Images already removed from an album remain as backup blobs. No automatic
  remote deletion or cross-notebook local garbage collection in this release.
  Disconnect stops this installation's transfers and preserves data; it does not
  revoke Google's app grant or delete the hidden backup. Google account settings
  can revoke the grant. Profile avatars and legacy URL/string images are excluded.

## Local Windows build (existing signed native project)

Do not run `expo prebuild --clean`: keep the local signing block and credentials.
The local Expo module under `modules/travellog-drive` is discovered automatically
by the existing Expo Gradle autolinking setup. No npm dependency changes this time.

```bat
cd /d C:\Users\ulicny\TravelLog
git pull --ff-only
set "JAVA_HOME=C:\Users\ulicny\Tools\jdk-21"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"
cd android
gradlew.bat :app:assembleRelease
```

Install `android\app\build\outputs\apk\release\app-release.apk` as an UPDATE.
Do not uninstall the current app or delete credentials/local photo files.
If pull reports local changes, preserve them before proceeding.

## Verification and phone acceptance

Automated: actual Drive service with network/storage/native doubles covers
interrupted upload, idempotent retry, Wi-Fi/offline gates, Drive identity mismatch,
account switching, quota/revoked access, checksum failure and safe restore.
Actual local notebook tests cover atomic photo restore and concurrent edits.
Android Metro/Hermes export and Expo module discovery checked. Play Services AAR
22.0.0 API symbols inspected. A full native build/real Google consent/Drive upload
cannot be claimed tested in this workspace.

On the first phone connect Drive, add two photos, wait for confirmation outside
Profile, restart and check no duplicate uploads. Disconnect network during upload,
retry, and check quota/revocation messages if applicable. On a SECOND phone sign
into the SAME Firebase account, wait for text visits, connect the SAME Google
account, then Restore photographs. Check cover order and full-size export. Do not
uninstall the only copy to simulate loss before this acceptance test succeeds.

Official references:
- https://developer.android.com/identity/authorization
- https://developers.google.com/workspace/guides/create-credentials
- https://developers.google.com/workspace/drive/api/guides/appdata
