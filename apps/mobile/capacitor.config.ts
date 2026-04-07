import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'app.firasa.trading',
  appName: 'Firasa',
  webDir: '../web/out',
  // In dev, point to local Next.js server. In prod, use bundled static files.
  ...(isDev ? {
    server: {
      url: 'http://localhost:3011',
      cleartext: true,
    },
  } : {}),
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#030712',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#030712',
    },
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'Firasa',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#030712',
  },
};

export default config;
