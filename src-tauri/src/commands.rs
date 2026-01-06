use keyring::Entry;
use serde::Serialize;

const SERVICE_NAME: &str = "tavern-master";

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
