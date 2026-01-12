import { invoke } from "@tauri-apps/api/core";

export interface BackupInfo {
  path: string;
  created_at: string;
  reason: string;
}

export async function getAppDataDir(): Promise<string> {
  return invoke<string>("get_app_data_dir");
}

export async function backupDatabase(reason: string): Promise<string> {
  return invoke<string>("backup_database", { reason });
}

export async function listDatabaseBackups(): Promise<BackupInfo[]> {
  return invoke<BackupInfo[]>("list_database_backups");
}

export async function restoreDatabase(backupPath: string): Promise<void> {
  return invoke<void>("restore_database", { backupPath });
}
