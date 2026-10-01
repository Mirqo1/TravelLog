# Whole-visit sharing — first Android file phase

The existing branded image remains available. In visit detail, **Share visit** now opens three choices: image with caption, whole-visit copy, or invitation. This phase transfers a private ZIP snapshot. It does not create a backend group, public web page or shared gallery.

## Send

1. Open an existing visit and choose whole-visit copy or invitation.
2. Review the preview and fields. Date and description are selected initially; private notes, rating and tags are off. Select only the photos intended for the recipient.
3. Send the ZIP through an app that supports files, such as email. Some social apps accept images but do not accept ZIP attachments; use the existing branded image option there.

Whole-visit sending follows the existing Premium share entitlement. Packages contain at most 10 already reduced JPEGs (each at most 2 MiB, at most 2000 pixels per side) and bounded metadata. They contain no Firebase UID, credentials, local photo paths or private Drive links. Photos are not uploaded to developer-owned storage. The receiving transport may store its own attachment. A sent copy cannot be revoked.

## Receive

1. Install the updated Android APK, download the attachment, then open **Profile → Shared visits → Open received visit** and select the ZIP.
2. Review its contents. Opening, closing or declining saves nothing to the diary. The sender name comes from the file and is not a verified identity.
3. To save a visit, explicitly confirm that you visited the place and check your visit date/time. Your own notes and rating start empty. With Premium you can also import the attached photos as independent local copies; Free can preview them and save the text visit.
4. Alternatively, Premium can explicitly save the place to **My dreams**, without visit date, rating or photos.

Invitation buttons say Accept / Decline. Acceptance is local to the recipient's phone: the sender receives no status or notification. Declining disposes the preview but does not permanently block reopening the attachment. Personal copies use the existing account synchronization and private photo backup after they have been saved. Preview alone does not trigger photo backup.

Repeated acceptance of a saved source returns the existing visit without overwriting its personal notes/photos. Source identity survives text backup and restore. This is not a global backend transaction across two disconnected devices; simultaneous independent imports on those devices still rely on existing notebook synchronization. Copies intentionally do not update when the sender edits their original.

## Safety and implementation

- Imported ZIPs allow only manifest.json and photos/0.jpg through photos/9.jpg. Entry names, duplicate entries, expanded sizes, JPEG bounds and SHA-256 checksums are validated. The file picker uses Android's document access grant; no broad storage permission is added.
- Incoming material stays in app cache until explicit acceptance. Saved photos get new managed IDs through the existing JPEG import/compression pipeline.
- Preview cache is removed on close; successful outgoing attachments remain temporarily for the receiving share app. Stale packages are pruned after 24 hours on the next transfer operation.
- File sharing is separate from Google Drive backup. No Firebase security rules or hosted photo storage change is required.

## Verification

Run the focused JS checks from the repository root:

```sh
node tests/visit-transfer.test.mjs
node tests/visit-receive-ui.test.mjs
node tests/account-sync.test.mjs
node tests/backup.test.mjs
node tests/repeat-visits.test.mjs
node tests/trip-share.test.mjs
node tests/drive-backup.test.mjs
node tests/drive-context.test.mjs
node tests/language.test.mjs
npx expo export --platform android --output-dir /tmp/travellog-transfer-export
```

The pure Java extractor can also be compiled with a JDK and run directly:

```sh
javac -d /tmp/travellog-native-tests modules/travellog-drive/android/src/main/java/expo/modules/travellogdrive/BoundedVisitArchive.java tests/native/VisitArchiveTest.java
java -cp /tmp/travellog-native-tests VisitArchiveTest
```

Full Android/Kotlin build and physical device acceptance remain necessary. On the existing local native project, assembleRelease includes the new code in the already autolinked TravelLogDrive module. No clean prebuild or new npm dependency is needed. Test sending a copy/invitation, cancelling the file picker, declining, Free/Premium acceptance, invalid date, repeated import, and opening a damaged or oversized attachment. Update both devices; do not uninstall the current app.

Backend groups, verified invitations, sender acceptance status, shared access/revocation and synchronized galleries are later work requiring a separate backend and access model.
