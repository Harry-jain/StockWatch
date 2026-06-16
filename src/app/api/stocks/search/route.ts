import { NextRequest, NextResponse } from 'next/server'
import { searchStocks } from '@/lib/yahoo-finance'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') ?? ''
  const results = await searchStocks(query)
  return NextResponse.json({ results })
}
