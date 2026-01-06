import { deleteSecret, getSecret, setSecret } from "./secure";

const PREFIX = "supabase:";

function toKeychainKey(key: string): string {
  return `${PREFIX}${key}`;
}

function safeGetLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const keychainStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await getSecret(toKeychainKey(key));
    } catch {
      return safeGetLocalStorage()?.getItem(key) ?? null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await setSecret(toKeychainKey(key), value);
    } catch {
      safeGetLocalStorage()?.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await deleteSecret(toKeychainKey(key));
    } catch {
      safeGetLocalStorage()?.removeItem(key);
    }
  }
};
