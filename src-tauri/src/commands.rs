use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use keyring::Entry;
use rand::RngCore;
use serde::Serialize;

const SERVICE_NAME: &str = "tavern-master";
const ENCRYPTION_KEY_NAME: &str = "encryption_key";

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
  let decoded = STANDARD.decode(payload.as_bytes()).map_err(|err| err.to_string())?;
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
      entry.set_password(&encoded).map_err(|err| err.to_string())?;
      Ok(bytes)
    }
    Err(err) => Err(err.to_string()),
  }
}

fn decode_key(value: &str) -> Result<[u8; 32], String> {
  let decoded = STANDARD.decode(value.as_bytes()).map_err(|err| err.to_string())?;
  if decoded.len() != 32 {
    return Err("Invalid key length".to_string());
  }
  let mut bytes = [0u8; 32];
  bytes.copy_from_slice(&decoded);
  Ok(bytes)
}
