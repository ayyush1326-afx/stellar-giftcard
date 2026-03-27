import {
  isConnected as checkConnection,
  requestAccess,
  getAddress,
  signTransaction
} from '@stellar/freighter-api';

export async function checkFreighter(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const res: any = await checkConnection();
  return res.isConnected ?? !!res;
}

export async function connectWallet(): Promise<string | null> {
  try {
    const isInstalled = await checkFreighter();
    if (!isInstalled) {
      alert("Freighter wallet is not installed or not accessible in this browser.");
      return null;
    }
    const access: any = await requestAccess();
    if (access && access.error) {
      console.error("Freighter access error:", access.error);
      alert(`Freighter error: ${access.error}`);
      return null;
    }
    const result: any = await getAddress();
    if (result && result.error) {
      console.error("Freighter getAddress error:", result.error);
      alert(`Freighter error: ${result.error}`);
      return null;
    }
    return result.address || result;
  } catch (e: any) {
    console.error("connectWallet exception:", e);
    alert(`Wallet connection failed: ${e.message || String(e)}`);
    return null;
  }
}

export function formatAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}
