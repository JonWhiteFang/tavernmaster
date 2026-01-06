import { invoke } from "@tauri-apps/api/core";

export async function encryptValue(value: string | null | undefined): Promise<string | null> {
  if (!value) {
    return null;
  }
  return invoke<string>("encrypt_text", { plain: value });
}

export async function decryptValue(value: string | null | undefined): Promise<string | null> {
  if (!value) {
    return null;
  }
  try {
    return await invoke<string>("decrypt_text", { payload: value });
  } catch {
    return value;
  }
}
