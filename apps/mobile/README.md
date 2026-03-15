# Firasa Mobile App

Native mobile app wrapper using Capacitor.

## Development

### Prerequisites
- Android Studio (for Android)
- Xcode (for iOS, macOS only)

### Preview on Device

**Option 1: Browser Device Emulation (Easiest)**
1. Open `http://localhost:3011` in Chrome
2. Press F12 → Toggle Device Toolbar (Ctrl+Shift+M)
3. Select any phone model (iPhone 14, Pixel 7, etc.)

**Option 2: Live on Android Device**
1. Build the web app: `cd ../web && npm run build`
2. Export static: ensure `output: 'export'` in next.config.mjs
3. Sync: `npm run sync`
4. Open in Android Studio: `npm run open:android`
5. Run on connected device or emulator

**Option 3: Live on iOS Device (macOS only)**
1. Build + export web app
2. Sync: `npm run sync`
3. Open in Xcode: `npm run open:ios`
4. Run on connected device or simulator

### Dev Mode (Hot Reload on Device)
Edit `capacitor.config.ts` and set:
- Android emulator: `url: 'http://10.0.2.2:3011'`
- iOS simulator: `url: 'http://localhost:3011'`
- Physical device: `url: 'http://<your-ip>:3011'`

Then run `npm run sync` and launch from Android Studio/Xcode.
