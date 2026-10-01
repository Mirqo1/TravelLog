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
- Explicit saved photo removal and visit deletion are recorded atomically with the
  local notebook. They are not inferred from an empty gallery on a new phone.
  Immutable Drive deletion decisions are scoped to visit/photo IDs and merged
  across devices. Upload, restore and cleanup ignore obsolete references.
  Deletion sync is available without Premium, while new JPEG uploads stay gated.
  Decisions are retained after cleanup so old albums cannot resurrect photos.
- Foreground automatic sync publishes offline decisions after network/Wi-Fi returns,
  regardless of the selected screen. Other phones apply them on their next check.
  Update all devices to this version; older app builds do not understand decisions.
  Restore still fills only empty galleries and never recreates deleted visits.
- Profile cleanup previews file count and total bytes and asks for confirmation.
  It only deletes completed files older than 7 days with no surviving remote album
  reference or locally saved checksum reference. A shared blob used by another
  visit survives. References are checked again before each deletion; invalid
  albums/decisions stop cleanup. Unchanged decisions are cached by server modified
  time to avoid downloading every historical decision on each foreground check.
  This is eventual synchronization, not a distributed Drive transaction: a device
  editing a gallery at exactly the same moment as cleanup can still need an upload
  retry. There is no guarantee about edits never published from an offline phone.
  Drive files belong to the linked Firebase UID and Drive permissionId. Cleanup
  preserves local images and deletion records. Disconnect stops transfers and keeps
  the backup; it does not revoke Google's app grant. Profile avatars and legacy
  URL/string images remain excluded.

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
account, then Restore photographs. Also check Moje sny and visit tags after
automatic text sync. Check cover order and full-size export. Try the cleanup
preview before deleting anything: photographs still linked to a surviving visit\nmust remain excluded. Remove and save a photo, then verify an old-device album\ncannot restore it. Delete a visit from a phone with no local photos and verify\nits old gallery is excluded. Repeat while offline, then reconnect. Verify another\nvisit using the same JPEG still protects it. Test cleanup also in Free mode. The emulator tests confirm separate device journals and
protection of referenced files; the real second-phone path still needs user
acceptance. Do not
uninstall the only copy to simulate loss before this acceptance test succeeds.

Production Premium enforcement still needs a trusted entitlement issuer and
server checks before selling a subscription. The preview package intentionally
unlocks test features. Firebase UID owner rules and client custom-claim checks
do not alone prevent a modified client from using its own Drive authorization;
there is no server-side Google Drive upload proxy in this project yet. Do not
advertise the current client gate as billing enforcement.

Official references:
- https://developer.android.com/identity/authorization
- https://developers.google.com/workspace/guides/create-credentials
- https://developers.google.com/workspace/drive/api/guides/appdata
