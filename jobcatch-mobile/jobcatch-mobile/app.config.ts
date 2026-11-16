import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Adds native Google Sign-In's iOS URL scheme (the reversed iOS client ID) once
 * EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set. Android needs no extra config.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins = [...(config.plugins ?? [])];
  if (iosClientId) {
    plugins.push(["@react-native-google-signin/google-signin", { iosUrlScheme: iosClientId.split(".").reverse().join(".") }]);
  }
  return { ...(config as ExpoConfig), plugins };
};
