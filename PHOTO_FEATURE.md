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

Google Drive photo backups are now implemented separately from Firebase text
sync. Enable them in Profile after installing the new native APK. See
[GOOGLE_DRIVE_SETUP.md](GOOGLE_DRIVE_SETUP.md) for OAuth setup, behaviour, limits,
Windows build commands and the required two-phone acceptance test. Local photos
remain readable without Drive. Profile avatars are still local-only.

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
