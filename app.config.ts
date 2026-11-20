import type { ConfigContext, ExpoConfig } from "expo/config";

/** The iOS OAuth client (Google Cloud → Clients → "iOS"); public, not a secret. */
const IOS_CLIENT_ID = "306763553702-5kvmuchb5s8ee3gjgpqb3mhnqeminfac.apps.googleusercontent.com";

/**
 * Adds native Google Sign-In's iOS URL scheme (the reversed iOS client ID), so Google can
 * hand the sign-in back to the app. Android needs no extra config.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || IOS_CLIENT_ID;
  const plugins = [...(config.plugins ?? []), "./plugins/withOptionalScreenFeatures"];
  if (iosClientId) {
    plugins.push(["@react-native-google-signin/google-signin", { iosUrlScheme: iosClientId.split(".").reverse().join(".") }]);
  }
  return { ...(config as ExpoConfig), plugins };
};
