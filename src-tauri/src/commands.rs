use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use chrono::Utc;
use keyring::Entry;
use rand::RngCore;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const SERVICE_NAME: &str = "tavern-master";
const ENCRYPTION_KEY_NAME: &str = "encryption_key";
const VAULT_DATA_KEY_NAME: &str = "vault_data_key";
const DB_NAME: &str = "tavernmaster.db";
const BACKUPS_DIR: &str = "backups";
const MAX_BACKUPS: usize = 20;

#[derive(Serialize)]
pub struct SecretResponse {
    pub value: Option<String>,
}

#[tauri::command]
pub fn set_secret(key: String, value: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &key).map_err(|err| err.to_string())?;
    entry.set_password(&value).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_secret(key: String) -> Result<SecretResponse, String> {
    let entry = Entry::new(SERVICE_NAME, &key).map_err(|err| err.to_string())?;
    match entry.get_password() {
        Ok(value) => Ok(SecretResponse { value: Some(value) }),
        Err(keyring::Error::NoEntry) => Ok(SecretResponse { value: None }),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub fn delete_secret(key: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &key).map_err(|err| err.to_string())?;
    match entry.delete_password() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub fn encrypt_text(plain: String) -> Result<String, String> {
    let key = get_or_create_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|err| err.to_string())?;
    let mut nonce_bytes = [0u8; 12];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plain.as_bytes())
        .map_err(|err| err.to_string())?;
    let mut payload = Vec::with_capacity(12 + ciphertext.len());
    payload.extend_from_slice(&nonce_bytes);
    payload.extend_from_slice(&ciphertext);
    Ok(STANDARD.encode(payload))
}

#[tauri::command]
pub fn decrypt_text(payload: String) -> Result<String, String> {
    let key = get_or_create_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|err| err.to_string())?;
    let decoded = STANDARD
        .decode(payload.as_bytes())
        .map_err(|err| err.to_string())?;
    if decoded.len() < 13 {
        return Err("Payload too short".to_string());
    }
    let (nonce_bytes, ciphertext) = decoded.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|err| err.to_string())?;
    String::from_utf8(plaintext).map_err(|err| err.to_string())
}

fn get_or_create_key() -> Result<[u8; 32], String> {
    let entry = Entry::new(SERVICE_NAME, ENCRYPTION_KEY_NAME).map_err(|err| err.to_string())?;
    match entry.get_password() {
        Ok(value) => decode_key(&value),
        Err(keyring::Error::NoEntry) => {
            let mut bytes = [0u8; 32];
            rand::rngs::OsRng.fill_bytes(&mut bytes);
            let encoded = STANDARD.encode(bytes);
            entry
                .set_password(&encoded)
                .map_err(|err| err.to_string())?;
            Ok(bytes)
        }
        Err(err) => Err(err.to_string()),
    }
}

fn decode_key(value: &str) -> Result<[u8; 32], String> {
    let decoded = STANDARD
        .decode(value.as_bytes())
        .map_err(|err| err.to_string())?;
    if decoded.len() != 32 {
        return Err("Invalid key length".to_string());
    }
    let mut bytes = [0u8; 32];
    bytes.copy_from_slice(&decoded);
    Ok(bytes)
}

// Vault passphrase functions

fn derive_wrapping_key(passphrase: &str, salt: &[u8; 16]) -> Result<[u8; 32], String> {
    let mut output = [0u8; 32];
    Argon2::default()
        .hash_password_into(passphrase.as_bytes(), salt, &mut output)
        .map_err(|e| e.to_string())?;
    Ok(output)
}

fn wrap_key(data_key: &[u8; 32], wrapping_key: &[u8; 32]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new_from_slice(wrapping_key).map_err(|e| e.to_string())?;
    let mut nonce_bytes = [0u8; 12];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, data_key.as_slice()).map_err(|e| e.to_string())?;
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

fn unwrap_key(wrapped: &[u8], wrapping_key: &[u8; 32]) -> Result<[u8; 32], String> {
    if wrapped.len() < 13 {
        return Err("Wrapped key too short".to_string());
    }
    let cipher = Aes256Gcm::new_from_slice(wrapping_key).map_err(|e| e.to_string())?;
    let (nonce_bytes, ciphertext) = wrapped.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher.decrypt(nonce, ciphertext).map_err(|_| "Invalid passphrase".to_string())?;
    if plaintext.len() != 32 {
        return Err("Invalid key length".to_string());
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&plaintext);
    Ok(key)
}

#[derive(Serialize)]
pub struct VaultStatus {
    pub initialized: bool,
    pub has_cached_key: bool,
}

#[tauri::command]
pub fn vault_status() -> Result<VaultStatus, String> {
    let entry = Entry::new(SERVICE_NAME, VAULT_DATA_KEY_NAME).map_err(|e| e.to_string())?;
    let has_cached_key = entry.get_password().is_ok();
    // For now, initialized = has_cached_key (full DB check comes later)
    Ok(VaultStatus { initialized: has_cached_key, has_cached_key })
}

#[tauri::command]
pub fn vault_initialize(passphrase: String) -> Result<String, String> {
    if passphrase.len() < 8 {
        return Err("Passphrase must be at least 8 characters".to_string());
    }

    // Generate random data key
    let mut data_key = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut data_key);

    // Generate salt and derive wrapping key
    let mut salt = [0u8; 16];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    let wrapping_key = derive_wrapping_key(&passphrase, &salt)?;

    // Wrap the data key
    let wrapped = wrap_key(&data_key, &wrapping_key)?;

    // Cache data key in keychain
    let entry = Entry::new(SERVICE_NAME, VAULT_DATA_KEY_NAME).map_err(|e| e.to_string())?;
    entry.set_password(&STANDARD.encode(data_key)).map_err(|e| e.to_string())?;

    // Return salt + wrapped key as base64 (to be stored in crypto_meta)
    let mut bundle = Vec::with_capacity(16 + wrapped.len());
    bundle.extend_from_slice(&salt);
    bundle.extend_from_slice(&wrapped);
    Ok(STANDARD.encode(bundle))
}

#[tauri::command]
pub fn vault_unlock(passphrase: String, wrapped_bundle: String) -> Result<(), String> {
    let bundle = STANDARD.decode(wrapped_bundle.as_bytes()).map_err(|e| e.to_string())?;
    if bundle.len() < 17 {
        return Err("Invalid wrapped bundle".to_string());
    }

    let (salt_bytes, wrapped) = bundle.split_at(16);
    let mut salt = [0u8; 16];
    salt.copy_from_slice(salt_bytes);

    let wrapping_key = derive_wrapping_key(&passphrase, &salt)?;
    let data_key = unwrap_key(wrapped, &wrapping_key)?;

    // Cache in keychain
    let entry = Entry::new(SERVICE_NAME, VAULT_DATA_KEY_NAME).map_err(|e| e.to_string())?;
    entry.set_password(&STANDARD.encode(data_key)).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn vault_rewrap(old_passphrase: String, new_passphrase: String, wrapped_bundle: String) -> Result<String, String> {
    if new_passphrase.len() < 8 {
        return Err("New passphrase must be at least 8 characters".to_string());
    }

    // Unwrap with old passphrase
    let bundle = STANDARD.decode(wrapped_bundle.as_bytes()).map_err(|e| e.to_string())?;
    if bundle.len() < 17 {
        return Err("Invalid wrapped bundle".to_string());
    }
    let (salt_bytes, wrapped) = bundle.split_at(16);
    let mut old_salt = [0u8; 16];
    old_salt.copy_from_slice(salt_bytes);
    let old_wrapping_key = derive_wrapping_key(&old_passphrase, &old_salt)?;
    let data_key = unwrap_key(wrapped, &old_wrapping_key)?;

    // Rewrap with new passphrase
    let mut new_salt = [0u8; 16];
    rand::rngs::OsRng.fill_bytes(&mut new_salt);
    let new_wrapping_key = derive_wrapping_key(&new_passphrase, &new_salt)?;
    let new_wrapped = wrap_key(&data_key, &new_wrapping_key)?;

    let mut new_bundle = Vec::with_capacity(16 + new_wrapped.len());
    new_bundle.extend_from_slice(&new_salt);
    new_bundle.extend_from_slice(&new_wrapped);
    Ok(STANDARD.encode(new_bundle))
}

#[tauri::command]
pub fn vault_get_data_key() -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, VAULT_DATA_KEY_NAME).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(key) => Ok(key),
        Err(keyring::Error::NoEntry) => Err("Vault not unlocked".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn vault_lock() -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, VAULT_DATA_KEY_NAME).map_err(|e| e.to_string())?;
    match entry.delete_password() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

fn get_app_data_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|e| e.to_string())
}

#[derive(Serialize)]
pub struct BackupInfo {
    pub path: String,
    pub created_at: String,
    pub reason: String,
}

#[tauri::command]
pub fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    get_app_data_path(&app)?
        .to_str()
        .map(|s| s.to_string())
        .ok_or("Invalid path".to_string())
}

#[tauri::command]
pub fn backup_database(app: tauri::AppHandle, reason: String) -> Result<String, String> {
    let app_data = get_app_data_path(&app)?;
    let db_path = app_data.join(DB_NAME);
    let backups_path = app_data.join(BACKUPS_DIR);

    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }

    fs::create_dir_all(&backups_path).map_err(|e| e.to_string())?;

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let safe_reason: String = reason
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .take(50)
        .collect();
    let backup_name = format!("{}_{}.db", timestamp, safe_reason);
    let backup_path = backups_path.join(&backup_name);

    fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;
    rotate_backups(&backups_path)?;

    backup_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or("Invalid backup path".to_string())
}

#[tauri::command]
pub fn list_database_backups(app: tauri::AppHandle) -> Result<Vec<BackupInfo>, String> {
    let backups_path = get_app_data_path(&app)?.join(BACKUPS_DIR);

    if !backups_path.exists() {
        return Ok(vec![]);
    }

    let mut backups: Vec<BackupInfo> = fs::read_dir(&backups_path)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "db"))
        .filter_map(|entry| {
            let path = entry.path();
            let filename = path.file_stem()?.to_str()?;
            let parts: Vec<&str> = filename.splitn(3, '_').collect();
            if parts.len() >= 3 {
                Some(BackupInfo {
                    path: path.to_str()?.to_string(),
                    created_at: format!("{}_{}", parts[0], parts[1]),
                    reason: parts[2].to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}

#[tauri::command]
pub fn restore_database(app: tauri::AppHandle, backup_path: String) -> Result<(), String> {
    let db_path = get_app_data_path(&app)?.join(DB_NAME);
    let backup = PathBuf::from(&backup_path);

    if !backup.exists() {
        return Err("Backup file not found".to_string());
    }

    fs::copy(&backup, &db_path).map_err(|e| e.to_string())?;
    Ok(())
}

fn rotate_backups(backups_path: &PathBuf) -> Result<(), String> {
    let mut entries: Vec<_> = fs::read_dir(backups_path)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "db"))
        .collect();

    if entries.len() <= MAX_BACKUPS {
        return Ok(());
    }

    entries.sort_by_key(|e| e.path());
    let to_remove = entries.len() - MAX_BACKUPS;
    for entry in entries.into_iter().take(to_remove) {
        fs::remove_file(entry.path()).map_err(|e| e.to_string())?;
    }
    Ok(())
}
