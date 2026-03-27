import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import WalletConnect from '@/components/WalletConnect';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Stellar GiftCard | Web3 Gifting',
  description: 'A decentralized, programmable gift card system on Stellar Testnet.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen antialiased flex flex-col`}>
        {/* Navigation Bar */}
        <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 rounded-none border-x-0 border-t-0 py-4 px-6 md:px-12 flex justify-between items-center bg-slate-900/80">
          <div className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 tracking-tight">
            Stellar GiftCard
          </div>
          <div>
            <WalletConnect />
          </div>
        </nav>
        
        <main className="flex-grow pt-28 px-4 pb-12 flex flex-col items-center">
          {children}
        </main>
      </body>
    </html>
  );
}
