import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GymTracker Pro',
  description: 'Track your gym program and progress',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0A0A0F] text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
