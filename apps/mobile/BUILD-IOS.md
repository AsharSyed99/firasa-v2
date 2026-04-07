# Building Firasa for iOS

## Prerequisites
- macOS with Xcode 15+ installed
- Apple Developer account (enrolled in Apple Developer Program)
- CocoaPods: `sudo gem install cocoapods`
- Node.js 18+

## First-time Setup

1. Install dependencies:
   ```bash
   cd firasa-v2
   npm install
   ```

2. Build the web app for mobile:
   ```bash
   cd apps/web
   npm run build:mobile
   ```

3. Add iOS platform (first time only):
   ```bash
   cd apps/mobile
   npx cap add ios
   ```

4. Sync web assets to iOS:
   ```bash
   npx cap sync ios
   ```

5. Open in Xcode:
   ```bash
   npx cap open ios
   ```

## In Xcode

1. Select your **Team** in Signing & Capabilities
2. Set the **Bundle Identifier** to `app.firasa.trading`
3. Select a target device or simulator
4. Click **Run** (⌘R)

## Building for TestFlight

1. Select **Any iOS Device** as the target
2. Product → Archive
3. In the Organizer, click **Distribute App**
4. Choose **App Store Connect** → **Upload**
5. Wait for processing, then create a TestFlight build in App Store Connect

## Environment Variables

The mobile app connects to the API at the URL set in `NEXT_PUBLIC_API_URL`.
For production builds, set this before building:

```bash
export NEXT_PUBLIC_API_URL=https://api.firasa.app
```

## Updating the App

After code changes:
```bash
cd apps/web && npm run build:mobile
cd ../mobile && npx cap sync ios
# Then rebuild in Xcode
```
