'use server';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const getFromAddress = () => process.env.EMAIL_FROM || 'Aaura Ads <no-reply@aaura.live>';

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured; skipping email send.');
    return;
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getFromAddress(),
        to,
        subject,
        html,
        text,
      }),
    });
  } catch (error) {
    console.error('Failed to send transactional email', error);
  }
}
