
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import Script from 'next/script';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: 'CodeMuse - Python Web IDE',
  description: 'A web-based Python IDE with AI-powered code assistance.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <Script src="https://cdn.jsdelivr.net/npm/skulpt@1.2.0/skulpt.min.js" strategy="beforeInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/skulpt@1.2.0/skulpt-stdlib.js" strategy="beforeInteractive" />
      </head>
      <body className={`font-sans antialiased`}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
