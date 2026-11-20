# Updating the JobCatch app

There are two kinds of update. **Most changes are over-the-air (OTA).**

## 1. Over-the-air update (JavaScript / screens / text / logic) — no Play Store upload

From the `jobcatch-mobile` folder, after committing your changes:

```bash
eas update --channel production --message "Short description of the change"
```

- Phones running the Play Store build download it in the background the next time the app opens or
  comes back to the foreground, then show **"A new version of JobCatch is ready — Restart"**.
  If the user ignores it, it applies on the next full restart.
- Preview APK builds use the `preview` channel instead: `eas update --channel preview --message "…"`.
- Undo a bad update: `eas update:republish --channel production` (pick the previous update) or
  publish the previous code again.
- See what's live: `eas update:list --branch production`.

The Play Store version number does **not** change for OTA updates — that's expected.

## 2. New build + Play Store upload (native changes)

Needed only when the native side changes, for example:

- adding or upgrading a package that has native code (anything `npx expo install` adds to
  `android/` or `ios/`), or upgrading Expo
- changing `app.json` / `app.config.ts` native settings: permissions, icons, splash screen,
  package name, plugins, Google sign-in IDs
- bumping `"version"` in `app.json` for a store release

```bash
eas build --platform android --profile production
```

Then upload the `.aab` in Play Console (**Testing → Closed testing / Production → Create new
release**) as before.

**Safety net:** the app uses `runtimeVersion: fingerprint`. If an update needs native code that an
installed build doesn't have, EAS Update simply won't send it to that build — so a JS update can
never crash an older build. If `eas update` says no compatible builds exist, make a new build.
