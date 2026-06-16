const APP_URL = process.env.APP_URL
const QSTASH_TOKEN = process.env.QSTASH_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

if (!APP_URL || !QSTASH_TOKEN || !CRON_SECRET) {
  console.error('APP_URL, QSTASH_TOKEN, and CRON_SECRET are required.')
  process.exit(1)
}

const schedules = [
  { path: '/api/cron/morning-open', cron: '45 3 * * 1-5', name: 'Morning Open' },
  { path: '/api/cron/hourly-update', cron: '30 4-9 * * 1-5', name: 'Hourly Update' },
  { path: '/api/cron/eod-summary', cron: '5 10 * * 1-5', name: 'EOD Summary' },
]

async function createSchedule(path: string, cron: string, name: string) {
  const res = await fetch('https://qstash.upstash.io/v2/schedules', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destination: `${APP_URL}${path}`,
      cron,
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
      },
    }),
  })
  const data = await res.json()
  console.log(`${name}: ${cron}`, data)
}

Promise.all(schedules.map((schedule) => createSchedule(schedule.path, schedule.cron, schedule.name)))
  .then(() => console.log('\nAll QStash schedules registered.'))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
