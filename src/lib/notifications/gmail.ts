import nodemailer from 'nodemailer'

export async function sendGmail(subject: string, htmlBody: string): Promise<void> {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  const to = process.env.GMAIL_TO || user
  if (!user || !pass || !to) return

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })

    await transporter.sendMail({
      from: `StockWatch <${user}>`,
      to,
      subject,
      html: htmlBody,
    })
  } catch (error) {
    console.error('Gmail send failed', error)
  }
}
