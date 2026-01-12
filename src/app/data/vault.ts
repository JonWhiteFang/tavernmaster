import { invoke } from "@tauri-apps/api/core";

export interface VaultStatus {
  initialized: boolean;
  has_cached_key: boolean;
}

export async function vaultStatus(): Promise<VaultStatus> {
  return invoke<VaultStatus>("vault_status");
}

export async function vaultInitialize(passphrase: string): Promise<string> {
  return invoke<string>("vault_initialize", { passphrase });
}

export async function vaultUnlock(passphrase: string, wrappedBundle: string): Promise<void> {
  return invoke<void>("vault_unlock", { passphrase, wrappedBundle });
}

export async function vaultRewrap(
  oldPassphrase: string,
  newPassphrase: string,
  wrappedBundle: string
): Promise<string> {
  return invoke<string>("vault_rewrap", { oldPassphrase, newPassphrase, wrappedBundle });
}

export async function vaultGetDataKey(): Promise<string> {
  return invoke<string>("vault_get_data_key");
}

export async function vaultLock(): Promise<void> {
  return invoke<void>("vault_lock");
}
