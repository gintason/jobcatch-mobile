import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type { PickedFile } from "./api";

/** Pick a document (PDF/DOC) — returns null if cancelled. */
export async function pickDocument(types = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]): Promise<PickedFile | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.name, type: a.mimeType ?? "application/octet-stream" };
}

/** Pick one or more photos from the library. */
export async function pickImages(max = 1): Promise<PickedFile[]> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: max > 1, selectionLimit: max, quality: 0.8 });
  if (r.canceled) return [];
  return r.assets.slice(0, max).map((a, i) => ({ uri: a.uri, name: a.fileName ?? `photo-${i + 1}.jpg`, type: a.mimeType ?? "image/jpeg" }));
}

/** Open the front camera for a selfie. Throws a friendly message if camera access is refused. */
export async function takeSelfie(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error("Allow camera access to take your selfie.");
  const r = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"], cameraType: ImagePicker.CameraType.front, allowsEditing: true, aspect: [1, 1], quality: 0.7,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.fileName ?? "selfie.jpg", type: a.mimeType ?? "image/jpeg" };
}

/** Pick a square profile photo from the library (cropped by the system picker). */
export async function pickProfilePhoto(): Promise<PickedFile | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.fileName ?? "photo.jpg", type: a.mimeType ?? "image/jpeg" };
}

/**
 * Pick one video from the library (work samples). The backend accepts MP4 only:
 * on iPhone we ask for the "compatible" (H.264) version and name it .mp4.
 */
export async function pickVideo(): Promise<PickedFile | null> {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"], allowsMultipleSelection: false, quality: 0.8, videoMaxDuration: 120,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  const base = (a.fileName ?? "work-sample").replace(/\.[^.]+$/, "");
  return { uri: a.uri, name: `${base}.mp4`, type: "video/mp4" };
}
