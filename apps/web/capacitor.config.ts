import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.firasa.mobile',
  appName: 'Firasa',
  webDir: 'out',
  server: {
    // In production, load from the deployed URL for live data
    url: 'https://firasa-opal.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0a0a0f',
    preferredContentMode: 'mobile',
    scheme: 'firasa',
    allowsLinkPreview: false,
    // Use Safari-like user agent to avoid Twitter blocking OAuth in WebView
    overrideUserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0f',
      showSpinner: false,
      launchAutoHide: true,
    },
  },
};

export default config;
