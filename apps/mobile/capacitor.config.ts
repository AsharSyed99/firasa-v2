import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.firasa.trading',
  appName: 'Firasa',
  webDir: '../web/out',
  server: {
    // For dev: point to Next.js dev server
    // Comment this out for production builds
    url: 'http://10.0.2.2:3011', // Android emulator localhost
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: true,
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
  },
  android: {
    backgroundColor: '#030712',
  },
};

export default config;
