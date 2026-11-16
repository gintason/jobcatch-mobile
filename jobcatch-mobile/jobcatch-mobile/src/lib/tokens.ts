import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Access + refresh tokens. Kept in the device keychain/keystore (SecureStore);
 * the browser build falls back to localStorage. Cached in memory after load.
 */
const ACCESS = "jc_access";
const REFRESH = "jc_refresh";
let cache: { access: string | null; refresh: string | null } = { access: null, refresh: null };

const web = Platform.OS === "web";
async function read(k: string) {
  try { return web ? globalThis.localStorage?.getItem(k) ?? null : await SecureStore.getItemAsync(k); } catch { return null; }
}
async function write(k: string, v: string | null) {
  try {
    if (web) { if (v) globalThis.localStorage?.setItem(k, v); else globalThis.localStorage?.removeItem(k); return; }
    if (v) await SecureStore.setItemAsync(k, v); else await SecureStore.deleteItemAsync(k);
  } catch { /* storage unavailable — tokens live in memory only */ }
}

export const tokens = {
  async load() { cache = { access: await read(ACCESS), refresh: await read(REFRESH) }; return cache; },
  access: () => cache.access,
  refresh: () => cache.refresh,
  async set(access: string, refresh?: string | null) {
    cache = { access, refresh: refresh ?? cache.refresh };
    await Promise.all([write(ACCESS, access), write(REFRESH, cache.refresh)]);
  },
  async clear() { cache = { access: null, refresh: null }; await Promise.all([write(ACCESS, null), write(REFRESH, null)]); },
};
