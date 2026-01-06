import { deleteSecret, getSecret, setSecret } from "./secure";

const PREFIX = "supabase:";

function toKeychainKey(key: string): string {
  return `${PREFIX}${key}`;
}

export const keychainStorage = {
  async getItem(key: string): Promise<string | null> {
    return getSecret(toKeychainKey(key));
  },
  async setItem(key: string, value: string): Promise<void> {
    await setSecret(toKeychainKey(key), value);
  },
  async removeItem(key: string): Promise<void> {
    await deleteSecret(toKeychainKey(key));
  }
};
