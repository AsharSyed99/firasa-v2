import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.firasa.mobile',
  appName: 'Firasa',
  webDir: 'out',
  server: {
    // In production, load from the deployed URL for live data
    url: 'https://firasa-opal.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0a0a0f',
    preferredContentMode: 'mobile',
    scheme: 'Firasa',
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
