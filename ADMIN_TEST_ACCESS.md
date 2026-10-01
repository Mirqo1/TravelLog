# Admin and test accounts

Profile → Version testing lets private-preview users and Firebase users with a
strict boolean `admin` or `tester` claim choose Automatic / Free / Premium.
All consumers share one AccessProvider: photos, visit tags, share cards, My dreams
and new Drive photo backups switch together without remounting the notebook.
The selected simulation is local to the device and notebook; it persists across
restart. Account changes load their own selection. Free keeps existing content
available for viewing/removal/restoration; it does not delete data or change billing.
Automatic retains the previous preview/paid/admin entitlement. Tester alone is
Free in Automatic. A normal production account cannot enable testing by editing
its profile, storage or passing a local mode value. Claims refresh on foreground
and through Refresh access. Revoked roles invalidate their stored override.

This is a test control, not a payment service or an admin panel for reading other
users' data. Existing owner-only Firestore rules stay in place. Production purchase
verification and backend enforcement for future paid operations are still pending.

## Current preview APK

No Firebase configuration change is needed for testing. Build the updated preview
APK and open Profile → Version testing. You can use your existing login; no shared
password or pre-created admin account is bundled in the app.

## Assign a role in the production app

1. Firebase Console → Authentication → Users: copy the UID of the existing
   account you intend to authorize. Do not use the email as the UID.
2. Project settings → Service accounts → Generate new private key. Keep the
   downloaded JSON outside the repository, e.g. `C:\Users\ulicny\Private\travellog-admin.json`.
   Do not send it in chat, put it in EXPO_PUBLIC variables, or copy it into the APK.
3. From CMD, after pulling this change:

```bat
cd /d C:\Users\ulicny\TravelLog
npm install --prefix tools\admin
set "GOOGLE_APPLICATION_CREDENTIALS=C:\Users\ulicny\Private\travellog-admin.json"
node tools\admin\set-role.cjs travellog-80759 REPLACE_WITH_FIREBASE_UID admin grant
set "GOOGLE_APPLICATION_CREDENTIALS="
```

The script verifies the credential's project before changing the UID's claim;
it preserves paid Premium and unrelated claims. Substitute `tester` for `admin`
for a limited testing account. `tester` cannot manage other users and is Free
in Automatic. `admin` is Premium in Automatic. Both can simulate either plan.
A trusted service account grants the roles; the mobile app never grants them.

4. In the app sign in to that account and return to the foreground to refresh.
   A newly granted role needs an internet connection. Use Refresh access once
   the testing section appears.
5. To revoke, use the same command with `revoke` instead of `grant`. Remove both
   claims if both were granted. Revocation takes effect after token refresh;
   the preview package remains a test build regardless of claims.

The SDK in `tools/admin` is a separate trusted tool, not an app dependency.
Role provisioning has not been executed against the live Firebase project here:
no service account credential or target UID is available in this workspace.

## Checks and phone acceptance

`node tests/access.test.mjs` exercises shared propagation, saved modes, account
switches, denied local overrides, storage errors, and stale/revoked claims.
Run existing language, wishlist, photo and Drive checks and Android JS export.
On phone choose Free then Premium: ensure new photos, dreams and share-card access
switch immediately; existing photos and visits must remain. Restart and switch
accounts. Production claims and native behavior still need device acceptance.
