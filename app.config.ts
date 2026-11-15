import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Adds Google sign-in's iOS URL scheme (the reversed iOS client ID) when
 * EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set, so Google can return to the app.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const reversed = iosClientId ? iosClientId.split(".").reverse().join(".") : null;
  return {
    ...(config as ExpoConfig),
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        ...(reversed ? { CFBundleURLTypes: [{ CFBundleURLSchemes: [reversed] }] } : {}),
      },
    },
  };
};
