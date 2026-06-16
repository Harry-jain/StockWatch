const assert = require('node:assert/strict')
const test = require('node:test')
const { comparePassword, hashPassword, signJwt, verifyJwt } = require('../lib/auth')

test('hashPassword and comparePassword round-trip', async () => {
  const hash = await hashPassword('correct-password')
  assert.equal(await comparePassword('correct-password', hash), true)
})

test('wrong password returns false', async () => {
  const hash = await hashPassword('correct-password')
  assert.equal(await comparePassword('wrong-password', hash), false)
})

test('signJwt and verifyJwt round-trip', async () => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough'
  const token = await signJwt({ sub: 'admin', role: 'owner' })
  const payload = await verifyJwt(token)
  assert.equal(payload?.sub, 'admin')
  assert.equal(payload?.role, 'owner')
})

test('tampered token returns null', async () => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough'
  const token = await signJwt({ sub: 'admin' })
  const tampered = `${token.slice(0, -3)}abc`
  assert.equal(await verifyJwt(tampered), null)
})

export {}
