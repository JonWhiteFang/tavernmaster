import { invoke } from "@tauri-apps/api/core";

export async function setSecret(key: string, value: string): Promise<void> {
  await invoke("set_secret", { key, value });
}

export async function getSecret(key: string): Promise<string | null> {
  const result = await invoke<{ value: string | null }>("get_secret", { key });
  return result.value;
}
