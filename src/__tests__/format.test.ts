const assert = require('node:assert/strict')
const test = require('node:test')
const { formatINR, formatPercent } = require('../lib/format')

test('formatINR formats Indian rupees', () => {
  assert.equal(formatINR(2456.3), '₹2,456.30')
})

test('formatPercent formats positive values', () => {
  assert.equal(formatPercent(3.456), '+3.46%')
})

test('formatPercent formats negative values', () => {
  assert.equal(formatPercent(-1.2), '-1.20%')
})

export {}
