# Languages and tab gestures

The app defaults to English. English and Slovak are selectable in Profile →
App language, or on the initial account screen. The selection is saved on the
device and persists through restart and logout. Changing it does not remount
the account providers or navigation. Visit names, location text, descriptions,
notes, tags and accompanying share messages retain the user's original text.

Translations live in `app/i18n/en.json` and `app/i18n/sk.json`. UI components
subscribe to LanguageContext; async service messages are translated when shown.
Additional languages require a reviewed dictionary and an explicit supported
language entry. Unknown language preferences fall back to English.

Swipe left for the next main tab and right for the previous one. The ends do
not wrap. All tabs support swipes across the existing bottom bar. Home and
Profile also support content swipes; Trips supports its Visits / My dreams
header, and Map supports its title header. Cards in Trips, the year slider,
photo viewers, share cropping and the map keep their existing gestures.
Vertical scrolling, short drags, multi-touch and gestures with an open keyboard
do not switch tabs. The native bottom inset and extra 8px clearance are retained.

Checks: `node tests/language-and-swipe.test.mjs`, existing map, wishlist, share
and year-navigation checks, and Expo's Android JavaScript export. A physical
Android gesture and visual review is still required. No new native dependency
or clean prebuild is needed for this update.

Phone acceptance:
- First launch without a saved setting uses English; select Slovak in Profile.
- Restart and confirm Slovak returns, including tabs, forms and backup messages.
- Switch back to English; check countries and My dreams.
- Confirm personal visit text and photos are unchanged.
- Swipe left/right on the bottom bar, Home/Profile content and Trips/Map headers.
- Check map pan/pinch, card actions, year dragging and photo/crop gestures.
- Check normal vertical scrolling and typing with the keyboard open.
- Check the bottom menu still clears the phone's system navigation bar.
