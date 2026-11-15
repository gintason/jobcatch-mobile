import * as Location from "expo-location";

export interface Place { lat: number; lng: number; address: string }

/** Current GPS position + a readable address. Throws a friendly message on refusal. */
export async function currentPlace(): Promise<Place> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Allow location access to use your current position.");
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude: lat, longitude: lng } = pos.coords;
  return { lat, lng, address: await reverse(lat, lng) };
}

export async function reverse(lat: number, lng: number): Promise<string> {
  try {
    const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!r) return "";
    return [r.name, r.street, r.district ?? r.subregion, r.city, r.region].filter((x, i, a) => x && a.indexOf(x) === i).join(", ");
  } catch { return ""; }
}

/** Address text → coordinates using the device geocoder (no API key). */
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const text = address.trim();
  if (text.length < 4) return null;
  try {
    const q = /nigeria/i.test(text) ? text : `${text}, Nigeria`;
    const [r] = await Location.geocodeAsync(q);
    return r ? { lat: r.latitude, lng: r.longitude } : null;
  } catch { return null; }
}
