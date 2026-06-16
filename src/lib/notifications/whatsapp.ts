function isEnabled(): boolean {
  return process.env.WHATSAPP_ENABLED === 'true'
}

async function sendWhatsApp(to: string, message: string): Promise<void> {
  if (!isEnabled()) return
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM
  if (!sid || !token || !from || !to) return

  try {
    const body = new URLSearchParams({ From: from, To: to, Body: message })
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!res.ok) {
      console.error('Twilio WhatsApp send failed', await res.text())
    }
  } catch (error) {
    console.error('Twilio WhatsApp network error', error)
  }
}

export async function sendWhatsAppPersonal(message: string): Promise<void> {
  await sendWhatsApp(process.env.WHATSAPP_PERSONAL_TO ?? '', message)
}

export async function sendWhatsAppFamily(message: string): Promise<void> {
  const recipients = (process.env.WHATSAPP_FAMILY_TO ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  await Promise.allSettled(recipients.map((recipient) => sendWhatsApp(recipient, message)))
}
