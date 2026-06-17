import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StockWatch',
  description: 'Private Indian stock watchlist and alert dashboard',
  applicationName: 'StockWatch',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'StockWatch',
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="relative min-h-screen bg-background-primary text-text-primary overflow-x-hidden antialiased">
        {/* Apple liquid background mesh gradient blobs */}
        <div className="pointer-events-none fixed inset-0 -z-50 overflow-hidden select-none">
          <div className="absolute -left-[10%] -top-[10%] h-[60vw] w-[60vw] rounded-full bg-blue-600/10 blur-[130px]" />
          <div className="absolute -right-[10%] -bottom-[10%] h-[60vw] w-[60vw] rounded-full bg-purple-600/10 blur-[130px]" />
          <div className="absolute left-[20%] top-[30%] h-[40vw] w-[40vw] rounded-full bg-emerald-500/5 blur-[120px]" />
        </div>
        {children}
      </body>
    </html>
  )
}
