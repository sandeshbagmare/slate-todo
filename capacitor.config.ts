import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.slate.tasks',
  appName: 'Slate',
  webDir: 'dist',
  android: {
    backgroundColor: '#07080c',
    allowMixedContent: false,
  },
};

export default config;
