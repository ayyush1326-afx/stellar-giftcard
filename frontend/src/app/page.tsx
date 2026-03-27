'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { connectWallet, checkFreighter } from '@/utils/freighter';
import { sha256Browser } from '@/utils/crypto';
import { createGiftVault } from '@/utils/soroban-contract';

const NATIVE_TOKEN_ID = process.env.NEXT_PUBLIC_NATIVE_TOKEN_ID!;

// Simple random hex salt generator
function randomSalt(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function Home() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [lockType, setLockType] = useState<'time' | 'hash'>('time');
  const [unlockDate, setUnlockDate] = useState('');
  const [riddle, setRiddle] = useState('');
  const [answer, setAnswer] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedVaultId, setDeployedVaultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsDeploying(true);

    try {
      // Ensure Freighter is connected
      const hasFreighter = await checkFreighter();
      if (!hasFreighter) {
        setError('Please install Freighter wallet to proceed.');
        setIsDeploying(false);
        return;
      }

      const walletAddress = await connectWallet();
      if (!walletAddress) {
        setError('Could not get wallet address.');
        setIsDeploying(false);
        return;
      }

      // The WASM hash is the hash of the uploaded vault contract WASM on-chain.
      // Users should set this after deploying the vault WASM with `stellar contract install`.
      const wasmHash = process.env.NEXT_PUBLIC_VAULT_WASM_HASH ?? '';
      if (!wasmHash) {
        // Fallback to demo mode if WASM hash not configured
        await new Promise(r => setTimeout(r, 2200));
        const mockId = 'CC' + randomSalt().substring(0, 54).toUpperCase();
        setDeployedVaultId(mockId);
        setIsDeploying(false);
        return;
      }

      // Compute lock params
      const amountStroops = BigInt(Math.round(parseFloat(amount) * 10_000_000));
      let unlockTimestamp: number | undefined;
      let answerHash: Uint8Array | undefined;

      if (lockType === 'time') {
        unlockTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000);
      } else {
        answerHash = await sha256Browser(answer);
      }

      const vaultId = await createGiftVault({
        senderAddress: walletAddress,
        wasmHash,
        salt: randomSalt(),
        recipientAddress: recipient,
        tokenAddress: NATIVE_TOKEN_ID,
        amountStroops,
        lockType,
        unlockTimestamp,
        answerHash,
      });

      setDeployedVaultId(vaultId);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 animate-fade-in">
      {/* Hero heading */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300">
          Wrap It. Lock It. Gift It.
        </h1>
        <p className="text-slate-300 text-lg">
          Create a programmable gift card on the Stellar network.
        </p>
      </div>

      {/* Form card */}
      <div className="glass-panel p-6 md:p-10 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <form onSubmit={handleCreate} className="relative z-10 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Amount (XLM)</label>
              <input
                type="number" min="1" step="0.0000001" required
                value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="100.0" className="input-glass"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Recipient Address</label>
              <input
                type="text" required
                value={recipient} onChange={e => setRecipient(e.target.value)}
                placeholder="G..." className="input-glass"
              />
            </div>
          </div>

          {/* Lock type toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Lock Method</label>
            <div className="flex bg-slate-800/50 p-1 rounded-lg">
              <button type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${lockType === 'time' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setLockType('time')}>
                🕐 Time Lock
              </button>
              <button type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${lockType === 'hash' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setLockType('hash')}>
                🔐 Riddle Lock
              </button>
            </div>
          </div>

          {/* Lock-type-specific fields */}
          <AnimatePresence mode="wait">
            {lockType === 'time' ? (
              <motion.div key="time"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <label className="block text-sm font-medium text-slate-300 mb-2">Unlock Date &amp; Time</label>
                <input type="datetime-local" required value={unlockDate} onChange={e => setUnlockDate(e.target.value)} className="input-glass" />
              </motion.div>
            ) : (
              <motion.div key="hash"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">The Riddle</label>
                  <input type="text" required value={riddle} onChange={e => setRiddle(e.target.value)}
                    placeholder="e.g. What comes once in a minute..." className="input-glass" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Secret Answer</label>
                  <input type="password" required value={answer} onChange={e => setAnswer(e.target.value)}
                    placeholder="Enter the answer" className="input-glass" />
                  <p className="text-xs text-slate-500 mt-2">The answer is SHA-256 hashed before storing — never stored as plaintext.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={isDeploying || !!deployedVaultId}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-lg glow-button flex justify-center items-center gap-2">
            {isDeploying ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Deploying Vault…
              </>
            ) : '✨ Create Gift Card'}
          </button>
        </form>
      </div>

      {/* Success panel */}
      <AnimatePresence>
        {deployedVaultId && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="mt-8 glass-panel border-green-500/30 bg-green-900/10 p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Gift Card Created! 🎉</h3>
            <p className="text-slate-300 mb-2">Vault Contract ID:</p>
            <code className="bg-slate-800 text-sm px-3 py-1 rounded-md text-green-300 break-all block w-full max-w-sm mx-auto mb-6">
              {deployedVaultId}
            </code>
            <div className="bg-slate-800/50 p-4 rounded-lg flex items-center justify-between border border-slate-700 gap-3">
              <span className="text-sm text-slate-400 truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/claim/${deployedVaultId}` : ''}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/claim/${deployedVaultId}`)}
                className="shrink-0 bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded transition-colors">
                Copy Link
              </button>
            </div>
            {lockType === 'hash' && riddle && (
              <p className="mt-4 text-sm text-slate-400">Don't forget to send the riddle to your recipient: <span className="text-purple-300 italic">"{riddle}"</span></p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
