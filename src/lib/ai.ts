/**
 * ai.ts — AI-generated stock insight via Google's Gemini API.
 *
 * Note on model naming: "Gemma 26B" as requested isn't a real released size
 * (Google's open Gemma family ships as 2B/9B/27B for Gemma 2, or
 * 1B/4B/12B/27B for Gemma 3) and Gemma models aren't normally something a
 * webapp calls directly the way it calls the hosted Gemini API. This
 * integration calls Google's actual hosted Gemini API (the one you get a
 * key for at aistudio.google.com), with the exact model name configurable
 * via GEMINI_MODEL so you can point it at any current Gemini -- or Gemma
 * variant, if Google's API ever exposes one under that endpoint -- without
 * a code change.
 */

import { redis } from '@/lib/redis'

const INSIGHT_CACHE_TTL = 600 // seconds — avoid burning API quota on repeat clicks

export interface StockInsightInput {
  symbol: string
  shortName: string
  price: number
  changePercent: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  pe: number | null
  portfolioQty?: number
  portfolioAvgPrice?: number
  notes?: string
}

function buildPrompt(input: StockInsightInput): string {
  const position = input.portfolioQty
    ? `The user holds ${input.portfolioQty} shares at an average price of ₹${input.portfolioAvgPrice}.`
    : 'The user does not currently hold a position in this stock.'
  const notes = input.notes?.trim() ? `The user's own notes on this stock: "${input.notes.trim()}"` : ''

  return [
    'You are a measured markets analyst inside a personal portfolio-tracking app for one user in India.',
    `Stock: ${input.symbol} (${input.shortName})`,
    `Current price: ₹${input.price.toFixed(2)}`,
    `Today's change: ${input.changePercent.toFixed(2)}%`,
    `52-week range: ₹${input.fiftyTwoWeekLow.toFixed(2)} – ₹${input.fiftyTwoWeekHigh.toFixed(2)}`,
    `P/E: ${input.pe ?? 'not available'}`,
    position,
    notes,
    '',
    'In 4-6 sentences, give a balanced, factor-based perspective: where the price sits in its range, anything notable about the move, and what would be worth watching next. Do not issue a definitive buy/sell/hold instruction -- present considerations and let the user weigh them. Keep it concise and free of disclaimers about being an AI.',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function getStockInsight(input: StockInsightInput): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const cacheKey = `stockwatch:ai_insight:${input.symbol}`
  try {
    const cached = await redis.get<string>(cacheKey)
    if (cached) return cached
  } catch { /* miss */ }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const prompt = buildPrompt(input)

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
        }),
      },
    )

    if (!res.ok) {
      console.error('Gemini API error', res.status, await res.text())
      return null
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
    if (!text) return null

    try {
      await redis.set(cacheKey, text, { ex: INSIGHT_CACHE_TTL })
    } catch { /* non-fatal */ }

    return text
  } catch (error) {
    console.error('Gemini request failed', error)
    return null
  }
}
