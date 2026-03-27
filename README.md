# 🎁 Stellar GiftCard — Programmable Web3 Gift Cards

A decentralized gift card system on the **Stellar Testnet** where funds are "wrapped" in a Soroban smart contract with programmable unlocking conditions — either a **Time-lock** (release after a date) or a **Riddle/Hash-lock** (release when the secret answer is correct).

<!-- Replace with real screenshot -->
<!-- ![App Screenshot](./docs/screenshot.png) -->

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🏭 Factory Contract | Deploys isolated per-gift Vault contracts |
| 🔒 Time-lock | Funds release only after a specific timestamp |
| 🔐 Riddle-lock | Funds release when the SHA-256 hash of the answer matches |
| 🎴 Flip Card UI | Framer Motion-powered 3D card flip animation |
| 🌐 Freighter Wallet | One-click sign-in with the Freighter browser extension |
| 🔗 Shareable Links | Each Gift Card has a unique `/claim/[vault_id]` URL |

---

## 🏆 Level 4 Certification Highlights
- **Advanced Contract Patterns**: Implementation of the **Factory Pattern** for secure, automated vault deployment.
- **Inter-Contract Calls**: Factory contract securely invokes the Vault's initialization logic.
- **Soroban Events**: Production-grade event tracking for all creation, initialization, and claim actions.
- **CI/CD Pipeline**: fully configured GitHub Actions for automated testing and build verification.
- **Mobile Responsive**: 100% pixel-perfect mobile-first design with 3D interactions optimized for touch.

## 🚀 Live Demo & Deployment
- **Live Demo**: [stellar-giftcard.vercel.app](https://stellar-giftcard.vercel.app)
- **CI/CD Pipeline**: [![CI status](https://github.com/ayyush1326-afx/stellar-giftcard/actions/workflows/ci.yml/badge.svg)](https://github.com/ayyush1326-afx/stellar-giftcard/actions)

## 📸 Final Proof of Work
### Desktop & Mobile Layouts
![Desktop Overview](media/desktop_home.png)
![Mobile Home View](media/mobile_home.png)
![Mobile Interaction View](media/mobile_riddle.png)

### 📹 Demo Walkthrough
![Full Demo Recording](media/demo_recording.webp)

## 🛠️ Tech Stack

---

## 🏗️ Architecture

```
Factory Contract (deployed once)
    └── create_gift(...)
            ├── env.deployer() → deploys new Vault contract
            ├── token.transfer(sender → vault_addr, amount)
            └── vault.initialize(admin, recipient, lock_type, lock_value)

Vault Contract (one per gift)
    ├── initialize(admin, recipient, token, amount, lock_type, lock_value)
    ├── claim(riddle_answer?) → verifies lock, releases funds to recipient
    └── get_info() → (lock_type, amount, recipient)
```

---

## 🚀 Getting Started

### Prerequisites

- [Rust + Cargo](https://rustup.rs/) + `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/cli/install-cli)
- [Node.js 18+](https://nodejs.org/)
- [Freighter Wallet](https://www.freighter.app/) browser extension

---

### 1. Build & Deploy Contracts

```bash
cd contracts/

# Add WASM target if not already installed
rustup target add wasm32-unknown-unknown

# Build both contracts
cargo build --target wasm32-unknown-unknown --release

# Create and fund a testnet account
stellar keys generate alice --network testnet --fund

# Upload Vault WASM to network (saves WASM hash)
stellar contract install \
  --wasm target/wasm32-unknown-unknown/release/gift_vault.wasm \
  --source alice --network testnet

# Deploy Factory contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/gift_factory.wasm \
  --source alice --network testnet
```

> Copy the **Factory Contract ID** and **Vault WASM Hash** output from the commands above.

---

### 2. Configure Frontend

```bash
cd frontend/
cp .env.local.example .env.local   # or edit .env.local directly
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_FACTORY_CONTRACT_ID=<your-factory-id>
NEXT_PUBLIC_VAULT_WASM_HASH=<vault-wasm-hash-from-install>
NEXT_PUBLIC_NATIVE_TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN
```

---

### 3. Run the Frontend

```bash
cd frontend/
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Contract Tests

```bash
cd contracts/
cargo test
```

Tests cover:
- ✅ Time-lock: successful claim after timestamp  
- ✅ Time-lock: failure when claiming too early  
- ✅ Hash-lock: successful claim with correct answer  
- ✅ Hash-lock: failure with wrong answer  

---

## 📁 Project Structure

```
stellar.giftcard/
├── contracts/
│   ├── Cargo.toml          # Workspace manifest
│   ├── vault/
│   │   └── src/
│   │       ├── lib.rs      # Vault contract (Time/Hash lock + claim)
│   │       └── test.rs     # Unit tests
│   └── factory/
│       └── src/
│           └── lib.rs      # Factory contract (creates Vaults)
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx                    # Sender Dashboard
    │   │   └── claim/[vault_id]/page.tsx   # Claim Page
    │   ├── components/
    │   │   └── WalletConnect.tsx            # Freighter connect button
    │   └── utils/
    │       ├── freighter.ts                # Freighter wallet helpers
    │       ├── soroban-contract.ts         # Contract call utilities
    │       └── crypto.ts                   # SHA-256 hash utility
    └── .env.local                          # RPC + contract ID config
```

---

## 🛡️ Security

- **Hash-lock answers** are never stored in plain text. Only the SHA-256 hash is stored on-chain.
- Each Gift Card deploys a fresh Vault contract — funds are isolated.
- Contracts use `require_auth()` to ensure only the sender can authorize token transfers.

---

## 👤 Author

**Built by Ayush** — exploring the future of programmable finance on the **Stellar/Soroban** platform.
