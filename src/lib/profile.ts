import { useMutation } from "@tanstack/react-query";
import { api, appendFile, type PickedFile } from "./api";
import { useAuth, type User } from "./auth";

export function useUpdateProfile() {
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: (v: { full_name?: string; phone?: string; photo?: PickedFile; remove_photo?: boolean }) => {
      if (!v.photo) return api.patch<User>("/auth/me/", v);
      const form = new FormData();
      appendFile(form, "photo", v.photo);
      return api.upload<User>("PATCH", "/auth/me/", form);
    },
    onSuccess: setUser,
  });
}

export function useChangePassword() {
  const { acceptSession } = useAuth();
  return useMutation({
    mutationFn: (v: { current_password?: string; new_password: string }) =>
      api.post<{ access: string; refresh: string; user: User }>("/auth/change-password/", v),
    onSuccess: acceptSession,
  });
}
