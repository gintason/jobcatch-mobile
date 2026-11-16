import { useState } from "react";
import { ActionSheetIOS, Alert, Platform, Pressable, View, type AlertButton } from "react-native";
import { BadgeCheck, Camera, KeyRound, Mail, Phone, User as UserIcon } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { Avatar } from "@/components/jobs";
import { apiError, type PickedFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { pickProfilePhoto } from "@/lib/files";
import { formatDate } from "@/lib/format";
import { useChangePassword, useUpdateProfile } from "@/lib/profile";
import { Button, Card, Input, Notice, Screen, Text, colors } from "@/ui";

/** Edit name, phone and photo; change or create the account password. */
export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Screen back title="Edit profile">
      <Details />
      <Password />
      <Card style={{ gap: 8 }}>
        <Text variant="h3">Account</Text>
        <Line icon={<Mail size={16} color={colors.brand500} />} text={user.is_email_verified ? "Email verified" : "Email not verified"} />
        <Line icon={<BadgeCheck size={16} color={colors.brand500} />} text={user.is_identity_verified ? "Identity verified" : "Identity not verified yet"} />
        {user.date_joined ? <Line icon={<UserIcon size={16} color={colors.brand500} />} text={`Member since ${formatDate(user.date_joined)}`} /> : null}
        <Text variant="caption">To delete your account, go to Account → Delete my account.</Text>
      </Card>
    </Screen>
  );
}

function Line({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>{icon}<Text variant="small" style={{ color: colors.ink }}>{text}</Text></View>;
}

function Details() {
  const { user } = useAuth();
  const save = useUpdateProfile();
  const [name, setName] = useState(user!.full_name);
  const [phone, setPhone] = useState(user!.phone ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const changed = name.trim() !== user!.full_name || phone.trim() !== (user!.phone ?? "");

  const done = (text: string) => ({ onSuccess: () => setMsg({ ok: true, text }), onError: (e: unknown) => setMsg({ ok: false, text: apiError(e) }) });
  function upload(photo: PickedFile | null) { if (photo) { setMsg(null); save.mutate({ photo }, done("Photo updated.")); } }

  async function fromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { setMsg({ ok: false, text: "Allow camera access to take a photo." }); return; }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], cameraType: ImagePicker.CameraType.front, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!r.canceled && r.assets?.[0]) upload({ uri: r.assets[0].uri, name: r.assets[0].fileName ?? "photo.jpg", type: r.assets[0].mimeType ?? "image/jpeg" });
  }
  function choose() {
    const options = ["Take a photo", "Choose from library", ...(user!.photo ? ["Remove photo"] : []), "Cancel"];
    const run = (i: number) => {
      if (options[i] === "Take a photo") fromCamera();
      else if (options[i] === "Choose from library") pickProfilePhoto().then(upload);
      else if (options[i] === "Remove photo") save.mutate({ remove_photo: true }, done("Photo removed."));
    };
    if (Platform.OS === "ios") ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: options.length - 1,
      destructiveButtonIndex: user!.photo ? 2 : undefined }, run);
    else {
      const buttons: AlertButton[] = options.slice(0, -1).map((o, i) => ({ text: o, onPress: () => run(i), style: o === "Remove photo" ? "destructive" : "default" }));
      Alert.alert("Profile photo", undefined, [...buttons, { text: "Cancel", style: "cancel" }]);
    }
  }

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ alignItems: "center", gap: 8 }}>
        <Pressable onPress={choose} accessibilityRole="button" accessibilityLabel="Change profile photo">
          <Avatar uri={user!.photo} name={user!.full_name} size={96} />
          <View style={{ position: "absolute", right: -2, bottom: -2, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brand500, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.white }}>
            <Camera size={16} color={colors.white} />
          </View>
        </Pressable>
        <Button title={save.isPending ? "Saving…" : user!.photo ? "Change photo" : "Add photo"} kind="ghost" size="md" onPress={choose} disabled={save.isPending} />
      </View>
      <Input label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" left={<UserIcon size={18} color={colors.faint} />} />
      <Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="0803 123 4567" left={<Phone size={18} color={colors.faint} />}
        hint={phone.trim() && phone.trim() !== (user!.phone ?? "") ? "A new number may need to be verified again." : undefined} />
      <View style={{ gap: 6 }}>
        <Text variant="label">Email</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 14, backgroundColor: colors.mist, borderWidth: 1, borderColor: colors.line }}>
          <Mail size={18} color={colors.faint} />
          <Text style={{ flex: 1, color: colors.muted }} numberOfLines={1}>{user!.email}</Text>
          {user!.is_email_verified ? <BadgeCheck size={18} color={colors.success} /> : null}
        </View>
        <Text variant="caption">Your email is your sign-in. To change it, contact support.</Text>
      </View>
      {msg ? <Notice kind={msg.ok ? "success" : "error"}>{msg.text}</Notice> : null}
      <Button title="Save changes" loading={save.isPending} disabled={!changed || name.trim().length < 2}
        onPress={() => { setMsg(null); save.mutate({ full_name: name.trim(), phone: phone.trim() }, done("Profile saved.")); }} />
    </Card>
  );
}

function Password() {
  const { user } = useAuth();
  const change = useChangePassword();
  const hasPassword = user!.has_password !== false;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  function submit() {
    if (next !== confirm) { setMsg({ ok: false, text: "The new passwords don't match." }); return; }
    setMsg(null);
    change.mutate({ current_password: hasPassword ? current : undefined, new_password: next }, {
      onSuccess: () => { setCurrent(""); setNext(""); setConfirm(""); setMsg({ ok: true, text: "Password updated. Other devices have been signed out." }); },
      onError: (e) => setMsg({ ok: false, text: apiError(e) }),
    });
  }
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><KeyRound size={18} color={colors.brand500} /><Text variant="h3">{hasPassword ? "Change password" : "Create a password"}</Text></View>
      {!hasPassword ? <Text variant="small">You signed up with Google. Add a password to also sign in with your email, or to reset your transfer PIN.</Text> : null}
      {hasPassword ? <Input label="Current password" value={current} onChangeText={setCurrent} password autoComplete="current-password" textContentType="password" /> : null}
      <Input label="New password" value={next} onChangeText={setNext} password autoComplete="new-password" textContentType="newPassword" placeholder="At least 8 characters" />
      <Input label="Repeat new password" value={confirm} onChangeText={setConfirm} password autoComplete="new-password" />
      {msg ? <Notice kind={msg.ok ? "success" : "error"}>{msg.text}</Notice> : null}
      <Button title={hasPassword ? "Update password" : "Create password"} kind="secondary" loading={change.isPending}
        disabled={next.length < 8 || confirm.length < 8 || (hasPassword && !current)} onPress={submit} />
    </Card>
  );
}
