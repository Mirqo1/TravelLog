# Compass and TravelLog startup branding

The native splash now uses **one centered compass + TravelLog stack**, with the
wordmark immediately beneath the compass. The old bottom branding attribute is
removed. Both elements are vector paths on a transparent background; they fit
inside Android's splash icon safe circle. No artificial delay or second loading
screen is added. Launcher and in-app compass assets are unchanged.

## Existing local Windows project

After pulling the feature branch, run from the repository root:

```bat
node scripts/apply-splash-branding.cjs
cd android
gradlew.bat :app:assembleRelease
```

Use the existing JDK 21 session settings. The script updates only matching splash
XML themes (including qualified variants) and adds the combined drawable. It does
not touch app/build.gradle, signing credentials or local app.json. Repeating it is
safe. Do not use prebuild --clean for this change.

Future freshly generated projects use `plugins/withSplashBranding.js` via
app.config.js. Register it BEFORE expo-splash-screen, as Expo mods execute in
reverse registration order. Introspection verifies the final generated style.

## Artwork

`assets/splash-centered.svg` is the visual source, and `assets/splash-centered.xml`
is its native Android vector equivalent (288x288 dp with a 192 dp safe circle). Both contain outlined paths;
no font is bundled or loaded at startup. Regeneration uses fontTools and
`scripts/generate-splash-wordmark.py /path/to/DejaVuSans-Bold.ttf`.
The glyph attribution/license is in `assets/splash-wordmark-LICENSE.txt`.
The current name is a working title until rebranding is agreed.

Device acceptance: install the signed APK as an update, fully close/reopen the
app and check title placement on the compass screen in light/dark system mode.
Warm resumes may skip the splash. No uninstall or data clearing is needed.

Reference: https://developer.android.com/develop/ui/views/launch/splash-screen
