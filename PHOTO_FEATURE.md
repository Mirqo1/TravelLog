# Visit photos — first testable implementation

## Included

- Add up to 10 images to a visit from the Android system photo picker. No blanket
  scan of the user's gallery; no camera or video flow.
- Re-encode into a JPEG up to 2000 px on its longest edge; retry at 1600 px with
  stronger compression if necessary. Reject any main JPEG still above 2 MiB.
  Generate a separate 720 px thumbnail. The original selected image is untouched.
- Copy both files into `documentDirectory/visit-photos/`. Persist relative managed
  filenames and dimensions/size, not picker cache paths or image base64 in storage.
- The first photo is the cover; the editor lets the user reorder a chosen photo
  to the front, or remove it from the visit. Changes are committed with the form.
- Home and Trips show a wide cover below the visit title, location and date, plus
  a photo count. Visits without photos have compact text-only cards.
- The detail offers a thumbnail gallery, a full-screen image viewer and system
  file sharing/export. This is export of the photo itself, not the future branded
  visit-summary card for social networks.
- Missing local files show a readable placeholder. Picker/processing errors are
  displayed. Successful images in a partially failed batch remain in the draft.
- Cancelling the editor cleans up only newly imported files not referenced by a
  successfully saved visit. On a storage read error it retains files. Existing
  files may be shared by guest migration/conflict copies and are not blindly
  deleted when detached; cross-notebook garbage collection is future work.

## Premium and testing

`com.miroslavu19.travellog.preview` unlocks adding photos for this private preview,
with a visible test-version label. Other application IDs require Firebase custom
claims `premium: true` or `admin: true`; no client-editable profile field grants it.
No payment flow or production entitlement issuing service is implemented yet.
Without access, photo addition and photo card previews are unavailable, but users
can still view/export all existing photos in detail and remove/reorder them.

## Backup boundary

**This release does not upload or restore photos through Google Drive or Firebase.**
All new photo UI explicitly labels this. Portable Firebase visit snapshots still
exclude photos, file paths, thumbnails and binary data. Syncing edited visit text
preserves the local gallery. A second phone restores text but not these images.
Do not uninstall the only installation containing local photos.

Google Drive remains the agreed next step: user's own quota, not Firebase Storage
paid by the app owner. Before shipping that integration:

1. Enable Google Drive API in the app's Google Cloud project.
2. Configure Google OAuth consent and an Android OAuth client for the exact app
   package/signing SHA-1; supply any required public client IDs to the app build.
   Do not place a client secret or service-account key into the APK.
3. Implement a supported native Google authorization flow requesting only the
   `drive.appdata` scope for a private application data folder. Link a chosen
   Google identity explicitly to the currently signed-in TravelLog account;
   never infer ownership from matching email text.
4. Persist a photo upload/download queue and a manifest relating visit IDs to
   stable photo IDs. Handle account switching, revoked access, quota exhaustion,
   Wi-Fi-only uploads, restart, delete conflicts and interrupted transfers.
5. Test restore on another physical phone before claiming photos are backed up.

Reference: https://developers.google.com/workspace/drive/api/guides/appdata
The Google Drive connector in ChatGPT is not the app's end-user OAuth integration.

## Local Windows build

The existing generated Android project and its release signing configuration can
be kept. New Expo modules are discovered by Gradle autolinking after `npm ci`.
Do not run `prebuild --clean` merely to add these modules: it could remove the local
signing block installed for the EAS-downloaded keystore.

In a new CMD session, set `JAVA_HOME` to the user's extracted JDK 21 and
`ANDROID_HOME` to `%LOCALAPPDATA%\Android\Sdk`, and prepend Java/platform-tools to
PATH. Pull `fix/trip-entry-safe-area`, run `npm ci`, then from `android` run
`gradlew.bat :app:assembleRelease`. If Git reports local changes in package.json,
stop and preserve/merge the local generated script changes before pulling; never
reset app.json or signing credentials to force the update.

## Verification

`tests/visit-photos.test.mjs` tests the real photo service with filesystem/image
processor doubles: size bounds, cover choice, access policy, durable copies,
thumbnail creation, resource release, cache cleanup, import rollback, draft cleanup
and original-file preservation. `tests/account-sync.test.mjs` additionally checks
photo metadata stays local and survives remote text edits/removal. Android Metro
export and Expo native-module autolinking were checked. No physical-device image
processing, picker, full native APK build or Google Drive backup is claimed tested.

Phone acceptance: choose landscape + portrait photos, change cover, save, reopen
and restart app; inspect Home/Trips and full-screen viewer; export one photo; cancel
an edit after adding photos; remove a photo and save; test failed/denied selection;
edit the visit's text through sync and confirm the original local gallery remains.
