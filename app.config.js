// Dynamic Expo config. Extends the static app.json and injects the Mapbox
// download token from the environment at evaluation time.
//
// Why this file exists: the @rnmapbox/maps config plugin needs the SECRET
// download token (sk. …). app.json is committed to git, so the token must NOT
// be written there. Instead it is read from process.env.MAPBOX_DOWNLOAD_TOKEN,
// which Expo loads from .env (gitignored). No secret literal lives in any
// tracked file — only the process.env reference below does.
//
// NOTE: this reads .env for LOCAL builds/prebuild. For an EAS cloud build the
// .env is not uploaded, so set the token there with:
//   eas secret:create --scope project --name MAPBOX_DOWNLOAD_TOKEN --value <sk...>

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
      },
    ],
  ],
});
