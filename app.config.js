// Dynamic Expo config. Extends the static app.json.
//
// Mapbox download token: the @rnmapbox/maps config-plugin prop
// `RNMapboxMapsDownloadToken` is DEPRECATED (the plugin warns, and it inlines the
// secret into generated native files). The plugin now reads the
// RNMAPBOX_MAPS_DOWNLOAD_TOKEN environment variable at build time instead.
//
// We keep the secret in .env (gitignored) under MAPBOX_DOWNLOAD_TOKEN and mirror
// it onto RNMAPBOX_MAPS_DOWNLOAD_TOKEN here, so no token literal lives in any
// committed file — only the process.env references below do.
//
// NOTE for EAS cloud builds: .env is not uploaded, and the native build reads the
// env var by its exact name, so add the token to EAS under that name before building:
//   eas env:create --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value <sk...> --visibility secret

if (process.env.MAPBOX_DOWNLOAD_TOKEN && !process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN) {
  process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN = process.env.MAPBOX_DOWNLOAD_TOKEN;
}

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    // No download-token prop — the plugin picks up RNMAPBOX_MAPS_DOWNLOAD_TOKEN from the env.
    '@rnmapbox/maps',

    // Camera — the Capture editor's in-app CameraView.
    //
    // Expo Go ships its own Info.plist entries, so the camera works there with
    // no config at all. A dev build or a TestFlight build does NOT: without
    // NSCameraUsageDescription iOS terminates the app the moment it asks for
    // camera access. This plugin generates that key from `cameraPermission`.
    //
    // recordAudioAndroid is false because Chronicle never records video — the
    // voice memo uses expo-av separately. Leaving it true would request the
    // Android microphone permission for no reason.
    [
      'expo-camera',
      {
        cameraPermission:
          'Chronicle uses the camera to take your daily photo and selfie.',
        recordAudioAndroid: false,
      },
    ],
  ],
});
