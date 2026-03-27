#![no_std]
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, token};
use gift_vault::{GiftVaultClient, LockType, VaultInfo};

#[contract]
pub struct GiftFactory;

#[contractimpl]
impl GiftFactory {
    pub fn create_gift(
        env: Env,
        sender: Address,
        wasm_hash: BytesN<32>,
        salt: BytesN<32>,
        recipient: Address,
        token_address: Address,
        amount: i128,
        lock_type: LockType,
        lock_value_time: Option<u64>,
        lock_value_hash: Option<BytesN<32>>,
    ) -> Address {
        sender.require_auth();

        // deploy vault
        let vault_addr = env.deployer().with_current_contract(salt).deploy(wasm_hash);

        // transfer tokens from sender to vault
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&sender, &vault_addr, &amount);

        // call initialize on vault
        let vault_client = GiftVaultClient::new(&env, &vault_addr);
        vault_client.initialize(
            &sender,
            &recipient,
            &token_address,
            &amount,
            &lock_type,
            &lock_value_time,
            &lock_value_hash,
        );

        // Emit Factory Event
        env.events().publish(
            (soroban_sdk::symbol_short!("factory"), soroban_sdk::symbol_short!("create")),
            (vault_addr.clone(), recipient, amount, lock_type)
        );

        vault_addr
    }
}

#[cfg(test)]
mod test;
