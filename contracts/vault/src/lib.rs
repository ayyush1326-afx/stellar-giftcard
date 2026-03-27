#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, token};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum LockType {
    Time,
    Hash,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Recipient,
    TokenAddress,
    Amount,
    LockType,
    LockValue, // For Time: u64 timestamp, For Hash: BytesN<32> hash
    IsInitialized,
}

#[contract]
pub struct GiftVault;

#[contractimpl]
impl GiftVault {
    pub fn initialize(
        env: Env,
        admin: Address,
        recipient: Address,
        token_address: Address,
        amount: i128,
        lock_type: LockType,
        lock_value_time: Option<u64>,
        lock_value_hash: Option<BytesN<32>>,
    ) {
        if env.storage().instance().has(&DataKey::IsInitialized) {
            panic!("already initialized");
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Recipient, &recipient);
        env.storage().instance().set(&DataKey::TokenAddress, &token_address);
        env.storage().instance().set(&DataKey::Amount, &amount);
        env.storage().instance().set(&DataKey::LockType, &lock_type);

        match lock_type {
            LockType::Time => {
                let time = lock_value_time.unwrap();
                env.storage().instance().set(&DataKey::LockValue, &time);
            }
            LockType::Hash => {
                let hash = lock_value_hash.unwrap();
                env.storage().instance().set(&DataKey::LockValue, &hash);
            }
        }
        
        env.storage().instance().set(&DataKey::IsInitialized, &true);
    }

    pub fn claim(env: Env, riddle_answer: Option<Bytes>) {
        if !env.storage().instance().has(&DataKey::IsInitialized) {
            panic!("not initialized");
        }
        
        let recipient: Address = env.storage().instance().get(&DataKey::Recipient).unwrap();
        let token_address: Address = env.storage().instance().get(&DataKey::TokenAddress).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        let lock_type: LockType = env.storage().instance().get(&DataKey::LockType).unwrap();

        match lock_type {
            LockType::Time => {
                let unlock_time: u64 = env.storage().instance().get(&DataKey::LockValue).unwrap();
                if env.ledger().timestamp() < unlock_time {
                    panic!("too early");
                }
            }
            LockType::Hash => {
                let answer = riddle_answer.expect("missing riddle answer");
                let expected_hash: BytesN<32> = env.storage().instance().get(&DataKey::LockValue).unwrap();
                let actual_hash = env.crypto().sha256(&answer);
                if actual_hash.to_array() != expected_hash.to_array() {
                    panic!("incorrect answer");
                }
            }
        }

        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);
    }

    /// Read-only: returns (lock_type, amount, recipient) for the frontend to display.
    pub fn get_info(env: Env) -> (LockType, i128, Address) {
        if !env.storage().instance().has(&DataKey::IsInitialized) {
            panic!("not initialized");
        }
        let lock_type: LockType = env.storage().instance().get(&DataKey::LockType).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        let recipient: Address = env.storage().instance().get(&DataKey::Recipient).unwrap();
        (lock_type, amount, recipient)
    }
}

#[cfg(test)]
mod test;
