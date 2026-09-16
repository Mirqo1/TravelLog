# Manual account backup – activation and verification

The app still opens the existing local notebook through its legacy test login. A separate **real Firebase email/password account** in Profile protects manual visit backups. This is an additive migration step: enabling Firebase does not change the current local notebook ID, erase its records, or silently upload them. It is not automatic multi-device synchronization or the final app-wide authentication flow.

## Project setup

1. Open https://console.firebase.google.com/ and select/add Firebase to the intended TravelLog Google Cloud project.
2. Authentication → Sign-in method: enable Email/Password. Do not use a password entered into the old mock login as proof of an existing account; register a real account in the backup panel.
3. Create Cloud Firestore in the appropriate location, using production rules. Publish the repository's `firestore.rules` in the Rules tab. Existing rules are extended with owner-only `/users/{uid}/backups/notebook` access. Clients cannot grant themselves admin/premium via the user profile, nor transfer a legacy place to another user.
4. Project settings → General → Your apps: register a Web app for the Firebase JS SDK (no Hosting required). Copy the four public configuration values below into EAS's **preview** environment. Do not use a service-account private key.

```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

5. Build an updated APK and install over the existing application. The Firebase settings are embedded at build time. Until all four values exist, the backup panel clearly says it is not activated.
6. Profile → Account and backup: register, then save a backup. Confirm the target email and count. On another phone, sign into the same backup account and restore. Do not uninstall the only device containing original visits during this test.

## Behaviour and limits

- Only the user who owns the Firebase UID can read or write that account's backup. No automatic upload; saving and restoring have explicit confirmations.
- One replaceable snapshot holds portable visit text, dates, coordinates, ratings and original IDs/timestamps. The app rejects a payload exceeding a conservative 700,000 URI-encoded characters before Firestore's 1 MiB document limit. A larger production store should use versioned per-visit documents.
- A Firestore transaction compares the revision read before confirmation. If another device changes the backup, the operation fails instead of silently overwriting it.
- Restore adds missing IDs only. Existing local visits (including edits and photos) win on collisions; restore never deletes local visits. A pre-restore copy remains in local storage. Repeating restore is idempotent.
- Photographs, profile photos and premium entitlements are **not** included. The UI explicitly says this. Photos need managed Storage upload/download before cross-device guarantees are possible.
- New notebooks are empty; old sample records already saved are left alone. Malformed local data is no longer replaced with demo data on a read error.
- App logout also signs out the backup account. Disconnecting only the backup account preserves the local notebook.
- Language and final branding are deliberately independent of account identity. Keep the installed Android package ID when renaming so updates can preserve local data.

## Checks

Completed: `node tests/backup.test.mjs` checks validation, duplicate rejection, local-photo preservation, repeat restore, concurrent restore/add, and corruption handling. Firebase React Native Auth initialization was exercised with an in-memory storage adapter. Android JS export succeeded.

Still required against the owner's Firebase project: real register/sign-in/password-reset, process-restart persistence, two-device save/restore, offline failure, transaction revision conflict, and Firestore rules rejecting unauthenticated/cross-user access and self-granted admin/premium. No live project deployment or device authentication test has been performed in this change.

## Next authentication step

After successful backup/restore, replace the mock app login with the verified cloud account and migrate a chosen local notebook explicitly. Add email verification, account deletion, photo Storage, then production entitlement checks and admin-only preview controls. Do not infer ownership from a mock email or ship an unrestricted premium switch.
