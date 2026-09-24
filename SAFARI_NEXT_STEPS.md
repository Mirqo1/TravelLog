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

## Future idea — Premium community recommendations nearby

Status: idea recorded at the user's request; do NOT implement yet.

- Preserve the app's offline-first personal diary/travel journal experience.
- Optional online Premium feature: recommend places based on TravelLog users'
  ratings, rather than Google reviews.
- Proposed eligibility: at least 10 distinct people have rated the same place
  and its average rating is strictly above 4.5 out of 5. These are initial example
  thresholds to finalize when designing the feature.
- Trigger: a Premium user is online and logs a visit nearby. Show an unobtrusive
  in-app suggestion such as “Používatelia odporúčajú navštíviť v okolí toto miesto”.
- Offline diary entry must continue working without recommendations or a network.
- Later design decisions: what counts as nearby, reliable shared place identity,
  one rating per person/place, consent to contribute ratings while keeping diary
  notes/photos private, abuse resistance, and frequency/dismissal of suggestions.
  These are open questions, not approved implementation requirements.


## Next build — match Home branding to the approved splash

User request: Home compass + TravelLog should match the approved centered splash
mark in appearance, proportions and compass-to-wordmark spacing. Keep the slogan
below it, with balanced consistent spacing; a more compact header is welcome.
Reuse the visual artwork where practical, but avoid carrying the splash's large
transparent masking margins into Home. Preserve safe-area clearance.
Status: queued for the next implementation/build; not implemented in this note.

## Trips year timeline — proposal under discussion

User idea: a horizontal year axis above Trips, from the earliest visit year on
the left to the current year on the right. Drag a thumb to move to visits by
actual activity date, not creation/logging date. Display the year at the current
finger/thumb position live while dragging.

Suggested behavior to discuss before implementation:
- Compact track, larger invisible touch target, snapping to whole years and a
  live year bubble above the thumb. Allow tapping the track as well.
- Year selection filters the visits to that year; an explicit All years option
  restores the full list. This is a proposed alternative to jumping through a
  long list, not yet the user's approved choice.
- Combine with country and text filters; clearly indicate years with no matching
  visits rather than silently switching to a different year.
- Axis scrolls away with the Trips header, preserving the already accepted
  content-first scrolling behavior. Handle a single-year history and no visits.
Status: discussion only; do not implement until behavior is agreed.

## Future naming/navigation — wishlist

User wants to rename Wishlist to something like “Moje sny”; wording is tentative.
Its current button placement in Map is not satisfactory and should be relocated.
A possible destination is a Visits / Moje sny switch within Trips, sharing search
and avoiding an additional bottom-navigation tab. This is a suggestion, not an
approved placement. Defer rename/relocation until the final design is agreed.

## Implemented follow-up — Home, year jumps and Moje sny

The user rejected year filtering and approved jumping within the complete list.
The timeline now navigates by activity date: oldest year left, current year right,
live thumb/year feedback, release to jump. Other years remain accessible by normal
scrolling. Gaps go to the next available year in list order; country/text filters
remain active. Non-date sorting switches to newest when using the timeline.
Home reuses the approved splash mark with tight transparent bounds and retains
the slogan. Moje sny is the second section in Trips; its Map header shortcut is
removed. Storage paths remain unchanged. This supersedes the earlier unapproved
filtering suggestion. See REVIEW_FIXES.md for checks and device acceptance.
