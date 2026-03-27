#![cfg(test)]

use crate::{GiftVault, GiftVaultClient, LockType};
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Bytes, Env, token};

#[test]
fn test_time_lock_success() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    // Create token
    let token_admin = Address::generate(&env);
    let token_client = token::StellarAssetClient::new(
        &env,
        &env.register_stellar_asset_contract(token_admin.clone()),
    );
    let token_addr = token_client.address.clone();
    
    let vault_id = env.register_contract(None, GiftVault);
    let vault_client = GiftVaultClient::new(&env, &vault_id);

    // Give tokens to vault
    token_client.mint(&vault_id, &1000);

    // Initialize with Time Lock (unlock at ledger 100)
    vault_client.initialize(
        &admin,
        &recipient,
        &token_addr,
        &1000,
        &LockType::Time,
        &Some(100u64),
        &None,
    );

    // Fast forward to 101
    env.ledger().with_mut(|li| {
        li.timestamp = 101;
    });

    vault_client.claim(&None);

    let bal = token::Client::new(&env, &token_addr).balance(&recipient);
    assert_eq!(bal, 1000);
}

#[test]
#[should_panic(expected = "too early")]
fn test_time_lock_failure() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_client = token::StellarAssetClient::new(
        &env,
        &env.register_stellar_asset_contract(token_admin),
    );
    let token_addr = token_client.address.clone();
    
    let vault_id = env.register_contract(None, GiftVault);
    let vault_client = GiftVaultClient::new(&env, &vault_id);

    vault_client.initialize(
        &admin,
        &recipient,
        &token_addr,
        &1000,
        &LockType::Time,
        &Some(100u64),
        &None,
    );

    vault_client.claim(&None);
}

#[test]
fn test_hash_lock_success() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_client = token::StellarAssetClient::new(
        &env,
        &env.register_stellar_asset_contract(token_admin),
    );
    let token_addr = token_client.address.clone();
    
    let vault_id = env.register_contract(None, GiftVault);
    let vault_client = GiftVaultClient::new(&env, &vault_id);
    
    token_client.mint(&vault_id, &1000);

    let answer = Bytes::from_slice(&env, b"my secret riddle answer");
    let actual_hash = env.crypto().sha256(&answer);

    vault_client.initialize(
        &admin,
        &recipient,
        &token_addr,
        &1000,
        &LockType::Hash,
        &None,
        &Some(actual_hash.into()),
    );

    vault_client.claim(&Some(answer));

    let bal = token::Client::new(&env, &token_addr).balance(&recipient);
    assert_eq!(bal, 1000);
}

#[test]
#[should_panic(expected = "incorrect answer")]
fn test_hash_lock_failure() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_client = token::StellarAssetClient::new(
        &env,
        &env.register_stellar_asset_contract(token_admin),
    );
    let token_addr = token_client.address.clone();
    
    let vault_id = env.register_contract(None, GiftVault);
    let vault_client = GiftVaultClient::new(&env, &vault_id);
    
    token_client.mint(&vault_id, &1000);

    let answer = Bytes::from_slice(&env, b"my secret riddle answer");
    let actual_hash = env.crypto().sha256(&answer);

    vault_client.initialize(
        &admin,
        &recipient,
        &token_addr,
        &1000,
        &LockType::Hash,
        &None,
        &Some(actual_hash.into()),
    );

    let wrong_answer = Bytes::from_slice(&env, b"wrong answer");
    vault_client.claim(&Some(wrong_answer));
}
