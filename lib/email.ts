import nodemailer from 'nodemailer'

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null

/**
 * Check if email is configured and ready to use
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!isEmailConfigured()) {
      throw new Error('Gmail SMTP credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local')
    }
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  }
  return transporter
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  message: string // Plain text
  html?: string   // Optional HTML version
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email using Gmail SMTP
 * This function should only be called from server-side code (API routes, Server Actions)
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  try {
    const transport = getTransporter()

    const mailOptions = {
      from: `"${process.env.GMAIL_FROM_NAME || 'Invoice Platform'}" <${process.env.GMAIL_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message.replace(/\n/g, '<br>'),
    }

    const info = await transport.sendMail(mailOptions)

    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Verify SMTP connection is working
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transport = getTransporter()
    await transport.verify()
    return true
  } catch (error) {
    console.error('Email connection verification failed:', error)
    return false
  }
}
