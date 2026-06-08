
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { PresenceTracker } from "@/components/realtime/presence-tracker";

export const metadata: Metadata = {
  title: 'Lynk | Professional Agile Management',
  description: 'Manage projects, track time, and collaborate with AI-powered task breakdowns.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background selection:bg-primary/20" suppressHydrationWarning>
        {/* suppressHydrationWarning on the div below silences mismatches caused by
            browser extensions (e.g. password managers, skin checkers) that inject
            attributes like bis_skin_checked="1" into the DOM before React hydrates. */}
        <div suppressHydrationWarning>
          <FirebaseClientProvider>
            <PresenceTracker />
            {children}
            <Toaster />
          </FirebaseClientProvider>
        </div>
      </body>
    </html>
  );
}
