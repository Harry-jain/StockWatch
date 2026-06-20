export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { computePortfolioSummary } from '@/lib/portfolio'

export async function GET() {
  const summary = await computePortfolioSummary()
  return NextResponse.json(summary)
}
