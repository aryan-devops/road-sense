import type { Metadata, Viewport } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'RoadSense — Adaptive Autonomous Navigation for Indian Roads',
  description: 'RoadSense is an intelligent autonomous driving simulation platform built for Smart India Hackathon 2026. Demonstrating adaptive path planning and collision avoidance for unstructured Indian roads.',
  keywords: ['autonomous driving', 'India', 'SIH 2026', 'path planning', 'collision avoidance', 'simulation'],
  authors: [{ name: 'Team RoadSense' }],
  openGraph: {
    title: 'RoadSense',
    description: 'Intelligent Navigation for India\'s Unstructured Roads',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F2EFE7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
