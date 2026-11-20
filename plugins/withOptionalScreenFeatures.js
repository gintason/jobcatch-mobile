/**
 * The app is portrait-only ("orientation": "portrait"), which makes Android treat
 * android.hardware.screen.portrait as a REQUIRED feature. Google Play then blocks
 * installs on tablets, Chromebooks/desktop and XR. Declaring the screen features as
 * optional keeps portrait on phones while letting every device install the app.
 */
const { withAndroidManifest } = require("expo/config-plugins");

const FEATURES = ["android.hardware.screen.portrait", "android.hardware.screen.landscape"];

module.exports = function withOptionalScreenFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const list = (manifest["uses-feature"] = manifest["uses-feature"] || []);
    for (const name of FEATURES) {
      const existing = list.find((f) => f.$?.["android:name"] === name);
      if (existing) existing.$["android:required"] = "false";
      else list.push({ $: { "android:name": name, "android:required": "false" } });
    }
    return cfg;
  });
};
