# iOS CI/CD Setup Guide

This guide walks you through setting up automated iOS builds via GitHub Actions.
No Mac required — builds run on GitHub's macOS runners.

## Two Build Modes

| Mode | Trigger | Output | Cost |
|------|---------|--------|------|
| **Simulator** | Push to main (auto) | `.app` bundle for testing | Free |
| **TestFlight** | Manual dispatch | `.ipa` uploaded to TestFlight | Free |

## Quick Start (Simulator Builds)

Simulator builds work immediately with **no setup**. Every push to `main` that
touches `apps/web/`, `apps/mobile/`, or `packages/` triggers a build.

You can also trigger manually:
1. Go to **Actions** → **iOS Build & TestFlight**
2. Click **Run workflow** → select **simulator**

## TestFlight Setup (One-Time)

To upload builds to TestFlight for real device testing, you need to configure
6 GitHub repository secrets.

### Step 1: Create App Store Connect API Key

1. Go to [App Store Connect → Users & Access → Keys](https://appstoreconnect.apple.com/access/api)
2. Click **+** → Name: `Firasa CI` → Access: `App Manager`
3. Download the `.p8` file
4. Note the **Key ID** and **Issuer ID** from the page

Set these secrets in GitHub:
```
ASC_KEY_ID          → The Key ID (e.g., "ABC123DEF4")
ASC_ISSUER_ID       → The Issuer ID (e.g., "12345678-abcd-...")
ASC_API_KEY_BASE64  → base64 of the .p8 file:
                      cat AuthKey_ABC123DEF4.p8 | base64
```

### Step 2: Create Signing Certificate

1. Open [Apple Developer → Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Click **+** → **Apple Distribution**
3. Create a CSR using Keychain Access on any Mac (or use a cloud Mac)
4. Download the `.cer` file
5. Import into Keychain Access → export as `.p12` with a password

Set these secrets in GitHub:
```
IOS_P12_CERTIFICATE_BASE64 → base64 of the .p12 file:
                              cat Certificates.p12 | base64
IOS_P12_PASSWORD            → The password you set when exporting
```

### Step 3: Create Provisioning Profile

1. Open [Apple Developer → Profiles](https://developer.apple.com/account/resources/profiles/list)
2. Click **+** → **App Store Connect** (Distribution)
3. Select App ID: `app.firasa.trading` (create if needed)
4. Select the certificate from Step 2
5. Download the `.mobileprovision` file

Set these secrets in GitHub:
```
IOS_PROVISIONING_PROFILE_BASE64  → base64 of the .mobileprovision:
                                    cat profile.mobileprovision | base64
IOS_PROVISIONING_PROFILE_NAME    → Exact name shown in Apple Developer portal
APPLE_TEAM_ID                    → Your 10-character Team ID
```

### Step 4: Create App ID (if not done)

1. Go to [Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Click **+** → **App IDs** → **App**
3. Bundle ID: `app.firasa.trading` (Explicit)
4. Enable capabilities: Push Notifications

### Step 5: Trigger TestFlight Build

1. Go to **Actions** → **iOS Build & TestFlight**
2. Click **Run workflow** → select **testflight**
3. Wait ~10 minutes for the build
4. Check TestFlight in App Store Connect — the build will appear for testing

## All Required Secrets

| Secret | Description |
|--------|-------------|
| `APPLE_TEAM_ID` | Your Apple Developer Team ID |
| `ASC_KEY_ID` | App Store Connect API Key ID |
| `ASC_ISSUER_ID` | App Store Connect Issuer ID |
| `ASC_API_KEY_BASE64` | Base64 of the .p8 API key file |
| `IOS_P12_CERTIFICATE_BASE64` | Base64 of your .p12 signing certificate |
| `IOS_P12_PASSWORD` | Password for the .p12 certificate |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64 of the .mobileprovision file |
| `IOS_PROVISIONING_PROFILE_NAME` | Name of the provisioning profile |
| `FIREBASE_API_KEY` | (Optional) Firebase web API key |
| `FIREBASE_AUTH_DOMAIN` | (Optional) Firebase auth domain |
| `FIREBASE_PROJECT_ID` | (Optional) Firebase project ID |

## Troubleshooting

**Build fails at "pod install":**
Capacitor 7 requires CocoaPods. The workflow installs it automatically.

**Signing errors:**
Double-check the bundle ID matches `app.firasa.trading` in both the
provisioning profile and the Xcode project.

**TestFlight upload fails:**
Ensure the App Store Connect API key has `App Manager` access.
Also verify the app is registered in App Store Connect.
