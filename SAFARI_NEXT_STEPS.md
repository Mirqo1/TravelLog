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
4. Sharing: an initial Premium/preview card is available in visit detail: choose a local photo (or no photo), optionally show place/date, inspect the image, and share a JPEG using the system sheet. Private notes, rating, coordinates and Google map/review content are excluded. The user chooses the receiving app and completes posting. A destination app must support receiving JPEG files; Strava and other networks might not. Phone visual acceptance and production entitlement enforcement remain pending.
5. Admin/test access implemented: shared Free/Premium/Automatic simulation for private preview and trusted admin/tester claims. See ADMIN_TEST_ACCESS.md. Live role provisioning and phone acceptance pending; production billing remains separate.
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


## Visit tags and Drive cleanup follow-up

Implemented Premium/preview visit tags: eight labels, 30 characters each,
comma-separated input, compact detail labels and existing Trips search.
Labels remain readable/searchable after expiry and survive ordinary edits,
local persistence and text backup/sync. Legacy backups remain compatible.
Entitlement gate follows the photo UI; production server enforcement is pending.

Drive cleanup: Profile now previews and can delete photo uploads older than seven
days only if no album manifest on any device references them. It rechecks before
each deletion. This helps interrupted uploads but does not yet remove photos
retained by an old device's album manifest after a photo or visit is deleted.
Future work: synchronized photo deletion across devices, then a full safe photo
reclaim flow. Manual clearing of all hidden data via Drive / Manage apps remains
a complete backup reset; disconnect devices first to prevent re-upload.

Second-device simulation now tests separate device journals and real album
restore in the Drive service double. Physical second-phone acceptance, including
Firebase visits, Dreams and restored photos, still needs user verification.

Existing Premium claims are forcibly refreshed on foreground activation; UI
continues to use preview-package test access. Production billing, trusted claim
issuance and server-side enforcement for new premium cloud operations remain
unimplemented. Existing photos now remain visible without Premium.

## Share card implementation (2026-09-28)

From a visit detail, Preview/Premium can open a photo-based share card, choose
one existing device-local photo or no photo, and choose whether the place and
visit date appear. Share action captures ONLY the preview card as a JPEG with
react-native-view-shot and opens expo-sharing. It excludes map/review content,
private notes, rating and coordinates. No automatic posting or upload takes
place. `react-native-view-shot@5.1.0` is an Expo SDK 57 bundled version; run
`npm ci --include=dev` after Git pull before the native Android build. Physical
Android preview and recipient-app behavior still need acceptance testing.

Share card visual revision (2026-09-29): remove the border and rounded card
corners. The selected photo fills the complete 4:5 export; all card information
sits in a translucent dark panel at the bottom. The brand row uses the exact
compass logo artwork instead of a star. The photo-free variant retains the same
layout on a plain safari-coloured canvas. User photo, text toggles and privacy
defaults are unchanged. Device visual acceptance is still pending.

Share interaction revision (2026-09-29): the selected photo can be dragged
within its 4:5 preview to position the exported crop. An optional accompanying
message is entered outside the card. On Android an image and nonempty message
are passed together to the system share chooser; an empty message still uses
expo-sharing's image-only path. The receiving app decides whether it accepts
and displays the text. This native change requires a rebuilt Android APK;
physical crop, share-sheet and recipient-app acceptance remain pending.

Follow-up after phone feedback (2026-09-29): the original drag implementation
showed a beige area instead of the photo. The crop is now rendered as a temporary
JPEG before the preview can be shared; a failed render or load blocks sharing.
Release the drag to update the image. Messenger ignored the attached text even
though the Android intent included EXTRA_TEXT; the native share path now also
copies that text to the clipboard so the user can paste it into Messenger.
Receiver behavior remains outside the app's control. These changes require a
new native APK and phone acceptance. The trial visual redesign of Trips was
reverted after user feedback; the prior screen style is restored.

Second phone feedback: processing every crop before displaying any photo caused
a beige-to-photo flash, while the drag gesture did not visibly move the image.
Keep the original `resizeMode="cover"` image directly in the card, as in the
last working preview, while a prepared crop loads invisibly on top. The crop
appears only after its image load event. A direct enlarged image above the base
shows live drag movement; touch capture prevents the parent scroll view from
stealing the gesture. Share remains disabled until the processed crop loads.
The already used gallery thumbnail is rendered below the original full image,
which replaces it only after loading, to avoid a beige gap when switching photos.
Physical Android acceptance is still needed for the preview and drag gesture.

Third phone feedback: dragging still did not respond. The empty transparent
gesture overlay was removed; PanResponder now attaches to the card's existing
`collapsable={false}` native view and captures touches before the parent scroll.
Image dimensions also fall back to `Image.getSize` for old photo records. The
UI explains when a photo already has the exact 4:5 card ratio, where there is
no surplus image area to move without zooming. Verify touch on a landscape
photo after the next Android build.

Further sharing ideas from Miroslav: sharing a complete visit would require a
receiver flow and a clear distinction between a read-only copy and a link to
live data, with private notes and photos opt-in. Groups and inviting another
person to a visit require membership/invitation records, access revocation,
Firestore rules, and a photo-sharing design: Drive's hidden app data is private
to each account and cannot grant group members access. Specify ownership,
editing rights, removal, and notification behavior before implementing them.

## Accepted language and navigation update (2026-09-29)

English default and saved English/Slovak selection are implemented in Profile
and on the initial account screen. UI dictionaries are centralized; personal
visit text is preserved. Country labels follow the selected language where
Intl.DisplayNames is available. Additional languages require reviewed translations.

Miroslav confirmed English/Slovak language switching works. Tab-switching swipes were removed at his request after conflicts during phone testing. Normal bottom tab navigation is restored; map, photo, timeline and visit-card gestures remain. See LANGUAGE_AND_NAVIGATION.md for checks.

App renaming is being discussed; choose the name before changing branding.

The unrequested visit-calendar browsing feature was removed at Miroslav's
request. Keep work within recorded requirements; the calendar in the visit form
for entering a date remains the previously approved feature.

Share crop now uses one positioned original image for both preview and capture,
so releasing the finger keeps the chosen offset. Miroslav reports sharing has
been verified. Second-device account/photo restore is still deferred.

## Admin/test access (2026-09-29)

Profile has a collapsed Version testing section with per-notebook saved simulation. All Premium consumers share the same access state. Existing data is preserved. Trusted Firebase role tooling is separate from the app; no live role was granted without a target UID and credential. Production billing is not implemented.

## Deferred final-stage task: broad language support (2026-09-30)

Miroslav approved expanding common world languages, but explicitly deferred implementation until the application name, features, terminology and all UI texts are finalized. Keep the existing English/Slovak support meanwhile.

Use reviewed translation dictionaries bundled with the app for instant offline UI, rather than translating UI live via Google/DeepL. English is the source language. Prepare translations with AI/service assistance, keep terminology consistent, validate missing keys and interpolation, and review layouts, dates and plural forms. Additional right-to-left languages require a separate layout review. Detect the phone language on first launch, allow Profile override and fall back to English. Personal visit names and notes remain as entered. Roll out languages in checked groups; do not claim native-speaker quality without review.

## Approved task: repeat visits to the same place (2026-09-30)

Miroslav approved one place with multiple independent visits. Add a “Navštívil som znova” action to the existing visit detail menu. Open a new visit draft with place name, location and coordinates copied; use editable current date/time, and empty photos, notes and rating. Saving creates a new visit and never modifies the original.

Map/search selection of a previously visited place should unobtrusively show the existing visit count and offer their history while allowing normal new-visit entry. Trips lists visits individually by visit date/time. Map shows one place marker with the number of visits and lets the user select an individual visit from its history. Repeat visits increase visit counts but do not increase country counts. Repeat-visit logging is Free; photo addition follows existing Premium entitlement. Establish reliable place identity to avoid merging different nearby venues or matching solely by name. Keep original visit/photo ownership and synchronization semantics. This records the approved behavior; implementation is pending.

## Repeat visits implemented (2026-09-30)

Visit again is available from visit detail in Home, Trips and Map, including Free. The new editable draft copies only place identity/name/location/country and sets current local date/time; photos, diary text, rating and tags start empty. It saves through addTrip with a new independent ID. Map detailed pins group repeated visits and open a date-sorted history for visit selection. Named POI/search selection and the form show a compact prior-history link. Provider IDs are preserved in storage and portable backups. Legacy matching requires equal normalized name, coordinates within 25m and no country conflict; conflicting known IDs remain separate. Cross-provider IDs are intentionally not assumed equivalent. Existing heat intensity/country totals still count all visits.

Verified repeat-detail add flow, conservative matching, map grouping, independent IDs/photos, another-device metadata restore, existing sync/map/search/year/language checks and Expo Android JS export. Native APK/device acceptance still required. No new dependency or clean prebuild is needed.

## Interactive visit detail map (2026-09-30)

At Miroslav's request the detail mini-map now supports pan, pinch zoom, rotation, pitch and Android zoom controls. Touching the map temporarily stops the surrounding detail ScrollView; final touch release or cancellation restores scrolling. This supersedes the original static-map requirement. Stored coordinates and the marker are unchanged. JS export and existing detail flow/gesture lifecycle checks pass; native phone behavior remains to be checked.

## Safe photo deletion and Drive cleanup (2026-10-01)

Implemented explicit deletion decisions stored atomically with the notebook and published to private Drive app data. Saved gallery removals and deleted visits invalidate their stale album references across updated devices. Empty galleries on new devices are not deletions. Restore and stale-device uploads respect retained decisions; shared blobs referenced by other visits or current local galleries are protected. Deletion sync works in Free as well as Premium, in the foreground after network/Wi-Fi returns. Profile previews count/MB and confirms permanent reclamation; files younger than 7 days remain excluded. No native/dependency changes.

Verified real service flows with simulated Drive, two-device stale albums, interrupted/offline deletion, idempotent retry, shared checksums, malformed records, cancelled accounts, atomic storage failures and restore guards. English/Slovak strings and Android JS export passed. Physical second-phone restore/deletion and native APK acceptance remain pending.

## Whole-visit sharing proposal (pending approval; not implemented)

Keep the existing branded share image. Add a separate whole-visit copy action with a preview and an explicit choice of fields/photos; private notes excluded by default. A recipient gets a snapshot and can choose to save their own visit or a dream, never modify the sender's diary. A portable package of visit JSON and reduced JPEGs avoids developer-hosted photo storage, but requires an import-capable app and a transport that accepts files. Once sent, a copy cannot be revoked. A read-only web link would be easier for recipients but needs separate hosting/storage, access controls, cost limits and a branding/domain decision. Current Drive appDataFolder backups are private and cannot directly serve shared links. Groups and accepted participant invitations are a later step with separate personal photos/notes and explicit access, not automatic exposure of a user's diary. Miroslav requested a proposal, not implementation of sharing/groups in this task.
