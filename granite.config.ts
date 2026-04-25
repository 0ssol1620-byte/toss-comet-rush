import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'comet-rush',
  brand: {
    displayName: '코멧 러시',
    primaryColor: '#00C2FF',
    icon: 'public/icon.svg',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite --host 0.0.0.0',
      build: 'vite build',
    },
  },
  webViewProps: {
    type: 'game',
  },
  permissions: [],
  outdir: 'dist',
});
