import bcryptjs from 'bcryptjs'

const password = process.argv[2]

if (!password) {
  console.error('Usage: npx ts-node scripts/hash-password.ts <password>')
  process.exit(1)
}

bcryptjs
  .hash(password, 12)
  .then((hash) => {
    console.log('\nPaste this into APP_PASSWORD_HASH:\n')
    console.log(hash)
  })
  .catch((error) => {
    console.error('Failed to hash password', error)
    process.exit(1)
  })
