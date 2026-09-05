/**
 * Dynamic config layered over app.json.
 *
 * Expo reads app.json first and hands it here as `config`, so everything static
 * stays where it is readable and only the parts that need a secret at build
 * time are computed. Right now that is one thing: the Google Maps key the map
 * picker needs on Android.
 *
 * The key is not `EXPO_PUBLIC_`-prefixed because it is never read from app
 * code — it is baked into the Android manifest at build time, so it belongs to
 * the build environment rather than the bundle.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY },
    },
  },
});
