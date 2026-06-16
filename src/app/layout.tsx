import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StockWatch',
  description: 'Private Indian stock watchlist and alert dashboard',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
