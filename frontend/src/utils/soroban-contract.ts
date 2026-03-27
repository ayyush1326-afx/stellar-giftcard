import {
  Contract,
  Networks,
  rpc as StellarRpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  Address,
  xdr,
  scValToNative,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015';
const FACTORY_CONTRACT_ID = process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID ?? '';

const server = new StellarRpc.Server(RPC_URL, { allowHttp: false });

/**
 * Computes a SHA-256 hash of an answer string using the browser SubtleCrypto API.
 * Returns a 32-byte Uint8Array — exactly what the Vault contract expects.
 */
export async function sha256Answer(answer: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(answer);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

/**
 * Generic helper: builds, simulates, signs (via Freighter), and submits a Soroban transaction.
 */
async function invokeContract(
  callerAddress: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[]
): Promise<xdr.ScVal | undefined> {
  const account = await server.getAccount(callerAddress);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (StellarRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = StellarRpc.assembleTransaction(tx, simResult).build();

  const signedResult: any = await signTransaction(preparedTx.toEnvelope().toXDR('base64'), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const signedXdr: string = typeof signedResult === 'string' ? signedResult : signedResult.signedTxXdr;

  const submitResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  );

  if (submitResult.status === 'ERROR') {
    throw new Error(`Transaction failed to submit`);
  }

  // Poll until confirmed
  let getResult = await server.getTransaction(submitResult.hash);
  let attempts = 0;
  while (getResult.status === StellarRpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20) {
    await new Promise((r) => setTimeout(r, 1500));
    getResult = await server.getTransaction(submitResult.hash);
    attempts++;
  }

  if (getResult.status === StellarRpc.Api.GetTransactionStatus.FAILED) {
    throw new Error('Transaction failed on-chain');
  }

  return (getResult as StellarRpc.Api.GetSuccessfulTransactionResponse).returnValue;
}

export interface CreateGiftParams {
  senderAddress: string;
  wasmHash: string;         // 64-char hex of the installed Vault WASM hash
  salt: string;             // 64-char hex random salt for the deployer
  recipientAddress: string;
  tokenAddress: string;
  amountStroops: bigint;    // 1 XLM = 10_000_000 stroops
  lockType: 'time' | 'hash';
  unlockTimestamp?: number; // Unix epoch seconds (for Time-lock)
  answerHash?: Uint8Array;  // 32-byte SHA-256 hash (for Hash-lock)
}

/** Deploys a new Vault via the Factory contract. Returns the new Vault contract address. */
export async function createGiftVault(params: CreateGiftParams): Promise<string> {
  const {
    senderAddress, wasmHash, salt, recipientAddress, tokenAddress,
    amountStroops, lockType, unlockTimestamp, answerHash,
  } = params;

  const lockTypeScVal =
    lockType === 'time'
      ? xdr.ScVal.scvVec([nativeToScVal('Time', { type: 'symbol' })])
      : xdr.ScVal.scvVec([nativeToScVal('Hash', { type: 'symbol' })]);

  const lockValueTimeScVal =
    unlockTimestamp !== undefined
      ? xdr.ScVal.scvVec([nativeToScVal(true), nativeToScVal(unlockTimestamp, { type: 'u64' })])
      : xdr.ScVal.scvVec([nativeToScVal(false)]);

  const lockValueHashScVal =
    answerHash !== undefined
      ? xdr.ScVal.scvVec([nativeToScVal(true), xdr.ScVal.scvBytes(Buffer.from(answerHash))])
      : xdr.ScVal.scvVec([nativeToScVal(false)]);

  const args: xdr.ScVal[] = [
    new Address(senderAddress).toScVal(),
    xdr.ScVal.scvBytes(Buffer.from(wasmHash, 'hex')),
    xdr.ScVal.scvBytes(Buffer.from(salt, 'hex')),
    new Address(recipientAddress).toScVal(),
    new Address(tokenAddress).toScVal(),
    nativeToScVal(amountStroops, { type: 'i128' }),
    lockTypeScVal,
    lockValueTimeScVal,
    lockValueHashScVal,
  ];

  const result = await invokeContract(senderAddress, FACTORY_CONTRACT_ID, 'create_gift', args);
  if (!result) throw new Error('No return value from Factory contract');
  return scValToNative(result) as string;
}

export interface ClaimGiftParams {
  callerAddress: string;
  vaultContractId: string;
  riddleAnswer?: string; // Plaintext — sent as raw bytes to the contract
}

/** Calls `claim` on the Vault contract. */
export async function claimGiftVault(params: ClaimGiftParams): Promise<void> {
  const { callerAddress, vaultContractId, riddleAnswer } = params;

  const riddleScVal =
    riddleAnswer !== undefined
      ? xdr.ScVal.scvVec([
          nativeToScVal(true),
          xdr.ScVal.scvBytes(Buffer.from(riddleAnswer, 'utf8')),
        ])
      : xdr.ScVal.scvVec([nativeToScVal(false)]);

  await invokeContract(callerAddress, vaultContractId, 'claim', [riddleScVal]);
}
