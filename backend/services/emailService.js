import nodemailer from 'nodemailer';

import dns from 'dns';
import { promisify } from 'util';

// Force ALL DNS to resolve IPv4 first (Render blocks IPv6 outbound)
dns.setDefaultResultOrder('ipv4first');

// Resolve Gmail SMTP to IPv4 address directly
const resolve4 = promisify(dns.resolve4);
let gmailIPv4 = null;

async function getGmailHost() {
  if (gmailIPv4) return gmailIPv4;
  try {
    const addresses = await resolve4('smtp.gmail.com');
    gmailIPv4 = addresses[0];
    console.log('[EMAIL] Resolved smtp.gmail.com to IPv4:', gmailIPv4);
    return gmailIPv4;
  } catch {
    return 'smtp.gmail.com';
  }
}

function createTransporter(host) {
  return nodemailer.createTransport({
    host,
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER || 'smohamedassil@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD || 'rxde osbj bpun iycl',
    },
    tls: { rejectUnauthorized: false, servername: 'smtp.gmail.com' },
  });
}

/**
 * Send an email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
export const sendEmail = async (to, subject, html) => {
  try {
    const host = await getGmailHost();
    const t = createTransporter(host);
    await t.sendMail({
      from: `"FlipLearn" <${process.env.GMAIL_USER || 'smohamedassil@gmail.com'}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('[EMAIL] Error:', err.message);
    // Don't throw — email failure shouldn't break the app
  }
};

/**
 * Send a notification email with FlipLearn template
 */
export const sendNotificationEmail = async (to, title, message) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1B4F72, #2874A6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📚 FlipLearn</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">Plateforme de Classe Inversée</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1B4F72; margin: 0 0 12px; font-size: 18px;">${title}</h2>
        <p style="color: #374151; line-height: 1.6; font-size: 15px;">${message}</p>
        <div style="margin-top: 24px; text-align: center;">
          <a href="https://fliplearn-5lsz.onrender.com" style="display: inline-block; padding: 12px 28px; background: #1B4F72; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ouvrir FlipLearn
          </a>
        </div>
      </div>
      <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
        FlipLearn © 2025 — Plateforme de Classe Inversée<br>
        Projet de Fin d'Études — Licence Informatique ISIL
      </div>
    </div>
  `;
  await sendEmail(to, `FlipLearn — ${title}`, html);
};
