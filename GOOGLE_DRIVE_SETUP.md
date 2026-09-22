# Google Drive photo backup — owner-side setup

Status: setup instructions only. Photos are still stored locally; there is no
Drive uploader/restore or Google authorization flow in the current APK.

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

## Implementation still needed after setup

Use Android's supported AuthorizationClient to request user-granted access to
appDataFolder. Associate the authorized Drive identity explicitly with the current
Firebase UID, preserve that binding across restarts, and stop transfers on account
changes. Implement a durable upload queue, stable photo IDs, a restore manifest,
Wi-Fi preference, quota/revocation states and interrupted-transfer recovery.
Test upload and restore on two physical phones before labelling photos backed up.
Existing photos must remain viewable/exportable when Premium expires.

Official references:
- https://developer.android.com/identity/authorization
- https://developers.google.com/workspace/guides/create-credentials
- https://developers.google.com/workspace/drive/api/guides/appdata
