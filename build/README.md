# Build assets

This directory holds the icon files and macOS entitlements that
`electron-builder` consumes when packaging the desktop app.

## What's here now
- `entitlements.mac.plist` — sandbox/JIT entitlements for hardened
  runtime. Phase 1 builds are not yet code-signed, but this file is
  ready for when they are.

## What you still need to add
The icons are binary assets that aren't committed to the repo yet.
When you're ready to ship a polished build, add:

- `icon.icns` — macOS app icon (1024×1024 source recommended)
- `icon.ico` — Windows app icon
- `icon.png` — generic 512×512 PNG used by the BrowserWindow itself

Until those are in place, `npm run dist:mac` and `npm run dist:win`
will still succeed but will fall back to the default Electron icon.
