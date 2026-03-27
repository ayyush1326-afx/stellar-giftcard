'use client';

import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { connectWallet } from '@/utils/freighter';
import { claimGiftVault } from '@/utils/soroban-contract';

export default function ClaimPage(props: { params: Promise<{ vault_id: string }> }) {
  const params = use(props.params);
  const vaultId: string = params.vault_id;

  const [isFlipped, setIsFlipped] = useState(false);
  const [lockType] = useState<'time' | 'hash'>('hash'); // Would be fetched from the contract
  const [riddleAnswer, setRiddleAnswer] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Countdown state (only relevant for time-lock)
  const [timeLeft, setTimeLeft] = useState<string>('Loading…');

  // Demo: simulate a 2-minute countdown for time-lock display
  const unlockTimestampDemo = Date.now() + 2 * 60 * 1000; // 2 min from now
  useEffect(() => {
    if (lockType !== 'time') return;
    const interval = setInterval(() => {
      const diff = unlockTimestampDemo - Date.now();
      if (diff <= 0) { setTimeLeft('Unlocked!'); clearInterval(interval); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockType]);

  const handleClaim = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsClaiming(true);

    try {
      const walletAddress = await connectWallet();
      if (!walletAddress) { setError('Please connect your Freighter wallet.'); setIsClaiming(false); return; }

      await claimGiftVault({
        callerAddress: walletAddress,
        vaultContractId: vaultId,
        riddleAnswer: lockType === 'hash' ? riddleAnswer : undefined,
      });

      setIsClaimed(true);
    } catch (err: any) {
      // Surface friendly messages for known errors
      const msg: string = err?.message ?? '';
      if (msg.includes('too early')) setError('⏳ The gift is still locked. Please wait until the unlock time.');
      else if (msg.includes('incorrect answer')) setError('❌ Wrong answer. Try again!');
      else setError(`Error: ${msg}`);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto mt-12 md:mt-20 px-4 flex flex-col justify-center items-center min-h-[60vh]">
      {!isClaimed && (
        <div className="text-center mb-10 w-full">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">
            You've received a Gift! 🎁
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Vault:{' '}
            <code className="text-xs bg-slate-800/50 p-1 rounded text-purple-200">
              {vaultId?.slice(0, 8)}…{vaultId?.slice(-6)}
            </code>
          </p>
        </div>
      )}

      {/* Claimed success */}
      {isClaimed ? (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-panel p-10 text-center relative overflow-hidden w-full">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-blue-500/10 pointer-events-none" />
          <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 relative z-10">Tokens Claimed! 🎉</h2>
          <p className="text-slate-300 relative z-10">XLM has been transferred to your wallet via Stellar Asset Contract.</p>
        </motion.div>
      ) : (
        /* -------- FLIP CARD -------- */
        <div className="relative w-full" style={{ perspective: '1000px' }} onClick={() => !isFlipped && setIsFlipped(true)}>
          <motion.div
            className="w-full relative shadow-2xl rounded-2xl cursor-pointer"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformStyle: 'preserve-3d', aspectRatio: '1.586' }}
          >
            {/* ---- FRONT ---- */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden glass-panel border border-blue-500/30 flex flex-col justify-center items-center p-8 bg-gradient-to-br from-slate-800 to-slate-900 hover:shadow-blue-500/20 hover:shadow-lg transition-shadow"
              style={{ backfaceVisibility: 'hidden' }}>
              <div className="absolute top-5 left-6 opacity-20">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" className="text-blue-200">
                  <path d="M12 2L2 22h20L12 2zm0 4.1L18.4 19H5.6L12 6.1z" />
                </svg>
              </div>
              <div className="text-center select-none">
                <div className="text-6xl mb-4">🎁</div>
                <h2 className="text-3xl font-bold text-white tracking-widest font-mono">GIFT CARD</h2>
                <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-4 rounded-full" />
              </div>
              <p className="absolute bottom-6 text-sm text-slate-400 font-mono tracking-wider">TAP TO OPEN</p>
            </div>

            {/* ---- BACK ---- */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden glass-panel flex flex-col p-6 bg-gradient-to-br from-slate-900 to-[#1a1c29] border border-purple-500/30"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              {/* Magnetic stripe */}
              <div className="w-full h-10 bg-black/50 -mx-6 mb-5 px-6 flex items-center">
                <div className="h-4 w-full bg-slate-800 rounded overflow-hidden">
                  <div className="w-1/3 bg-slate-700/50 h-full" />
                </div>
              </div>

              <div className="flex-grow flex flex-col justify-center items-center" onClick={e => e.stopPropagation()}>
                {lockType === 'hash' ? (
                  <form onSubmit={handleClaim} className="w-full px-2">
                    <p className="text-sm text-purple-300 font-semibold mb-3 text-center uppercase tracking-widest">🔐 Unlock Puzzle</p>
                    <input
                      type="text" required placeholder="Enter the secret answer…"
                      className="input-glass w-full text-center py-3 bg-black/30 mb-4"
                      value={riddleAnswer} onChange={e => setRiddleAnswer(e.target.value)}
                    />
                    {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}
                    <button type="submit" disabled={isClaiming}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(147,51,234,0.4)] disabled:opacity-50">
                      {isClaiming ? (
                        <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Verifying…</>
                      ) : 'Unlock Gift'}
                    </button>
                  </form>
                ) : (
                  <div className="w-full text-center px-2">
                    <p className="text-sm text-blue-300 font-semibold mb-2 uppercase tracking-widest">🕐 Time Lock Active</p>
                    <div className="text-4xl font-mono font-bold text-white mb-6">{timeLeft}</div>
                    {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
                    <button onClick={() => handleClaim()} disabled={isClaiming}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.4)] disabled:opacity-50">
                      {isClaiming ? 'Processing…' : 'Claim Now'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
