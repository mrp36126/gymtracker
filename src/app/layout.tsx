import type { Metadata, Viewport } from 'next';
import './globals.css';
import { WorkoutTimerProvider } from '@/components/timer/WorkoutTimerProvider';

export const metadata: Metadata = {
  title: 'GymTracker Pro',
  description: 'Track your gym program and progress',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0A0A0F] text-white min-h-screen overflow-x-hidden">
        <WorkoutTimerProvider>{children}</WorkoutTimerProvider>
      </body>
    </html>
  );
}
