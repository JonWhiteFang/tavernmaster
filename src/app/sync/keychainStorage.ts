import { deleteSecret, getSecret, setSecret } from "./secure";

const PREFIX = "supabase:";
const KEYCHAIN_TIMEOUT_MS = 1500;

function toKeychainKey(key: string): string {
  return `${PREFIX}${key}`;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("timeout")), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
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
      return await withTimeout(getSecret(toKeychainKey(key)), KEYCHAIN_TIMEOUT_MS);
    } catch {
      return safeGetLocalStorage()?.getItem(key) ?? null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await withTimeout(setSecret(toKeychainKey(key), value), KEYCHAIN_TIMEOUT_MS);
    } catch {
      safeGetLocalStorage()?.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await withTimeout(deleteSecret(toKeychainKey(key)), KEYCHAIN_TIMEOUT_MS);
    } catch {
      safeGetLocalStorage()?.removeItem(key);
    }
  }
};
