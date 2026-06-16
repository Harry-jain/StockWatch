const assert = require('node:assert/strict')
const test = require('node:test')
const { isMarketOpen } = require('../lib/market')

test('market is closed on Sunday', () => {
  assert.equal(isMarketOpen(new Date('2026-06-14T06:00:00.000Z')), false)
})

test('market is closed before 09:15 IST', () => {
  assert.equal(isMarketOpen(new Date('2026-06-16T03:40:00.000Z')), false)
})

test('market is closed after 15:30 IST', () => {
  assert.equal(isMarketOpen(new Date('2026-06-16T10:01:00.000Z')), false)
})

test('market is closed on NSE holiday', () => {
  assert.equal(isMarketOpen(new Date('2026-01-26T05:00:00.000Z')), false)
})

export {}
