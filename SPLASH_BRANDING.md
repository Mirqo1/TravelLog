# Compass and TravelLog startup branding

Android 12+ shows the existing compass in the centre and an outlined TravelLog
wordmark in its native bottom branding area. Sand background and brown/ochre
palette are unchanged. Older Android versions keep the existing compass splash.
No artificial delay or second loading screen was added.

## Existing local Windows project

After pulling the feature branch, run from the repository root:

```bat
node scripts/apply-splash-branding.cjs
cd android
gradlew.bat :app:assembleRelease
```

Use the existing JDK 21 session settings. The script updates only matching splash
XML themes (including qualified variants) and adds the wordmark drawable. It does
not touch app/build.gradle, signing credentials or local app.json. Repeating it is
safe. Do not use prebuild --clean for this change.

Future freshly generated projects use `plugins/withSplashBranding.js` via
app.config.js. Register it BEFORE expo-splash-screen, as Expo mods execute in
reverse registration order. Introspection verifies the final generated style.

## Artwork

`assets/splash-wordmark.svg` is the visual source, and `assets/splash-wordmark.xml`
is its native Android vector equivalent (200x80 dp). Both contain outlined paths;
no font is bundled or loaded at startup. Regeneration uses fontTools and
`scripts/generate-splash-wordmark.py /path/to/DejaVuSans-Bold.ttf`.
The glyph attribution/license is in `assets/splash-wordmark-LICENSE.txt`.
The current name is a working title until rebranding is agreed.

Device acceptance: install the signed APK as an update, fully close/reopen the
app and check title placement on the compass screen in light/dark system mode.
Warm resumes may skip the splash. No uninstall or data clearing is needed.

Reference: https://developer.android.com/develop/ui/views/launch/splash-screen
