const assert = require('node:assert/strict')
const test = require('node:test')
const { checkAndStorePrice, checkCustomAlerts } = require('../lib/price-alert')
const { saveCustomAlerts } = require('../lib/redis')

test('6% increase triggers alert', async () => {
  await checkAndStorePrice('ALERT6.NS', 100)
  const result = await checkAndStorePrice('ALERT6.NS', 106)
  assert.equal(result.isAlert, true)
  assert.equal(result.direction, 'up')
})

test('4.9% increase does not trigger alert', async () => {
  await checkAndStorePrice('ALERT49.NS', 100)
  const result = await checkAndStorePrice('ALERT49.NS', 104.9)
  assert.equal(result.isAlert, false)
})

test('5% exactly triggers alert', async () => {
  await checkAndStorePrice('ALERT5.NS', 100)
  const result = await checkAndStorePrice('ALERT5.NS', 105)
  assert.equal(result.isAlert, true)
})

test('negative change direction is down', async () => {
  await checkAndStorePrice('ALERTDOWN.NS', 100)
  const result = await checkAndStorePrice('ALERTDOWN.NS', 94)
  assert.equal(result.direction, 'down')
  assert.equal(result.isAlert, true)
})

test('custom alert above triggers when price crossed above', async () => {
  const symbol = 'TCS_TEST.NS'
  const alertId = 'alert-1'
  await saveCustomAlerts(symbol, [{
    id: alertId,
    threshold: 4000,
    direction: 'above',
    triggered: false,
    createdAt: new Date().toISOString()
  }])

  let triggered = await checkCustomAlerts(symbol, 3999)
  assert.equal(triggered.length, 0)
  
  triggered = await checkCustomAlerts(symbol, 4001)
  assert.equal(triggered.length, 1)
  assert.equal(triggered[0].id, alertId)
  assert.equal(triggered[0].triggered, true)

  triggered = await checkCustomAlerts(symbol, 4005)
  assert.equal(triggered.length, 0)
})

test('custom alert below triggers when price crossed below', async () => {
  const symbol = 'INFY_TEST.NS'
  const alertId = 'alert-2'
  await saveCustomAlerts(symbol, [{
    id: alertId,
    threshold: 1500,
    direction: 'below',
    triggered: false,
    createdAt: new Date().toISOString()
  }])

  let triggered = await checkCustomAlerts(symbol, 1501)
  assert.equal(triggered.length, 0)
  
  triggered = await checkCustomAlerts(symbol, 1499)
  assert.equal(triggered.length, 1)
  assert.equal(triggered[0].id, alertId)
  assert.equal(triggered[0].triggered, true)
})

export {}
