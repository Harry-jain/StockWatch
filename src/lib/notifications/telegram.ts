async function sendTelegram(chatId: string | undefined, message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !chatId) return

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      }),
    })

    if (!res.ok) {
      console.error('Telegram send failed', await res.text())
    }
  } catch (error) {
    console.error('Telegram network error', error)
  }
}

export async function sendTelegramPersonal(message: string): Promise<void> {
  await sendTelegram(process.env.TELEGRAM_PERSONAL_CHAT_ID, message)
}

export async function sendTelegramGroup(message: string): Promise<void> {
  await sendTelegram(process.env.TELEGRAM_GROUP_CHAT_ID, message)
}

export async function sendTelegramBoth(message: string): Promise<void> {
  await Promise.allSettled([sendTelegramPersonal(message), sendTelegramGroup(message)])
}
