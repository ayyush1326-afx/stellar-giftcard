'use client';

import { useState, useEffect } from 'react';
import { checkFreighter, connectWallet, formatAddress } from '@/utils/freighter';

export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Optionally check if already connected
    checkFreighter().then(async isConnected => {
      // In Freighter, getting address might prompt if not already approved, 
      // so we only do it on explicit connect click usually.
    });
  }, []);

  const handleConnect = async () => {
    const addr = await connectWallet();
    if (addr) setAddress(addr);
  };

  if (!isClient) return null;

  return (
    <div>
      {address ? (
        <span className="glass-panel px-4 py-2 text-sm font-medium text-blue-200">
          {formatAddress(address)}
        </span>
      ) : (
        <button 
          onClick={handleConnect}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-full glow-button transition-colors"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}
