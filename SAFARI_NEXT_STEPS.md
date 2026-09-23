# Safari design and feature decisions

## Implemented in this update

- Shared palette: sand `#F6F0E4`, brown text `#3B2D1F`, accessible dark ochre controls `#8A5A19`, golden accent `#D6A540`. Light contour lines stay behind screen content, not over the Google map.
- One compass design for Home, the launcher/adaptive icon and startup configuration. SVG sources and PNGs are in assets. The Android system splash remains; the template target artwork is no longer configured.
- Distant map: one numbered marker per identified country, anchored to an actual visit near the group centre. Tapping opens that country's visits. Heatmap stays enabled at all zoom levels. Unknown-country visits still appear as points when zoomed in.
- Satellite state: recreate the native map on tab focus and map-type change using the retained viewport and selected map type. Verify on Android after Map → Satellite → Home → Countries.
- Search hint: Big Ben London.
- Trips: single search over all visit text, accent-insensitive and independent of word order. Remove confusing field-selector row; retain explicitly labelled sorting.
- Home recent cards use full content width; remove average-rating summary. Trips list titles have no line limit. Mini-map in visit detail is fixed at 180 px with gestures disabled and Google attribution unobscured.
- Profile photo can be chosen/cropped via system picker and persists locally as a size-limited data URI. It is not cloud-backed yet.
- Real email/password account for manual visit backups prepared separately from the legacy local notebook. See CLOUD_BACKUP_SETUP.md for activation and limits.

## Next product work (not implemented yet)

1. Confirm backup/restore, then finish app-wide real login, explicit local migration and cloud photo storage. Backup/restore should remain available to Free users so their memories are not hostage to a subscription.
2. Central translation dictionaries, English fallback/default, Slovak first additional language; switch in Profile and persist preference. More languages are added as reviewed translations. Arbitrary languages do not appear automatically; place names and personal notes should not be silently translated.
3. Premium visit fields: photo gallery, longer journal, tags; cloud permissions and quotas checked on the server, not just by hiding a button. Existing photos schema already exists but attachments and storage are unfinished.
4. Sharing: render a preview card from the user's photo, name, location and visit date, allow selection of included information, then export/save or open the system share sheet. The user chooses the destination and submits. A destination app must support receiving images; no promise that Strava or every network can accept an automatic post. Do not silently include private notes. Keep Google map/review content out of exported art until applicable terms are checked.
5. Admin/test access: server-assigned admin claim, test-account Free/Premium preview, separate production billing entitlement. No public password or unrestricted premium switch in the app.
6. Google reviews: optional lower-priority enhancement via official Places API; must resolve a Google Place ID (Photon/OSM IDs are not interchangeable), show Google and author attribution and source links, follow ordering/caching/EEA conditions, and budget API usage. Not scraping. Check paid-app terms before putting this specifically behind a paywall.
7. New name: shortlist first, then check domains/store names and relevant trademarks. The current name remains a working title until a replacement is chosen. The compass remains reusable.

## References

- https://developers.google.com/maps/documentation/places/web-service/policies
- https://cloud.google.com/maps-platform/terms
- https://cloud.google.com/maps-platform/terms/maps-service-terms
- https://developer.android.com/develop/ui/views/launch/splash-screen

## APK verification

Check startup/launcher icon, long airport names in Home and Trips, contour contrast, larger system font, five Slovak visits → one country marker, Satellite → Home → Countries, noninteractive detail map and local profile photo after restart. Native APK/device visuals are not verified by the JavaScript export.


## User note — splash branding (2026-09-23)

Implemented: retain the centre compass and add an outlined TravelLog wordmark
in brown/ochre through Android 12+ native splash branding. No second activity,
JS startup overlay, artificial delay or change to account initialization. Final
product name is still to be decided; wordmark source is separate and replaceable.
For the existing signed Android project run `node scripts/apply-splash-branding.cjs`
before building. Fresh Expo prebuilds apply `withSplashBranding` automatically.

## Current next steps (2026-09-23)

- Google Drive: user reports first-phone functionality works. Restore on a SECOND
  phone has NOT been verified; user explicitly deferred that acceptance check.
- Premium wishlist implemented: Home/Map access, separate local account storage,
  automatic foreground Firestore sync, editing/removal and conversion to a visit.
  Firebase rules publication and phone acceptance remain required; see WISHLIST.md.
- Splash placement revised: compass and name form one centered vector stack,
  replacing the earlier bottom wordmark. See SPLASH_BRANDING.md.

