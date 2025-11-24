// src/lib/server/email.ts
// Email helper for sending messages via QuiverShare using Resend

import { Resend } from 'resend';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  try {
    // Convert plain text body to simple HTML
    // Escape HTML and convert newlines to <br>
    const htmlBody = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject: subject,
      html: `<div style="font-family: sans-serif; line-height: 1.6;">${htmlBody}</div>`
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
    }

    if (!data) {
      console.error('Resend API returned no data');
      throw new Error('Failed to send email: No response from email service');
    }
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
}

